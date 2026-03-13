/**
 * futureSelfAndTimeMachine.js
 *
 * Future Self Engine & Time Machine Calculation Service for FutureYou.
 *
 * SETUP:
 *   1. Add to your .env:
 *        OPENAI_API_KEY=sk-...
 *   2. Install dependency (if not already present):
 *        npm install openai
 *   3. Mount this router in server.js:
 *        import fsRoutes from './futureSelfAndTimeMachine.js';
 *        app.use('/api', fsRoutes);
 */

import { Router }  from 'express';
import { body, validationResult } from 'express-validator';
import OpenAI      from 'openai';
import authMiddleware from './middleware/auth.js';

const router = Router();

// Lazy-init OpenAI client so the module loads even without the key set
// (key is only required when the endpoint is actually hit)
let openai;
const getOpenAI = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RETIREMENT_AGE       = 60;
const DEFAULT_RETURN_RATE  = 10; // annual %
const DEFAULT_INFLATION    = 6;  // annual %

// ─── Helper: format rupees as "₹X lakhs" / "₹X crores" ──────────────────────

const formatRupees = (amount) => {
  if (amount >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)} crores`;
  }
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} lakhs`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

// ─── Core financial helper ────────────────────────────────────────────────────

/**
 * compoundInterest
 *
 * Future Value of an annuity-due with an existing lump-sum.
 *
 * Formula:
 *   FV = C * (current balance) * (1+r)^n            ← lump-sum component
 *      + P * ((1+r)^n - 1) / r * (1+r)              ← monthly contribution component
 *
 * Where:
 *   C  = currentBalance  (₹)
 *   P  = monthlyContribution (₹)
 *   r  = monthlyRate  (annualRate / 12 / 100)
 *   n  = months to retirement
 *
 * @param {number} currentBalance        – existing corpus (₹)
 * @param {number} monthlyContribution   – constant monthly SIP (₹)
 * @param {number} annualReturnPct       – expected annual return (%)
 * @param {number} months                – investment horizon in months
 * @returns {number}                     – future value (₹)
 */
const compoundInterest = (currentBalance, monthlyContribution, annualReturnPct, months) => {
  const r = annualReturnPct / 12 / 100; // monthly rate as decimal

  // Edge-case: 0% return → simple sum
  if (r === 0) {
    return currentBalance + monthlyContribution * months;
  }

  const growth     = Math.pow(1 + r, months);
  const lumpSum    = currentBalance * growth;
  const annuityDue = monthlyContribution * ((growth - 1) / r) * (1 + r);

  return lumpSum + annuityDue;
};

/**
 * inflationAdjust
 * Converts a future value to today's purchasing power.
 *
 * @param {number} futureValue
 * @param {number} annualInflationPct
 * @param {number} years
 * @returns {number}
 */
const inflationAdjust = (futureValue, annualInflationPct, years) => {
  return futureValue / Math.pow(1 + annualInflationPct / 100, years);
};

// ─── Validation helpers ───────────────────────────────────────────────────────

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// ─── OpenAI call with graceful fallback ───────────────────────────────────────

/**
 * generateFutureSelfContent
 * Calls OpenAI to produce an avatar description and a letter from the future self.
 * Returns fallback strings on any error so the financial data is always returned.
 *
 * @param {number} currentAge
 * @param {number} projectedCorpus       – nominal future value (₹)
 * @param {number} inflationAdjustedCorpus – today's value (₹)
 * @returns {Promise<{ avatarDescription: string, futureLetter: string, aiError?: string }>}
 */
const generateFutureSelfContent = async (currentAge, projectedCorpus, inflationAdjustedCorpus) => {
  const yearsLeft = RETIREMENT_AGE - currentAge;
  const prompt    = `
You are an AI that writes empathetic, encouraging letters from a person's future self.

Given the following details:
- Current age: ${currentAge}
- Years until retirement (age 60): ${yearsLeft}
- Projected retirement corpus: ${formatRupees(projectedCorpus)} (nominal value)
- Inflation-adjusted corpus (today's purchasing power): ${formatRupees(inflationAdjustedCorpus)}

First, write ONE sentence (max 25 words) describing the future self's lifestyle and living situation — vivid and specific. Label it "AVATAR:".

Then write a warm, motivating letter from their 60-year-old self. Include specific details about lifestyle based on the corpus. Keep it under 150 words. Do not give financial advice, just emotional connection. Label it "LETTER:".
`.trim();

  try {
    const client   = getOpenAI();
    const response = await client.chat.completions.create({
      model:      'gpt-4o-mini',  // fast + cheap; swap for 'gpt-4o' for richer output
      max_tokens: 400,
      temperature: 0.85,          // slight warmth/creativity
      messages: [
        {
          role:    'system',
          content: 'You generate emotionally resonant, concise content for a financial wellbeing app. Always respond with AVATAR: and LETTER: sections.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const text            = response.choices[0]?.message?.content ?? '';
    const avatarMatch     = text.match(/AVATAR:\s*(.*?)(?=LETTER:|$)/s);
    const letterMatch     = text.match(/LETTER:\s*([\s\S]*)/);

    const avatarDescription = avatarMatch?.[1]?.trim()
      ?? 'A relaxed 60-year-old enjoying a quiet morning on a sunlit veranda.';
    const futureLetter      = letterMatch?.[1]?.trim()
      ?? buildFallbackLetter(currentAge, inflationAdjustedCorpus);

    return { avatarDescription, futureLetter };
  } catch (err) {
    // Log for ops visibility but don't crash the request
    console.error('[OpenAI] generation failed:', err?.message ?? err);

    return {
      avatarDescription: 'A content 60-year-old, financially secure and at peace.',
      futureLetter:      buildFallbackLetter(currentAge, inflationAdjustedCorpus),
      aiError:           'AI generation unavailable – showing calculated data only.',
    };
  }
};

/**
 * buildFallbackLetter
 * Pure-JS fallback so the endpoint always returns a human-readable letter.
 */
const buildFallbackLetter = (currentAge, inflationAdjustedCorpus) => {
  const yearsLeft = RETIREMENT_AGE - currentAge;
  return (
    `Dear younger me, ${yearsLeft} years ago you made a choice that changed everything. ` +
    `Every rupee you set aside grew quietly, and today I sit with ${formatRupees(inflationAdjustedCorpus)} ` +
    `in real purchasing power — enough to live on my own terms. ` +
    `The sacrifices felt small compared to this freedom. Keep going. You're building me. — Future You`
  );
};

// ─── Route 1: POST /api/futureself/generate ───────────────────────────────────

const futureSelfValidation = [
  body('age')
    .isInt({ min: 18, max: 59 }).withMessage('Age must be between 18 and 59'),
  body('currentNpsBalance')
    .isFloat({ min: 0 }).withMessage('currentNpsBalance must be a non-negative number'),
  body('monthlyContribution')
    .isFloat({ min: 0 }).withMessage('monthlyContribution must be a non-negative number'),
  body('expectedReturn')
    .optional()
    .isFloat({ min: 0, max: 50 }).withMessage('expectedReturn must be between 0 and 50'),
  body('inflation')
    .optional()
    .isFloat({ min: 0, max: 30 }).withMessage('inflation must be between 0 and 30'),
];

/**
 * @route   POST /api/futureself/generate
 * @desc    Project retirement corpus and generate AI-powered future self content
 * @access  Protected (JWT required)
 */
router.post(
  '/futureself/generate',
  authMiddleware,
  futureSelfValidation,
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const {
        age,
        currentNpsBalance,
        monthlyContribution,
        expectedReturn = DEFAULT_RETURN_RATE,
        inflation      = DEFAULT_INFLATION,
      } = req.body;

      // ── Financial calculations ──────────────────────────────────────────────

      const months              = (RETIREMENT_AGE - age) * 12;
      const projectedCorpus     = compoundInterest(
        currentNpsBalance,
        monthlyContribution,
        expectedReturn,
        months
      );
      const inflationAdjustedCorpus = inflationAdjust(
        projectedCorpus,
        inflation,
        RETIREMENT_AGE - age
      );

      // ── AI generation (non-blocking failure) ───────────────────────────────

      const { avatarDescription, futureLetter, aiError } =
        await generateFutureSelfContent(age, projectedCorpus, inflationAdjustedCorpus);

      const responseBody = {
        projectedCorpus:          Math.round(projectedCorpus),
        inflationAdjustedCorpus:  Math.round(inflationAdjustedCorpus),
        avatarDescription,
        futureLetter,
        meta: {
          yearsToRetirement: RETIREMENT_AGE - age,
          monthsToRetirement: months,
          assumedAnnualReturn: `${expectedReturn}%`,
          assumedInflation:    `${inflation}%`,
        },
      };

      // Surface AI error as a non-fatal warning if present
      if (aiError) responseBody.warning = aiError;

      return res.status(200).json(responseBody);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Route 2: POST /api/timemachine/calculate ─────────────────────────────────

const timeMachineValidation = [
  body('currentAge')
    .isInt({ min: 18, max: 59 }).withMessage('currentAge must be between 18 and 59'),
  body('currentMonthlySpending')
    .isFloat({ min: 0 }).withMessage('currentMonthlySpending must be a non-negative number'),
  body('newMonthlySpending')
    .isFloat({ min: 0 }).withMessage('newMonthlySpending must be a non-negative number')
    .custom((val, { req }) => {
      if (parseFloat(val) > parseFloat(req.body.currentMonthlySpending)) {
        throw new Error('newMonthlySpending cannot exceed currentMonthlySpending');
      }
      return true;
    }),
  body('currentNpsBalance')
    .isFloat({ min: 0 }).withMessage('currentNpsBalance must be a non-negative number'),
  body('currentMonthlyContribution')
    .isFloat({ min: 0 }).withMessage('currentMonthlyContribution must be a non-negative number'),
];

/**
 * @route   POST /api/timemachine/calculate
 * @desc    Show the extra retirement corpus unlocked by reducing a daily habit spend
 * @access  Protected (JWT required)
 */
router.post(
  '/timemachine/calculate',
  authMiddleware,
  timeMachineValidation,
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const {
        currentAge,
        currentMonthlySpending,
        newMonthlySpending,
        currentNpsBalance,
        currentMonthlyContribution,
        expectedReturn = DEFAULT_RETURN_RATE,
      } = req.body;

      const months      = (RETIREMENT_AGE - currentAge) * 12;
      const extraSaving = currentMonthlySpending - newMonthlySpending; // ₹ redirected to NPS

      // Corpus without behaviour change
      const baseCorpus = compoundInterest(
        currentNpsBalance,
        currentMonthlyContribution,
        expectedReturn,
        months
      );

      // Corpus with extra saving added to monthly contribution
      const improvedCorpus = compoundInterest(
        currentNpsBalance,
        currentMonthlyContribution + extraSaving,
        expectedReturn,
        months
      );

      const extraCorpusAt60 = Math.round(improvedCorpus - baseCorpus);

      // ── Human-readable message ──────────────────────────────────────────────

      const savingFormatted    = formatRupees(extraSaving);
      const extraFormatted     = formatRupees(extraCorpusAt60);
      const spendingLabel      = inferSpendingLabel(currentMonthlySpending, newMonthlySpending);

      const message = extraCorpusAt60 > 0
        ? `If you save ${savingFormatted} every month on ${spendingLabel}, ` +
          `you'll have an extra ${extraFormatted} at retirement!`
        : 'No change in spending — your retirement corpus remains the same.';

      return res.status(200).json({
        extraCorpusAt60,
        baseCorpusAt60:     Math.round(baseCorpus),
        improvedCorpusAt60: Math.round(improvedCorpus),
        monthlySavingRedirected: extraSaving,
        message,
        meta: {
          yearsToRetirement: RETIREMENT_AGE - currentAge,
          assumedAnnualReturn: `${expectedReturn}%`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Helper: infer a label from spending amounts for the message ──────────────

/**
 * inferSpendingLabel
 * Very lightweight heuristic — can be replaced with an explicit `category` field in the request.
 */
const inferSpendingLabel = (currentSpend, newSpend) => {
  const saving = currentSpend - newSpend;
  if (saving <= 200) return 'small daily habits';
  if (saving <= 600) return 'coffee & snacks';
  if (saving <= 1500) return 'dining out';
  return 'discretionary spending';
};

export default router;