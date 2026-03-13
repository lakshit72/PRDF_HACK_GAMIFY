/**
 * socialService.js
 *
 * Social Features for FutureYou: Tribes & Leaderboards
 *
 * SETUP:
 *   npm install ioredis
 *
 *   Add to .env:
 *     REDIS_URL=redis://localhost:6379
 *     # Or for Redis Cloud / Upstash:
 *     # REDIS_URL=redis://:password@host:port
 *
 * Mount in server.js:
 *   import socialRoutes from './socialService.js';
 *   app.use('/api', socialRoutes);
 */

import { Router }  from 'express';
import mongoose    from 'mongoose';
import Redis       from 'ioredis';
import crypto      from 'crypto';
import { body, query, param, validationResult } from 'express-validator';
import authMiddleware from './middleware/auth.js';
import User           from './models/User.js';
import { NPSReadinessScore } from './gamificationService.js';

const router = Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CLIENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Redis is optional — if REDIS_URL is absent or the connection fails, all
 * leaderboard operations fall back to MongoDB aggregation transparently.
 */

const REDIS_URL = process.env.REDIS_URL;

let redis = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,       // fail fast so fallback kicks in quickly
    enableReadyCheck:     true,
    lazyConnect:          true,    // don't block startup if Redis is down
  });

  redis.on('connect',   () => console.log('✅  Redis connected'));
  redis.on('error',     (e) => console.warn('⚠️   Redis error (using MongoDB fallback):', e.message));
  redis.on('close',     () => console.warn('⚠️   Redis disconnected'));

  // Non-blocking connect — errors are swallowed here on purpose
  redis.connect().catch(() => {});
} else {
  console.warn('⚠️   REDIS_URL not set – leaderboards will use MongoDB fallback');
}

// Redis key helpers
const REDIS_KEYS = {
  global:       'leaderboard:global',
  tribe:        (tribeId) => `leaderboard:tribe:${tribeId}`,
  userTribeMap: (userId)  => `user:tribe:${userId}`,   // cache userId → tribeId
};

const LEADERBOARD_TTL = 60 * 10; // 10 minutes — refresh on next score update

// ─────────────────────────────────────────────────────────────────────────────
// MONGOOSE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const tribeSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Tribe name is required'],
      trim:     true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must be under 50 characters'],
    },
    inviteCode: {
      type:   String,
      unique: true,
      index:  true,
    },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Compound index: find a tribe that contains a given user fast
tribeSchema.index({ members: 1 });

const Tribe = mongoose.models.Tribe || mongoose.model('Tribe', tribeSchema);

// ─────────────────────────────────────────────────────────────────────────────
// REDIS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * isRedisReady
 * True only when a Redis client exists AND is currently connected.
 * Used as the guard before every Redis operation.
 */
const isRedisReady = () => redis?.status === 'ready';

/**
 * updateLeaderboard
 *
 * Called whenever a user's NPS Readiness Score changes.
 * Updates both the global sorted set and, if the user belongs to a tribe,
 * their tribe sorted set.
 *
 * Exported so gamificationService (or any other service) can call it:
 *   import { updateLeaderboard } from './socialService.js';
 *   await updateLeaderboard(userId, newScore);
 *
 * @param {string|ObjectId} userId
 * @param {number}          score   – NPS Readiness Score (300-900)
 */
const updateLeaderboard = async (userId, score) => {
  if (!isRedisReady()) return;

  const id = userId.toString();

  try {
    const pipeline = redis.pipeline();

    // Global sorted set — ZADD replaces the old score automatically
    pipeline.zadd(REDIS_KEYS.global, score, id);
    pipeline.expire(REDIS_KEYS.global, LEADERBOARD_TTL);

    // Tribe sorted set (if user is in a tribe)
    const tribe = await Tribe.findOne({ members: userId }, '_id').lean();
    if (tribe) {
      const tribeKey = REDIS_KEYS.tribe(tribe._id.toString());
      pipeline.zadd(tribeKey, score, id);
      pipeline.expire(tribeKey, LEADERBOARD_TTL);
    }

    await pipeline.exec();
  } catch (err) {
    console.warn('[Redis] updateLeaderboard failed, continuing without cache:', err.message);
  }
};

/**
 * addUserToTribeLeaderboard
 * Called when a user joins a tribe — seeds their current score into the tribe set.
 */
const addUserToTribeLeaderboard = async (userId, tribeId) => {
  if (!isRedisReady()) return;

  try {
    // Get latest score from MongoDB
    const latest = await NPSReadinessScore
      .findOne({ userId })
      .sort({ calculatedAt: -1 })
      .lean();

    if (!latest) return;

    const tribeKey = REDIS_KEYS.tribe(tribeId.toString());
    await redis.zadd(tribeKey, latest.score, userId.toString());
    await redis.expire(tribeKey, LEADERBOARD_TTL);
  } catch (err) {
    console.warn('[Redis] addUserToTribeLeaderboard failed:', err.message);
  }
};

/**
 * removeUserFromTribeLeaderboard
 * Called when a tribe member leaves (future endpoint).
 */
const removeUserFromTribeLeaderboard = async (userId, tribeId) => {
  if (!isRedisReady()) return;
  try {
    await redis.zrem(REDIS_KEYS.tribe(tribeId.toString()), userId.toString());
  } catch (err) {
    console.warn('[Redis] removeUserFromTribeLeaderboard failed:', err.message);
  }
};

/**
 * getTopFromRedis
 * Returns top N entries from a Redis sorted set with scores, highest first.
 * Returns null if Redis unavailable or the key is empty.
 *
 * @param {string} key
 * @param {number} topN
 * @returns {Promise<Array<{userId: string, score: number}>|null>}
 */
const getTopFromRedis = async (key, topN = 100) => {
  if (!isRedisReady()) return null;

  try {
    // ZREVRANGE key 0 (topN-1) WITHSCORES → ['userId', 'score', 'userId', 'score', ...]
    const raw = await redis.zrevrange(key, 0, topN - 1, 'WITHSCORES');
    if (!raw || raw.length === 0) return null;

    const entries = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ userId: raw[i], score: parseFloat(raw[i + 1]) });
    }
    return entries;
  } catch (err) {
    console.warn('[Redis] getTopFromRedis failed, falling back to MongoDB:', err.message);
    return null;
  }
};

/**
 * getUserRankFromRedis
 * Returns 1-based rank (highest score = rank 1) or null on failure.
 *
 * @param {string} key
 * @param {string} userId
 * @returns {Promise<number|null>}
 */
const getUserRankFromRedis = async (key, userId) => {
  if (!isRedisReady()) return null;

  try {
    // ZREVRANK: 0-indexed; null if member absent
    const rank = await redis.zrevrank(key, userId.toString());
    return rank !== null ? rank + 1 : null;
  } catch (err) {
    console.warn('[Redis] getUserRankFromRedis failed:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MONGODB FALLBACK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getGlobalLeaderboardFromMongo
 * Aggregates latest NPS scores per user, joins profile, returns top N.
 */
const getGlobalLeaderboardFromMongo = async (topN = 100) => {
  return NPSReadinessScore.aggregate([
    // Latest score per user
    { $sort: { calculatedAt: -1 } },
    { $group: { _id: '$userId', score: { $first: '$score' }, calculatedAt: { $first: '$calculatedAt' } } },
    { $sort: { score: -1 } },
    { $limit: topN },
    // Join user profile
    {
      $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    {
      $project: {
        userId:    '$_id',
        score:     1,
        email:     '$user.email',
        _id:       0,
      },
    },
  ]);
};

/**
 * getTribeLeaderboardFromMongo
 * Same as above but scoped to a tribe's member list.
 */
const getTribeLeaderboardFromMongo = async (memberIds) => {
  return NPSReadinessScore.aggregate([
    { $match: { userId: { $in: memberIds } } },
    { $sort: { calculatedAt: -1 } },
    { $group: { _id: '$userId', score: { $first: '$score' } } },
    { $sort: { score: -1 } },
    {
      $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    {
      $project: {
        userId: '$_id',
        score:  1,
        email:  '$user.email',
        _id:    0,
      },
    },
  ]);
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const handleValidation = (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ errors: errs.array() });
    return true;
  }
  return false;
};

/**
 * generateInviteCode
 * Cryptographically random 6-char alphanumeric code (uppercase).
 * Falls back to Math.random if crypto unavailable (shouldn't happen on Node 18+).
 */
const generateInviteCode = () =>
  crypto.randomBytes(4).toString('hex').substring(0, 6).toUpperCase();

/**
 * enrichLeaderboardWithRanks
 * Attaches a 1-based `rank` field and masks email to "a***@domain.com" for privacy.
 */
const enrichLeaderboardWithRanks = (entries) =>
  entries.map((entry, i) => ({
    rank:   i + 1,
    userId: entry.userId?.toString?.() ?? entry.userId,
    score:  entry.score,
    email:  maskEmail(entry.email ?? ''),
  }));

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

/**
 * hydrateRedisEntries
 * Redis entries only have userId + score; fetch email from MongoDB in one batch.
 */
const hydrateRedisEntries = async (entries) => {
  const ids   = entries.map((e) => new mongoose.Types.ObjectId(e.userId));
  const users = await User.find({ _id: { $in: ids } }, 'email').lean();
  const map   = Object.fromEntries(users.map((u) => [u._id.toString(), u.email]));

  return entries.map((e) => ({ ...e, email: map[e.userId] ?? '' }));
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES – TRIBES
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/tribes/create ───────────────────────────────────────────────────

/**
 * @route   POST /api/tribes/create
 * @desc    Create a new tribe; creator becomes first member
 * @access  Protected
 */
router.post(
  '/tribes/create',
  [ body('name').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters') ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const userId = req.user._id;

      // Prevent user from belonging to multiple tribes
      const existing = await Tribe.findOne({ members: userId }).lean();
      if (existing) {
        return res.status(409).json({
          error:   'Already in a tribe',
          tribeId: existing._id,
          message: 'Leave your current tribe before creating a new one.',
        });
      }

      // Generate a collision-resistant invite code (retry on rare collision)
      let inviteCode;
      let attempts = 0;
      do {
        inviteCode = generateInviteCode();
        attempts++;
        if (attempts > 10) throw new Error('Could not generate a unique invite code');
      } while (await Tribe.exists({ inviteCode }));

      const tribe = await Tribe.create({
        name:       req.body.name,
        inviteCode,
        createdBy:  userId,
        members:    [userId],
      });

      // Seed this user's score into the tribe leaderboard
      await addUserToTribeLeaderboard(userId, tribe._id);

      return res.status(201).json({ tribe });
    } catch (err) { next(err); }
  }
);

// ── POST /api/tribes/join ─────────────────────────────────────────────────────

/**
 * @route   POST /api/tribes/join
 * @desc    Join a tribe via invite code
 * @access  Protected
 */
router.post(
  '/tribes/join',
  [ body('inviteCode').isString().trim().isLength({ min: 6, max: 6 }).withMessage('inviteCode must be exactly 6 characters') ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const userId     = req.user._id;
      const inviteCode = req.body.inviteCode.toUpperCase();

      const tribe = await Tribe.findOne({ inviteCode });
      if (!tribe) {
        return res.status(404).json({ error: 'Tribe not found — check the invite code' });
      }

      // Idempotent join
      const alreadyMember = tribe.members.some((m) => m.equals(userId));
      if (alreadyMember) {
        return res.status(200).json({ message: 'Already a member', tribe });
      }

      // Check user isn't in another tribe
      const otherTribe = await Tribe.findOne({ members: userId, _id: { $ne: tribe._id } }).lean();
      if (otherTribe) {
        return res.status(409).json({ error: 'Already a member of another tribe. Leave it first.' });
      }

      tribe.members.push(userId);
      await tribe.save();

      // Add to tribe leaderboard cache
      await addUserToTribeLeaderboard(userId, tribe._id);

      return res.status(200).json({ message: 'Joined tribe successfully', tribe });
    } catch (err) { next(err); }
  }
);

// ── GET /api/tribes/my-tribe ──────────────────────────────────────────────────

/**
 * @route   GET /api/tribes/my-tribe
 * @desc    Return the tribe the authenticated user belongs to
 * @access  Protected
 */
router.get('/tribes/my-tribe', async (req, res, next) => {
  try {
    const tribe = await Tribe.findOne({ members: req.user._id })
      .populate('createdBy', 'email')
      .populate('members', 'email age')
      .lean();

    if (!tribe) {
      return res.status(200).json({ tribe: null, message: 'You are not in a tribe yet' });
    }

    return res.status(200).json({ tribe });
  } catch (err) { next(err); }
});

// ── GET /api/tribes/:tribeId/members ─────────────────────────────────────────

/**
 * @route   GET /api/tribes/:tribeId/members
 * @desc    Return tribe members with their latest NPS Readiness Score
 * @access  Protected
 */
router.get(
  '/tribes/:tribeId/members',
  [ param('tribeId').isMongoId().withMessage('Invalid tribeId') ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const tribe = await Tribe.findById(req.params.tribeId).lean();
      if (!tribe) return res.status(404).json({ error: 'Tribe not found' });

      // Verify requester is a member
      const isMember = tribe.members.some((m) => m.equals(req.user._id));
      if (!isMember) return res.status(403).json({ error: 'You are not a member of this tribe' });

      // Fetch latest score per member in one aggregation
      const scores = await NPSReadinessScore.aggregate([
        { $match: { userId: { $in: tribe.members } } },
        { $sort:  { calculatedAt: -1 } },
        { $group: { _id: '$userId', score: { $first: '$score' } } },
      ]);
      const scoreMap = Object.fromEntries(scores.map((s) => [s._id.toString(), s.score]));

      const users = await User.find({ _id: { $in: tribe.members } }, 'email age').lean();
      const members = users
        .map((u) => ({
          userId: u._id,
          email:  maskEmail(u.email),
          age:    u.age ?? null,
          score:  scoreMap[u._id.toString()] ?? 300,
        }))
        .sort((a, b) => b.score - a.score);

      return res.status(200).json({
        tribeId:     tribe._id,
        tribeName:   tribe.name,
        memberCount: members.length,
        members,
      });
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES – LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/leaderboard ──────────────────────────────────────────────────────

/**
 * @route   GET /api/leaderboard?type=global
 * @route   GET /api/leaderboard?type=tribe&tribeId=<id>
 * @desc    Return top-100 leaderboard from Redis (falls back to MongoDB)
 * @access  Protected
 */
router.get(
  '/leaderboard',
  [
    query('type')
      .isIn(['global', 'tribe'])
      .withMessage('type must be "global" or "tribe"'),
    query('tribeId')
      .if(query('type').equals('tribe'))
      .notEmpty().withMessage('tribeId is required for tribe leaderboards')
      .isMongoId().withMessage('Invalid tribeId'),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const { type, tribeId } = req.query;
      const TOP_N = 100;

      let rawEntries = null;
      let source     = 'redis';

      // ── Global leaderboard ────────────────────────────────────────────────
      if (type === 'global') {
        rawEntries = await getTopFromRedis(REDIS_KEYS.global, TOP_N);

        if (!rawEntries) {
          source     = 'mongodb';
          rawEntries = await getGlobalLeaderboardFromMongo(TOP_N);
        } else {
          rawEntries = await hydrateRedisEntries(rawEntries);
        }
      }

      // ── Tribe leaderboard ─────────────────────────────────────────────────
      if (type === 'tribe') {
        const tribe = await Tribe.findById(tribeId).lean();
        if (!tribe) return res.status(404).json({ error: 'Tribe not found' });

        const isMember = tribe.members.some((m) => m.equals(req.user._id));
        if (!isMember) return res.status(403).json({ error: 'You are not a member of this tribe' });

        rawEntries = await getTopFromRedis(REDIS_KEYS.tribe(tribeId), TOP_N);

        if (!rawEntries) {
          source     = 'mongodb';
          rawEntries = await getTribeLeaderboardFromMongo(tribe.members);
        } else {
          rawEntries = await hydrateRedisEntries(rawEntries);
        }
      }

      const leaderboard = enrichLeaderboardWithRanks(rawEntries ?? []);

      // Find and tag the requesting user's entry for easy highlight on the client
      const myEntry = leaderboard.find((e) => e.userId === req.user._id.toString());

      return res.status(200).json({
        type,
        ...(tribeId && { tribeId }),
        total:        leaderboard.length,
        source,                              // 'redis' or 'mongodb' – useful for debugging
        leaderboard,
        myRank:       myEntry?.rank ?? null,
        myScore:      myEntry?.score ?? null,
      });
    } catch (err) { next(err); }
  }
);

// ── GET /api/leaderboard/rank ─────────────────────────────────────────────────

/**
 * @route   GET /api/leaderboard/rank
 * @desc    Return the authenticated user's global rank and (if in a tribe) tribe rank
 * @access  Protected
 */
router.get('/leaderboard/rank', async (req, res, next) => {
  try {
    const userId   = req.user._id;
    const userIdStr = userId.toString();

    // ── Global rank ───────────────────────────────────────────────────────────
    let globalRank = await getUserRankFromRedis(REDIS_KEYS.global, userIdStr);

    if (globalRank === null) {
      // MongoDB fallback: count users with a higher latest score
      const latestScore = await NPSReadinessScore
        .findOne({ userId })
        .sort({ calculatedAt: -1 })
        .lean();

      if (latestScore) {
        const higherCount = await NPSReadinessScore.aggregate([
          { $sort:  { calculatedAt: -1 } },
          { $group: { _id: '$userId', score: { $first: '$score' } } },
          { $match: { score: { $gt: latestScore.score } } },
          { $count: 'n' },
        ]);
        globalRank = (higherCount[0]?.n ?? 0) + 1;
      }
    }

    // ── Tribe rank ────────────────────────────────────────────────────────────
    let tribeRank     = null;
    let tribeId       = null;
    let tribeName     = null;
    let tribeMemberCount = null;

    const tribe = await Tribe.findOne({ members: userId }, '_id name members').lean();
    if (tribe) {
      tribeId          = tribe._id;
      tribeName        = tribe.name;
      tribeMemberCount = tribe.members.length;

      tribeRank = await getUserRankFromRedis(REDIS_KEYS.tribe(tribe._id.toString()), userIdStr);

      if (tribeRank === null) {
        const mongoTribeBoard = await getTribeLeaderboardFromMongo(tribe.members);
        const idx = mongoTribeBoard.findIndex((e) => e.userId.toString() === userIdStr);
        if (idx !== -1) tribeRank = idx + 1;
      }
    }

    return res.status(200).json({
      userId:   userIdStr,
      global:   { rank: globalRank },
      tribe:    tribeId
        ? { rank: tribeRank, tribeId, tribeName, memberCount: tribeMemberCount }
        : null,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  Tribe,
  updateLeaderboard,          // call from gamificationService when score changes
  addUserToTribeLeaderboard,
  removeUserFromTribeLeaderboard,
};

export default router;