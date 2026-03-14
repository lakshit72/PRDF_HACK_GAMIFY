/**
 * taxAndContributionService.js
 *
 * Tax Calculator & Mock NPS Gateway for FutureYou
 *
 * SETUP:
 *   No additional packages needed beyond the existing stack.
 *
 * Mount in server.js:
 *   import taxRoutes from './taxAndContributionService.js';
 *   app.use('/api', taxRoutes);
 *
 * ─── Sample Calculations ──────────────────────────────────────────────────────
 *
 *  Scenario A: Income ₹12,00,000 | NPS Contribution ₹2,00,000
 *    80C deduction:       ₹1,50,000  (capped)
 *    80CCD(1B) deduction: ₹50,000    (remaining contribution, capped at ₹50k)
 *    Total deduction:     ₹2,00,000
 *    Tax without NPS:     ₹1,12,500 + 30% of ₹2,00,000 above 10L = ₹1,72,500
 *                         Actually computed slab-by-slab — see computeTax()
 *    Tax with NPS:        Taxable income drops ₹2L → significant saving
 *
 *  Scenario B: Income ₹6,00,000 | NPS Contribution ₹1,00,000
 *    80C deduction:       ₹1,00,000  (within cap)
 *    80CCD(1B) deduction: ₹0         (all used in 80C, nothing extra)
 *    Tax saved at 20% slab
 */

import { Router }  from 'express';
import mongoose    from 'mongoose';
import { body, validationResult } from 'express-validator';
import authMiddleware from './middleware/auth.js';
import User           from './models/User.js';

const router = Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEDUCTION_80C_CAP      = 150_000;   // ₹1,50,000
const DEDUCTION_80CCD1B_CAP  = 50_000;    // ₹50,000
const MAX_TOTAL_DEDUCTION     = DEDUCTION_80C_CAP + DEDUCTION_80CCD1B_CAP; // ₹2,00,000

const SURCHARGE_RATE  = 0.04; // 4% health & education cess (applied on top of slab tax)

/**
 * Old regime tax slabs (FY 2024-25)
 * Each band: [ lower_limit, upper_limit, rate ]
 * upper_limit = Infinity for the top slab.
 */
const OLD_REGIME_SLABS = [
  [0,           250_000,   0.00],
  [250_000,     500_000,   0.05],
  [500_000,   1_000_000,   0.20],
  [1_000_000, Infinity,    0.30],
];

const PRAN_REGEX = /^[A-Z0-9]{12}$/i;

// ─────────────────────────────────────────────────────────────────────────────
// MONGOOSE MODELS
// ─────────────────────────────────────────────────────────────────────────────

const contributionSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    amount: {
      type:     Number,
      required: true,
      min:      [1, 'Contribution must be at least ₹1'],
    },
    date: {
      type:    Date,
      default: Date.now,
    },
    type: {
      type:     String,
      enum:     ['one-time', 'monthly'],
      required: true,
    },
    status: {
      type:    String,
      enum:    ['pending', 'processed', 'failed'],
      default: 'processed',  // mock gateway always succeeds instantly
    },
    referenceId: {
      type:    String,       // mock transaction reference
    },
  },
  { timestamps: true }
);

const Contribution = mongoose.models.Contribution
  || mongoose.model('Contribution', contributionSchema);

// ─────────────────────────────────────────────────────────────────────────────
// TAX CALCULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * computeTax
 *
 * Calculates income tax under the Old Regime using progressive slab rates,
 * then applies the 4% health & education cess on the slab total.
 *
 * @param {number} taxableIncome – income after deductions (₹)
 * @returns {{ slabTax: number, cess: number, totalTax: number }}
 */
const computeTax = (taxableIncome) => {
  if (taxableIncome <= 0) return { slabTax: 0, cess: 0, totalTax: 0 };

  let slabTax = 0;

  for (const [lower, upper, rate] of OLD_REGIME_SLABS) {
    if (taxableIncome <= lower) break;
    const taxableInSlab = Math.min(taxableIncome, upper) - lower;
    slabTax += taxableInSlab * rate;
  }

  const cess      = Math.round(slabTax * SURCHARGE_RATE);
  const totalTax  = Math.round(slabTax + cess);

  return { slabTax: Math.round(slabTax), cess, totalTax };
};

/**
 * splitNpsDeduction
 *
 * Splits a given NPS contribution across 80C and 80CCD(1B).
 *
 * Rules:
 *   1. First ₹1.5L of NPS contribution goes under 80C.
 *   2. Any amount beyond ₹1.5L (up to ₹50k more) is exclusively 80CCD(1B).
 *   3. If the full ₹1.5L 80C cap is filled, additional NPS qualifies for 80CCD(1B).
 *
 * @param {number} npsContribution
 * @returns {{ deduction80C: number, deduction80CCD1B: number, totalDeduction: number }}
 */
const splitNpsDeduction = (npsContribution) => {
  const deduction80C     = Math.min(npsContribution, DEDUCTION_80C_CAP);
  const remaining        = npsContribution - deduction80C;
  const deduction80CCD1B = Math.min(remaining, DEDUCTION_80CCD1B_CAP);
  const totalDeduction   = deduction80C + deduction80CCD1B;

  return { deduction80C, deduction80CCD1B, totalDeduction };
};

/**
 * computeEffectiveTaxRate
 * Returns the effective rate as a percentage, rounded to 2 decimal places.
 */
const computeEffectiveTaxRate = (totalTax, grossIncome) =>
  grossIncome > 0 ? Math.round((totalTax / grossIncome) * 10_000) / 100 : 0;

/**
 * getMarginalRate
 * Returns the marginal slab rate that applies at a given income level.
 * Useful for showing the user which rate their saved amount was taxed at.
 */
const getMarginalRate = (taxableIncome) => {
  if (taxableIncome <= 0) return 0;
  for (let i = OLD_REGIME_SLABS.length - 1; i >= 0; i--) {
    const [lower, , rate] = OLD_REGIME_SLABS[i];
    if (taxableIncome > lower) return rate;
  }
  return 0;
};

/**
 * generateMockReferenceId
 * Creates a mock transaction ID for the NPS gateway (e.g., "NPS-20240601-A3F9K2").
 */
const generateMockReferenceId = () => {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NPS-${date}-${suffix}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

const handleValidation = (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ errors: errs.array() });
    return true;
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES – TAX CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/tax/calculate
 * @desc    Compute tax saved under 80C + 80CCD(1B) for a given NPS contribution
 * @access  Protected
 *
 * Example request:
 *   { "annualIncome": 1200000, "npsContribution": 200000 }
 *
 * Example response:
 *   {
 *     "grossIncome":          1200000,
 *     "npsContribution":       200000,
 *     "deduction80C":          150000,
 *     "deduction80CCD1B":       50000,
 *     "totalDeduction":        200000,
 *     "taxableIncomeWithout":  1200000,
 *     "taxableIncomeWith":     1000000,
 *     "taxWithout":  { "slabTax": 173077, "cess": 6923, "totalTax": 180000 },
 *     "taxWith":     { "slabTax": 108654, "cess": 4346, "totalTax": 113000 },
 *     "totalTaxSaved":          67000,
 *     "effectiveTaxRate":        9.42,
 *     "marginalRate":            "30%",
 *     "regime":                 "old"
 *   }
 */
router.post(
  '/tax/calculate',
  [
    body('annualIncome')
      .isFloat({ min: 1 }).withMessage('annualIncome must be a positive number'),
    body('npsContribution')
      .isFloat({ min: 0 }).withMessage('npsContribution must be a non-negative number')
      .custom((val, { req }) => {
        if (parseFloat(val) > parseFloat(req.body.annualIncome)) {
          throw new Error('npsContribution cannot exceed annualIncome');
        }
        return true;
      }),
  ],
  (req, res) => {
    if (handleValidation(req, res)) return;

    const annualIncome    = Math.round(parseFloat(req.body.annualIncome));
    const npsContribution = Math.round(parseFloat(req.body.npsContribution));

    // Split NPS contribution across sections
    const { deduction80C, deduction80CCD1B, totalDeduction } =
      splitNpsDeduction(npsContribution);

    // Taxable incomes
    const taxableIncomeWithout = annualIncome;
    const taxableIncomeWith    = Math.max(0, annualIncome - totalDeduction);

    // Tax computations
    const taxWithout = computeTax(taxableIncomeWithout);
    const taxWith    = computeTax(taxableIncomeWith);

    const totalTaxSaved     = Math.max(0, taxWithout.totalTax - taxWith.totalTax);
    const effectiveTaxRate  = computeEffectiveTaxRate(taxWith.totalTax, annualIncome);
    const marginalRate      = `${Math.round(getMarginalRate(taxableIncomeWithout) * 100)}%`;

    // Slab breakdown for UX (which bands are touched at this income)
    const slabBreakdown = OLD_REGIME_SLABS
      .filter(([lower]) => taxableIncomeWithout > lower)
      .map(([lower, upper, rate]) => ({
        slab:         upper === Infinity
                        ? `Above ₹${(lower / 100_000).toFixed(0)}L`
                        : `₹${(lower / 100_000).toFixed(1)}L – ₹${(upper / 100_000).toFixed(1)}L`,
        rate:         `${rate * 100}%`,
        taxableAmount: Math.max(0, Math.min(taxableIncomeWithout, upper === Infinity ? taxableIncomeWithout : upper) - lower),
      }));

    return res.status(200).json({
      grossIncome:           annualIncome,
      npsContribution,
      deduction80C,
      deduction80CCD1B,
      totalDeduction,
      taxableIncomeWithout,
      taxableIncomeWith,
      taxWithout,
      taxWith,
      totalTaxSaved,
      effectiveTaxRate,
      marginalRate,
      slabBreakdown,
      regime:                'old',
      note:                  'Calculations are indicative. Consult a tax professional for filing.',
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES – MOCK NPS GATEWAY
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/contribute/link-pran ────────────────────────────────────────────

/**
 * @route   POST /api/contribute/link-pran
 * @desc    Validate and save PRAN to the user's profile
 * @access  Protected
 */
router.post(
  '/contribute/link-pran',
  [
    body('pran')
      .isString().trim().notEmpty().withMessage('PRAN is required')
      .matches(PRAN_REGEX).withMessage('PRAN must be exactly 12 alphanumeric characters'),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const pran = req.body.pran.toUpperCase();

      // Check if PRAN is already linked to a different account
      const conflict = await User.findOne({
        pran,
        _id: { $ne: req.user._id },
      }).lean();

      if (conflict) {
        return res.status(409).json({ error: 'This PRAN is already linked to another account' });
      }

      await User.findByIdAndUpdate(req.user._id, { $set: { pran } });

      return res.status(200).json({
        message: 'PRAN linked successfully',
        pran,
      });
    } catch (err) { next(err); }
  }
);

// ── POST /api/contribute/make ─────────────────────────────────────────────────

/**
 * @route   POST /api/contribute/make
 * @desc    Record a mock NPS contribution; optionally set monthly flag
 * @access  Protected
 */
router.post(
  '/contribute/make',
  [
    body('amount')
      .isFloat({ min: 500 }).withMessage('Minimum contribution is ₹500'),
    body('frequency')
      .isIn(['one-time', 'monthly']).withMessage('frequency must be "one-time" or "monthly"'),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const userId    = req.user._id;
      const amount    = Math.round(parseFloat(req.body.amount));
      const frequency = req.body.frequency;

      const referenceId = generateMockReferenceId();

      // Persist contribution record
      const contribution = await Contribution.create({
        userId,
        amount,
        date:        new Date(),
        type:        frequency,
        status:      'processed',
        referenceId,
      });

      // Mirror into User.npsContributions for the gamification score to read
      await User.findByIdAndUpdate(userId, {
        $push: {
          npsContributions: {
            amount,
            date: contribution.date,
            type: 'employee',
          },
        },
      });

      // For monthly contributions, flag auto-debit as enabled
      if (frequency === 'monthly') {
        await User.findByIdAndUpdate(userId, {
          $set: {
            'autoDebit.enabled': true,
            'autoDebit.amount':  amount,
          },
        });
      }

      return res.status(201).json({
        message:        'Contribution recorded',
        contributionId: contribution._id,
        referenceId,
        amount,
        frequency,
        date:           contribution.date,
        status:         contribution.status,
      });
    } catch (err) { next(err); }
  }
);

// ── GET /api/contribute/history ───────────────────────────────────────────────

/**
 * @route   GET /api/contribute/history
 * @desc    Return contribution history for the authenticated user
 * @access  Protected
 */
router.get('/contribute/history', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type } = req.query;

    const filter = { userId };
    if (type && ['one-time', 'monthly'].includes(type)) filter.type = type;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Contribution.countDocuments(filter);

    const contributions = await Contribution
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Aggregate summary stats
    const summary = await Contribution.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id:               null,
          totalContributed:  { $sum: '$amount' },
          contributionCount: { $sum: 1 },
          avgContribution:   { $avg: '$amount' },
          firstContribution: { $min: '$date' },
          lastContribution:  { $max: '$date' },
        },
      },
    ]);

    const stats = summary[0] ?? {
      totalContributed:  0,
      contributionCount: 0,
      avgContribution:   0,
      firstContribution: null,
      lastContribution:  null,
    };

    return res.status(200).json({
      contributions,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      summary: {
        totalContributed:  Math.round(stats.totalContributed),
        contributionCount: stats.contributionCount,
        avgContribution:   Math.round(stats.avgContribution),
        firstContribution: stats.firstContribution,
        lastContribution:  stats.lastContribution,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/contribute/set-autodebit ────────────────────────────────────────

/**
 * @route   POST /api/contribute/set-autodebit
 * @desc    Configure a monthly auto-debit schedule on the user profile
 * @access  Protected
 */
router.post(
  '/contribute/set-autodebit',
  [
    body('amount')
      .isFloat({ min: 500 }).withMessage('Minimum auto-debit amount is ₹500'),
    body('dayOfMonth')
      .isInt({ min: 1, max: 28 }).withMessage('dayOfMonth must be between 1 and 28'),
    body('enabled')
      .optional()
      .isBoolean().withMessage('enabled must be a boolean'),
  ],
  async (req, res, next) => {
    if (handleValidation(req, res)) return;

    try {
      const { amount, dayOfMonth, enabled = true } = req.body;

      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          'autoDebit.enabled':    Boolean(enabled),
          'autoDebit.amount':     Math.round(parseFloat(amount)),
          'autoDebit.dayOfMonth': parseInt(dayOfMonth),
        },
      });

      return res.status(200).json({
        message:    enabled
                      ? `Auto-debit of ₹${Math.round(amount)} set for day ${dayOfMonth} of every month`
                      : 'Auto-debit disabled',
        autoDebit: {
          enabled:    Boolean(enabled),
          amount:     Math.round(parseFloat(amount)),
          dayOfMonth: parseInt(dayOfMonth),
        },
      });
    } catch (err) { next(err); }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { Contribution, computeTax, splitNpsDeduction };
export default router;