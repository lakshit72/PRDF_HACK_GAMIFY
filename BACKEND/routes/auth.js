import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = Router();
const SALT_ROUNDS = 10;

// ─── Validation chains ────────────────────────────────────────────────────────

const registerValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('age')
    .optional()
    .isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
  body('income')
    .optional()
    .isFloat({ min: 0 }).withMessage('Income must be a non-negative number'),
  body('pran')
    .optional()
    .matches(/^[A-Z0-9]{12}$/i).withMessage('PRAN must be 12 alphanumeric characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Helper ───────────────────────────────────────────────────────────────────

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ─── POST /api/auth/register ──────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Create a new user account
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res, next) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { email, password, age, income, pran } = req.body;

    // Hash before saving
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      passwordHash,
      ...(age    !== undefined && { age }),
      ...(income !== undefined && { income }),
      ...(pran   !== undefined && { pran: pran.toUpperCase() }),
    });

    return res.status(201).json({
      message: 'User registered successfully',
      userId:  user._id,
    });
  } catch (err) {
    // MongoDB duplicate key error code
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
router.post('/login', loginValidation, async (req, res, next) => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Generic message – don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      token,
      user: {
        email:               user.email,
        age:                 user.age,
        income:              user.income,
        pran:                user.pran,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;