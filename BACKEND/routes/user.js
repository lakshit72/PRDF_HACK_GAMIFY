import { Router } from "express";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import authMiddleware from "../middleware/auth.js";
import User from "../models/User.js";

const router = Router();
const SALT_ROUNDS = 10;

// All routes in this file require authentication
router.use(authMiddleware);

// ─── Validation chains ────────────────────────────────────────────────────────

const profileUpdateValidation = [
  body("age")
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage("Age must be between 0 and 120"),
  body("income")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Income must be a non-negative number"),
  body("pran")
    .optional()
    .matches(/^[A-Z0-9]{12}$/i)
    .withMessage("PRAN must be 12 alphanumeric characters"),
  body("onboardingCompleted")
    .optional()
    .isBoolean()
    .withMessage("onboardingCompleted must be a boolean"),
];

const changePasswordValidation = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// ─── GET /api/user/profile ────────────────────────────────────────────────────

/**
 * @route   GET /api/user/profile
 * @desc    Return authenticated user's profile (no passwordHash)
 * @access  Protected
 */
router.get("/profile", (req, res) => {
  // req.user is already stripped of passwordHash by authMiddleware (.select)
  return res.status(200).json({ user: req.user });
});

// ─── PUT /api/user/profile ────────────────────────────────────────────────────

/**
 * @route   PUT /api/user/profile
 * @desc    Update updatable profile fields
 * @access  Protected
 */
router.put("/profile", profileUpdateValidation, async (req, res, next) => {
  if (handleValidationErrors(req, res)) return;

  try {
    // Whitelist updatable fields – never let email/passwordHash be changed here
    const ALLOWED_FIELDS = ["age", "income", "pran", "onboardingCompleted"];
    const updates = {};

    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === "pran" ? req.body[field].toUpperCase() : req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true, select: "-passwordHash -__v" },
    );

    return res
      .status(200)
      .json({ message: "Profile updated", user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/user/change-password ──────────────────────────────────────────

/**
 * @route   POST /api/user/change-password
 * @desc    Verify old password, then save a new hashed password
 * @access  Protected
 */
router.post(
  "/change-password",
  changePasswordValidation,
  async (req, res, next) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { oldPassword, newPassword } = req.body;

      // Fetch user WITH passwordHash for comparison
      const user = await User.findById(req.user._id);

      const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Old password is incorrect" });
      }

      if (oldPassword === newPassword) {
        return res
          .status(400)
          .json({ error: "New password must differ from old password" });
      }

      user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.save();

      return res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
