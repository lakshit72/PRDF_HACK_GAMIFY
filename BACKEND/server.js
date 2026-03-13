import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import authRoutes       from './routes/auth.js';
import userRoutes       from './routes/user.js';
import fsAndTmRoutes    from './routes/timeMachine.js';
import gamificationRoutes from './routes/gamificationService.js';
import socialRoutes        from './routes/socialService.js';
import taxRoutes           from './routes/taxAndContributionService.js';

// ─── App setup ────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 5000;

// Parse JSON bodies
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',          authRoutes);
app.use('/api/user',          userRoutes);
app.use('/api',               fsAndTmRoutes);
app.use('/api/gamification',  gamificationRoutes);
app.use('/api',               socialRoutes);
app.use('/api',               taxRoutes);             // /api/tax/* + /api/contribute/*

// Health-check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ errors: messages });
  }

  return res.status(500).json({ error: 'Internal server error' });
});

// ─── Database + server bootstrap ─────────────────────────────────────────────

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  MongoDB connected');

    app.listen(PORT, () =>
      console.log(`🚀  FutureYou Auth Service running on port ${PORT}`)
    );
  } catch (err) {
    console.error('❌  Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

start();