/**
 * server.js — FutureYou unified Express server
 *
 * Route order is critical:
 *   /api/auth  (public)  must be registered BEFORE any wildcard /api mounts
 *   that have router.use(authMiddleware) — otherwise Express runs the
 *   authMiddleware on register/login requests and returns 401.
 */
import 'dotenv/config';
import express   from 'express';
import mongoose  from 'mongoose';
import cors      from 'cors';
import path      from 'path';
import { fileURLToPath } from 'url';

import authRoutes          from './routes/auth.js';
import userRoutes          from './routes/user.js';
import fsAndTmRoutes       from './routes/timeMachine.js';
import gamificationRoutes  from './routes/gamificationService.js';
import socialRoutes        from './routes/socialService.js';
import taxRoutes           from './routes/taxAndContributionService.js';
import coachRoutes         from './routes/aiCoachService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();
const PORT      = process.env.PORT || 5000;
const IS_PROD   = process.env.NODE_ENV === 'production';

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: IS_PROD
    ? (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

if (!IS_PROD) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── PUBLIC routes — NO authMiddleware — register these FIRST ─────────────────
app.use('/api/auth', authRoutes);   // /api/auth/register, /api/auth/login

// ── PROTECTED specific routes ─────────────────────────────────────────────────
app.use('/api/user',         userRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/coach',        coachRoutes);

// ── WILDCARD /api mounts — have router.use(authMiddleware) inside ─────────────
// These MUST come after the specific routes above so they never intercept
// /api/auth/*, /api/user/*, /api/gamification/*, or /api/coach/* paths
app.use('/api', fsAndTmRoutes);   // /api/futureself/*, /api/timemachine/*
app.use('/api', socialRoutes);    // /api/tribes/*, /api/leaderboard
app.use('/api', taxRoutes);       // /api/tax/*, /api/contribute/*

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() })
);

// ── Upload routes (optional — requires: npm install multer sharp) ─────────────
// Mounted separately because they depend on optional packages.
// If the packages aren't installed, this silently skips — the rest of the app works.
const loadUploadRoutes = async () => {
  try {
    const { default: uploadRoutes } = await import('./routes/uploadRoutes.js');
    app.use('/api/user', uploadRoutes);
    console.log('Upload routes loaded (/api/user/upload-photo)');
  } catch (e) {
    console.warn('Upload routes skipped — install multer & sharp to enable:', e.message);
  }
};

// ── Serve React build in production ───────────────────────────────────────────
if (IS_PROD) {
  const frontendBuild = path.join(__dirname, '..', 'futureyou-frontend', 'dist');
  app.use(express.static(frontendBuild));
  app.get(/^(?!\/api|\/health|\/public).*/, (_req, res) =>
    res.sendFile(path.join(frontendBuild, 'index.html'))
  );
}

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message?.startsWith('CORS:')) return res.status(403).json({ error: err.message });
  console.error('[ERROR]', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ errors: Object.values(err.errors).map(e => e.message) });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const start = async () => {
  if (!process.env.MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected');

    // Load optional upload routes after DB is ready
    await loadUploadRoutes();

    app.listen(PORT, '0.0.0.0', () =>
      console.log(`FutureYou running on port ${PORT}`)
    );
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

start();