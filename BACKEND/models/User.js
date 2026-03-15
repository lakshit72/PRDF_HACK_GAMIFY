import mongoose from 'mongoose';

/**
 * NPS Contribution sub-document schema
 */
const npsContributionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date:   { type: Date,   required: true, default: Date.now },
  type:   { type: String, enum: ['employee', 'employer', 'voluntary'], required: true },
}, { _id: false });

/**
 * Main User schema
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type:     String,
      required: [true, 'Password hash is required'],
    },
    age: {
      type: Number,
      min:  [0, 'Age must be positive'],
      max:  [120, 'Age must be realistic'],
    },
    income: {
      type: Number,
      min:  [0, 'Income must be non-negative'],
    },
    pran: {
      type:  String,
      match: [/^[A-Z0-9]{12}$/, 'PRAN must be exactly 12 alphanumeric characters'],
      uppercase: true,
      trim:      true,
    },
    npsContributions: {
      type:    [npsContributionSchema],
      default: [],
    },
    onboardingCompleted: {
      type:    Boolean,
      default: false,
    },
    autoDebit: {
      enabled:    { type: Boolean, default: false },
      amount:     { type: Number,  min: 0 },
      dayOfMonth: { type: Number,  min: 1, max: 28 },
    },

    // ── Caricature / Photo fields ───────────────────────────────────────────
    /**
     * caricatures: array of 4 image data URLs or remote URLs.
     * Each is either:
     *   - "data:image/png;base64,..." (Hugging Face base64 output)
     *   - "data:image/svg+xml;base64,..." (default SVG fallback)
     *   - "https://api.deepai.org/..." (DeepAI remote URL)
     */
    caricatures: {
      type:    [String],
      default: [],
    },

    /**
     * defaultCaricature: quick-access first caricature URL.
     * Duplicates caricatures[0] for convenience.
     */
    defaultCaricature: {
      type:    String,
      default: null,
    },

    /**
     * originalPhotoBase64: sanitised & resized user photo stored as base64.
     * Stored for potential re-generation without re-upload.
     * NOTE: This can be large (~100KB). For production, use cloud storage
     * (S3/Cloudinary) and store the URL here instead.
     */
    originalPhotoBase64: {
      type:    String,
      default: null,
      select:  false,    // never included in default queries — must be explicitly selected
    },

    /** Timestamp of last photo upload */
    photoUploadedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

// Never expose passwordHash or originalPhotoBase64 in JSON responses
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.originalPhotoBase64;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);