/**
 * gamificationService.js
 *
 * Gamification Engine for FutureYou:
 *   – Streaks, Quests, Quizzes, NPS Readiness Score
 *
 * SETUP:
 *   npm install moment
 *
 * Mount in server.js:
 *   import gamificationRoutes from './gamificationService.js';
 *   app.use('/api/gamification', gamificationRoutes);
 */

import { Router }  from 'express';
import mongoose    from 'mongoose';
import moment      from 'moment';
import { body, validationResult } from 'express-validator';
import authMiddleware from './middleware/auth.js';
import User           from './models/User.js';

const router = Router();
router.use(authMiddleware); // every route in this file is protected

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** All available quests. Add more here and they will automatically appear in GET /quests. */
const QUESTS = [
  {
    id:          'complete_3_modules',
    description: 'Complete 3 learning modules',
    target:      3,
    type:        'modules',
    icon:        '📚',
    reward:      'Knowledge Seeker badge',
  },
  {
    id:          'first_contribution',
    description: 'Make your first NPS contribution',
    target:      1,
    type:        'contributions',
    icon:        '💰',
    reward:      'First Step badge',
  },
  {
    id:          '7day_streak',
    description: 'Maintain a 7-day learning streak',
    target:      7,
    type:        'streak',
    icon:        '🔥',
    reward:      'On Fire badge',
  },
  {
    id:          'complete_profile',
    description: 'Fill in your full profile (age, income, PRAN)',
    target:      1,
    type:        'profile',
    icon:        '👤',
    reward:      'All Set badge',
  },
];

/**
 * Quiz bank.
 * Each module has a list of questions with 4 options and a `correct` index (0-based).
 */
const QUIZ_BANK = {
  nps_basics: {
    title: 'NPS Basics',
    questions: [
      {
        question: 'What does NPS stand for?',
        options:  ['National Pension System', 'National Payment Scheme', 'New Provident Savings', 'National Protection Scheme'],
        correct:  0,
      },
      {
        question: 'At what age can you normally withdraw your full NPS corpus?',
        options:  ['55', '58', '60', '65'],
        correct:  2,
      },
      {
        question: 'Which regulator oversees NPS in India?',
        options:  ['SEBI', 'RBI', 'IRDAI', 'PFRDA'],
        correct:  3,
      },
      {
        question: 'What is the minimum % of NPS corpus that must be used to buy an annuity at retirement?',
        options:  ['20%', '30%', '40%', '50%'],
        correct:  2,
      },
      {
        question: 'Which NPS account allows partial withdrawals?',
        options:  ['Tier I', 'Tier II', 'Both', 'Neither'],
        correct:  0,
      },
    ],
  },
  tax_benefits: {
    title: 'NPS Tax Benefits',
    questions: [
      {
        question: 'Under which section is the NPS deduction covered along with 80C?',
        options:  ['80C', '80CCD(1)', '80CCD(2)', '80D'],
        correct:  1,
      },
      {
        question: 'What is the additional exclusive NPS deduction available over and above 80C?',
        options:  ['25,000 under 80CCD(1B)', '50,000 under 80CCD(1B)', '75,000 under 80CCC', '1L under 80CCD(2)'],
        correct:  1,
      },
      {
        question: "Is the employer's NPS contribution taxable for the employee?",
        options:  ['Yes, fully taxable', 'No, exempt under 80CCD(2) up to 10% of salary', 'Yes, but only above 1L', 'No, fully exempt without limit'],
        correct:  1,
      },
      {
        question: 'What % of NPS corpus can be withdrawn tax-free as a lump sum at retirement?',
        options:  ['25%', '40%', '60%', '100%'],
        correct:  2,
      },
      {
        question: 'Is Tier II NPS eligible for tax deduction?',
        options:  ['Yes, always', 'No, generally not', 'Only for government employees with a lock-in', 'Only for private sector'],
        correct:  2,
      },
    ],
  },
  investment_basics: {
    title: 'Investment Basics',
    questions: [
      {
        question: 'What is compound interest?',
        options:  ['Interest on principal only', 'Interest on principal and accumulated interest', 'Fixed interest regardless of time', 'Interest paid annually only'],
        correct:  1,
      },
      {
        question: 'Which NPS fund option gives the highest equity exposure?',
        options:  ['Conservative Life Cycle Fund', 'Balanced Life Cycle Fund', 'Aggressive Life Cycle Fund', 'Fixed Return Fund'],
        correct:  2,
      },
      {
        question: 'What does diversification primarily help reduce?',
        options:  ['Returns', 'Inflation', 'Risk', 'Tax'],
        correct:  2,
      },
      {
        question: 'If inflation is 6% and your return is 10%, what is the approximate real return?',
        options:  ['16%', '4%', '6%', '10%'],
        correct:  1,
      },
      {
        question: 'Which is generally the highest-risk NPS asset class?',
        options:  ['Government Securities (G)', 'Corporate Bonds (C)', 'Equities (E)', 'Alternative Investments (A)'],
        correct:  2,
      },
    ],
  },
};

const QUIZ_PASS_SCORE = 70;

const FEEDBACK_MAP = [
  { min: 90, text: 'Outstanding! You really know your NPS.' },
  { min: 70, text: 'Passed! Solid understanding — keep it up.' },
  { min: 50, text: 'Almost there. Review the module and try again.' },
  { min: 0,  text: 'Keep learning — every attempt makes you wiser.' },
];

const SCORE_WEIGHTS = { knowledge: 0.30, contribution: 0.30, consistency: 0.20, profile: 0.10, social: 0.10 };
const SCORE_MIN     = 300;
const SCORE_MAX     = 900;
const STREAK_FULL   = 30; // streak days needed for 100% consistency score

// ─────────────────────────────────────────────────────────────────────────────
// MONGOOSE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const userStreakSchema = new mongoose.Schema(
  {
    userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak:    { type: Number, default: 0, min: 0 },
    longestStreak:    { type: Number, default: 0, min: 0 },
    lastActivityDate: { type: Date },
  },
  { timestamps: true }
);

const UserStreak = mongoose.models.UserStreak
  || mongoose.model('UserStreak', userStreakSchema);

// ─────────────────────────────────────────────────────────────────────────────

const quizResultSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId:    { type: String, required: true },
  score:       { type: Number, required: true, min: 0, max: 100 },
  passed:      { type: Boolean, required: true },
  completedAt: { type: Date, default: Date.now },
});
quizResultSchema.index({ userId: 1, moduleId: 1 });

const QuizResult = mongoose.models.QuizResult
  || mongoose.model('QuizResult', quizResultSchema);

// ─────────────────────────────────────────────────────────────────────────────

const questProgressSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questId:     { type: String, required: true },
    progress:    { type: Number, default: 0, min: 0, max: 100 },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);
questProgressSchema.index({ userId: 1, questId: 1 }, { unique: true });

const QuestProgress = mongoose.models.QuestProgress
  || mongoose.model('QuestProgress', questProgressSchema);

// ─────────────────────────────────────────────────────────────────────────────

const npsReadinessScoreSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score:        { type: Number, required: true },
  components:   {
    knowledge:    Number,
    contribution: Number,
    consistency:  Number,
    profile:      Number,
    social:       Number,
  },
  calculatedAt: { type: Date, default: Date.now },
});
npsReadinessScoreSchema.index({ userId: 1, calculatedAt: -1 });

const NPSReadinessScore = mongoose.models.NPSReadinessScore
  || mongoose.model('NPSReadinessScore', npsReadinessScoreSchema);

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getFeedback = (score) =>
  FEEDBACK_MAP.find((f) => score >= f.min)?.text ?? 'Keep going!';

/**
 * computeStreakUpdate
 * Returns the next streak state, or null if today was already logged (idempotent).
 *
 * Rules (all comparisons on calendar day, not epoch):
 *   diff = 0 days → already logged today → no change (return null)
 *   diff = 1 day  → consecutive → increment
 *   diff > 1 day  → gap → reset to 1
 */
const computeStreakUpdate = (current, now) => {
  if (!current.lastActivityDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, current.longestStreak), lastActivityDate: now };
  }

  const last     = moment(current.lastActivityDate).startOf('day');
  const today    = moment(now).startOf('day');
  const diffDays = today.diff(last, 'days');

  if (diffDays === 0) return null; // idempotent

  const newStreak = diffDays === 1 ? current.currentStreak + 1 : 1;
  return {
    currentStreak:    newStreak,
    longestStreak:    Math.max(newStreak, current.longestStreak),
    lastActivityDate: now,
  };
};

/**
 * computeNpsReadinessScore
 * Maps weighted 0-100 components onto the 300-900 scale.
 */
const computeNpsReadinessScore = (components) => {
  const weighted =
    components.knowledge    * SCORE_WEIGHTS.knowledge    +
    components.contribution * SCORE_WEIGHTS.contribution +
    components.consistency  * SCORE_WEIGHTS.consistency  +
    components.profile      * SCORE_WEIGHTS.profile      +
    components.social       * SCORE_WEIGHTS.social;

  return clamp(
    Math.round(SCORE_MIN + (weighted / 100) * (SCORE_MAX - SCORE_MIN)),
    SCORE_MIN,
    SCORE_MAX
  );
};

/**
 * updateQuestProgressForUser
 * Exported helper so other services (contribution service, etc.) can drive quests.
 * Increments raw-unit progress for a quest and marks it complete when target is reached.
 */
const updateQuestProgressForUser = async (userId, questId, increment = 1) => {
  const questDef = QUESTS.find((q) => q.id === questId);
  if (!questDef) return null;

  // Ensure a progress doc exists
  await QuestProgress.findOneAndUpdate(
    { userId, questId },
    { $setOnInsert: { userId, questId, progress: 0, completed: false } },
    { upsert: true }
  );

  const record = await QuestProgress.findOne({ userId, questId });
  if (record.completed) return record;

  // Convert stored % back to raw units, add increment, convert back to %
  const rawCurrent   = (record.progress / 100) * questDef.target;
  const rawNew       = rawCurrent + increment;
  const newPct       = clamp(Math.round((rawNew / questDef.target) * 100), 0, 100);
  const nowCompleted = newPct >= 100;

  return QuestProgress.findOneAndUpdate(
    { userId, questId },
    {
      $set: {
        progress:  newPct,
        completed: nowCompleted,
        ...(nowCompleted && { completedAt: new Date() }),
      },
    },
    { new: true }
  );
};

const handleValidation = (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ errors: errs.array() });
    return true;
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /streak ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/gamification/streak
 * @desc    Return authenticated user's streak info
 * @access  Protected
 */
router.get('/streak', async (req, res, next) => {
  try {
    const streak = await UserStreak.findOne({ userId: req.user._id }).lean();

    return res.status(200).json(
      streak
        ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastActivityDate: streak.lastActivityDate }
        : { currentStreak: 0, longestStreak: 0, lastActivityDate: null }
    );
  } catch (err) { next(err); }
});

// ── POST /activity ────────────────────────────────────────────────────────────

/**
 * @route   POST /api/gamification/activity
 * @desc    Log a user activity; updates streak and streak-based quests
 * @access  Protected
 */
router.post(
  '/activity',
  [ body('activityType').isIn(['login', 'quiz', 'contribution']).withMessage('activityType must be login, quiz, or contribution') ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const userId = req.user._id;
      const now    = new Date();

      // Upsert streak doc
      let streak = await UserStreak.findOne({ userId });
      if (!streak) streak = await UserStreak.create({ userId });

      const update = computeStreakUpdate(streak, now);

      if (update) {
        Object.assign(streak, update);
        await streak.save();

        // Sync 7-day-streak quest
        const pct = clamp(Math.round((streak.currentStreak / 7) * 100), 0, 100);
        await QuestProgress.findOneAndUpdate(
          { userId, questId: '7day_streak' },
          {
            $set: {
              progress:  pct,
              completed: pct >= 100,
              ...(pct >= 100 && { completedAt: now }),
            },
            $setOnInsert: { userId, questId: '7day_streak' },
          },
          { upsert: true }
        );

        // If activity is a contribution, also bump that quest
        if (req.body.activityType === 'contribution') {
          await updateQuestProgressForUser(userId, 'first_contribution', 1);
        }
      }

      return res.status(200).json({
        message:          update ? 'Activity recorded' : 'Activity already logged today',
        currentStreak:    streak.currentStreak,
        longestStreak:    streak.longestStreak,
        lastActivityDate: streak.lastActivityDate,
        streakUpdated:    !!update,
      });
    } catch (err) { next(err); }
  }
);

// ── POST /quiz/submit ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/gamification/quiz/submit
 * @desc    Grade a quiz, persist result, update quests and streak
 * @access  Protected
 */
router.post(
  '/quiz/submit',
  [
    body('moduleId')
      .isString().notEmpty()
      .custom((v) => {
        if (!QUIZ_BANK[v]) throw new Error(`Unknown moduleId. Available: ${Object.keys(QUIZ_BANK).join(', ')}`);
        return true;
      }),
    body('answers').isArray({ min: 1 }).withMessage('answers must be a non-empty array'),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const { moduleId, answers } = req.body;
      const userId                = req.user._id;
      const module                = QUIZ_BANK[moduleId];

      // Grade
      let correct = 0;
      module.questions.forEach((q, i) => {
        if (answers[i] !== undefined && Number(answers[i]) === q.correct) correct++;
      });
      const score  = Math.round((correct / module.questions.length) * 100);
      const passed = score >= QUIZ_PASS_SCORE;

      // Persist
      await QuizResult.create({ userId, moduleId, score, passed });

      // Distinct modules passed → drive 'complete_3_modules' quest
      const distinctPassed = await QuizResult.distinct('moduleId', { userId, passed: true });
      const passedCount    = distinctPassed.length;
      const questPct       = clamp(Math.round((passedCount / 3) * 100), 0, 100);

      await QuestProgress.findOneAndUpdate(
        { userId, questId: 'complete_3_modules' },
        {
          $set: {
            progress:  questPct,
            completed: questPct >= 100,
            ...(questPct >= 100 && { completedAt: new Date() }),
          },
          $setOnInsert: { userId, questId: 'complete_3_modules' },
        },
        { upsert: true }
      );

      // Quiz also counts as a daily activity for streak
      let streak = await UserStreak.findOne({ userId });
      if (!streak) streak = await UserStreak.create({ userId });
      const streakUpdate = computeStreakUpdate(streak, new Date());
      if (streakUpdate) {
        Object.assign(streak, streakUpdate);
        await streak.save();
      }

      return res.status(200).json({
        score,
        passed,
        correctAnswers:        correct,
        totalQuestions:        module.questions.length,
        feedback:              getFeedback(score),
        distinctModulesPassed: passedCount,
      });
    } catch (err) { next(err); }
  }
);

// ── GET /quests ───────────────────────────────────────────────────────────────

/**
 * @route   GET /api/gamification/quests
 * @desc    All quests with this user's progress
 * @access  Protected
 */
router.get('/quests', async (req, res, next) => {
  try {
    const userId   = req.user._id;
    const progDocs = await QuestProgress.find({ userId }).lean();
    const progMap  = Object.fromEntries(progDocs.map((p) => [p.questId, p]));

    const quests = QUESTS.map((q) => {
      const prog = progMap[q.id];
      return {
        id:          q.id,
        description: q.description,
        icon:        q.icon,
        reward:      q.reward,
        target:      q.target,
        type:        q.type,
        progress:    prog?.progress    ?? 0,
        completed:   prog?.completed   ?? false,
        completedAt: prog?.completedAt ?? null,
      };
    });

    return res.status(200).json({
      quests,
      completedCount: quests.filter((q) => q.completed).length,
      totalQuests:    QUESTS.length,
    });
  } catch (err) { next(err); }
});

// ── POST /quest/update ────────────────────────────────────────────────────────

/**
 * @route   POST /api/gamification/quest/update
 * @desc    Increment quest progress (internal / service-to-service)
 * @access  Protected
 */
router.post(
  '/quest/update',
  [
    body('questId')
      .isString().notEmpty()
      .custom((v) => {
        if (!QUESTS.find((q) => q.id === v)) throw new Error(`Unknown questId "${v}"`);
        return true;
      }),
    body('increment').optional().isFloat({ min: 0 }).withMessage('increment must be non-negative'),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const { questId, increment = 1 } = req.body;
      const updated = await updateQuestProgressForUser(req.user._id, questId, increment);

      return res.status(200).json({
        questId,
        progress:    updated.progress,
        completed:   updated.completed,
        completedAt: updated.completedAt ?? null,
      });
    } catch (err) { next(err); }
  }
);

// ── GET /score ────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/gamification/score
 * @desc    Compute and return the NPS Readiness Score (300-900)
 * @access  Protected
 */
router.get('/score', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Knowledge: average of all quiz scores this user has ever submitted
    const quizResults = await QuizResult.find({ userId }).lean();
    const knowledgeScore = quizResults.length > 0
      ? clamp(Math.round(quizResults.reduce((s, r) => s + r.score, 0) / quizResults.length), 0, 100)
      : 0;

    // Contribution: weight monthly contribution vs income (10% of income = full marks)
    const user = await User.findById(userId).lean();
    let contributionScore = 0;
    if (user?.npsContributions?.length > 0) {
      if (user.income > 0) {
        const lastEmployeeContrib = [...user.npsContributions]
          .filter((c) => c.type === 'employee')
          .pop()?.amount ?? 0;
        contributionScore = clamp(Math.round((lastEmployeeContrib / user.income) * 10 * 100), 0, 100);
      } else {
        contributionScore = 50; // has contributions but no income set
      }
    }
    // Fallback: if 'first_contribution' quest is complete, give minimum 30
    const fcQuest = await QuestProgress.findOne({ userId, questId: 'first_contribution' }).lean();
    if (fcQuest?.completed && contributionScore < 30) contributionScore = 30;

    // Consistency: scale currentStreak up to STREAK_FULL days = 100 pts
    const streak = await UserStreak.findOne({ userId }).lean();
    const consistencyScore = streak
      ? clamp(Math.round((streak.currentStreak / STREAK_FULL) * 100), 0, 100)
      : 0;

    // Profile: 1 point each for pran, age, income (33 pts each)
    const filledFields = ['pran', 'age', 'income'].filter((f) => user?.[f] != null).length;
    const profileScore = Math.round((filledFields / 3) * 100);

    // Social: placeholder — engaged if streak >= 3
    const socialScore = (streak?.currentStreak ?? 0) >= 3 ? 100 : 0;

    const components = { knowledge: knowledgeScore, contribution: contributionScore, consistency: consistencyScore, profile: profileScore, social: socialScore };
    const score      = computeNpsReadinessScore(components);

    // Persist for history
    await NPSReadinessScore.create({ userId, score, components });

    const tier =
      score >= 750 ? 'Excellent' :
      score >= 600 ? 'Good'      :
      score >= 450 ? 'Fair'      :
                     'Needs Work';

    return res.status(200).json({
      score,
      tier,
      breakdown: {
        knowledge:    { score: components.knowledge,    weight: '30%', label: 'NPS Knowledge' },
        contribution: { score: components.contribution, weight: '30%', label: 'Contribution Habit' },
        consistency:  { score: components.consistency,  weight: '20%', label: 'Learning Streak' },
        profile:      { score: components.profile,      weight: '10%', label: 'Profile Completeness' },
        social:       { score: components.social,       weight: '10%', label: 'Community Engagement' },
      },
      calculatedAt: new Date(),
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS – models available to other service files
// ─────────────────────────────────────────────────────────────────────────────

export { UserStreak, QuizResult, QuestProgress, NPSReadinessScore, updateQuestProgressForUser, QUESTS, QUIZ_BANK };
export default router;