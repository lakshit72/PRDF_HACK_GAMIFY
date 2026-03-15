/**
 * routes/uploadRoutes.js
 *
 * Image upload & AI caricature generation endpoint.
 *
 * POST /api/user/upload-photo  (Protected, multipart/form-data)
 *   Field:  photo  (image/jpeg or image/png, max 5MB)
 *   Returns: { caricatures: string[], defaultCaricature: string, source: string }
 *
 * SETUP:
 *   npm install multer sharp
 *   Add to .env:
 *     HF_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx   (free at huggingface.co)
 *     DEEPAI_API_KEY=your-deepai-key          (optional, free at deepai.org)
 *
 * Mount in server.js:
 *   import uploadRoutes from './routes/uploadRoutes.js';
 *   app.use('/api/user', uploadRoutes);
 */

import { Router }  from 'express';
import multer      from 'multer';
import sharp       from 'sharp';
import authMiddleware from '../middleware/auth.js';
import User           from '../models/User.js';
import { generateCaricatures } from '../services/imageGenerationService.js';

const router = Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// MULTER CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * memoryStorage keeps the file as a Buffer — no temp file on disk.
 * Appropriate for Render/Heroku ephemeral filesystems.
 */
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG, and WebP images are accepted'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  MAX_FILE_SIZE,
    files:     1,
    fields:    0,      // no extra non-file fields allowed via multipart
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sanitiseAndResizeImage
 *
 * Uses sharp to:
 *   1. Strip EXIF metadata (location, device info)
 *   2. Resize to max 768×768 (reduces API payload, saves bandwidth)
 *   3. Convert to JPEG for consistent format
 *
 * This is also a basic security measure — passing through sharp re-encodes
 * the image, which neutralises most "image bomb" / polyglot file attacks.
 *
 * @param {Buffer} buffer – raw uploaded image bytes
 * @returns {Promise<Buffer>} – sanitised JPEG buffer
 */
const sanitiseAndResizeImage = async (buffer) => {
  return sharp(buffer)
    .rotate()                          // auto-orient based on EXIF
    .resize(768, 768, {
      fit:        'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .withMetadata(false)               // strip ALL metadata
    .toBuffer();
};

/**
 * validateImageContent
 * Performs a basic structural check — ensures the buffer is actually a
 * decodable image (sharp will throw on corrupt/malicious files).
 *
 * @param {Buffer} buffer
 * @returns {Promise<{width: number, height: number, format: string}>}
 */
const validateImageContent = async (buffer) => {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) throw new Error('Image has invalid dimensions');
  if (meta.width < 50 || meta.height < 50) throw new Error('Image is too small (min 50×50px)');
  return meta;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER — uploadAndGenerateCaricatures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/user/upload-photo
 * @desc    Upload a face photo, generate 4 caricatures, save to user profile
 * @access  Protected
 * @consumes multipart/form-data
 * @field   photo – image file (JPEG/PNG/WebP, max 5MB)
 */
const uploadAndGenerateCaricatures = async (req, res) => {
  const userId = req.user._id;

  // ── File presence check ───────────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded. Include a "photo" field in the form.' });
  }

  const rawBuffer = req.file.buffer;

  // ── Validate image content (traps corrupt / non-image files) ─────────────
  let imageMeta;
  try {
    imageMeta = await validateImageContent(rawBuffer);
  } catch (err) {
    return res.status(400).json({ error: `Invalid image: ${err.message}` });
  }

  // ── Sanitise & resize ────────────────────────────────────────────────────
  let processedBuffer;
  try {
    processedBuffer = await sanitiseAndResizeImage(rawBuffer);
  } catch (err) {
    console.error('[Upload] Image processing failed:', err.message);
    return res.status(422).json({ error: 'Could not process image. Please try a different photo.' });
  }

  console.log(`[Upload] Image accepted: ${imageMeta.format} ${imageMeta.width}×${imageMeta.height} → resized to JPEG`);

  // ── Generate caricatures ──────────────────────────────────────────────────
  let genResult;
  try {
    genResult = await generateCaricatures(processedBuffer, {
      age:   req.user.age,
      email: req.user.email,
    });
  } catch (err) {
    // generateCaricatures should never throw (it catches internally),
    // but handle just in case
    console.error('[Upload] Caricature generation crashed:', err.message);
    genResult = {
      caricatures: [],
      source:      'error',
      errors:      [err.message],
    };
  }

  const { caricatures, source, errors } = genResult;

  // ── Validate we have at least one caricature ──────────────────────────────
  if (!caricatures.length) {
    console.error('[Upload] Zero caricatures generated:', errors);
    return res.status(503).json({
      error:  'Caricature generation failed and no fallbacks available. Please try again.',
      detail: errors,
    });
  }

  // ── Persist to user document ──────────────────────────────────────────────
  // Store originalPhotoBase64 for potential re-generation later
  const originalPhotoBase64 = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

  await User.findByIdAndUpdate(userId, {
    $set: {
      caricatures:         caricatures,
      defaultCaricature:   caricatures[0],
      originalPhotoBase64,
      photoUploadedAt:     new Date(),
    },
  });

  console.log(`[Upload] User ${userId}: saved ${caricatures.length} caricatures (source: ${source})`);

  // ── Response ───────────────────────────────────────────────────────────────
  const responseBody = {
    message:           `${caricatures.length} caricature(s) generated successfully`,
    caricatures,
    defaultCaricature: caricatures[0],
    source,            // 'huggingface' | 'deepai' | 'default'
    count:             caricatures.length,
  };

  // Non-fatal: surface AI errors as a warning so client can inform the user
  if (errors.length > 0) {
    responseBody.warning = `Some AI requests failed — ${
      source === 'default' ? 'using default avatars' : 'partial results returned'
    }`;
  }

  return res.status(200).json(responseBody);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/user/caricatures
 * @desc    Return saved caricatures for the authenticated user
 * @access  Protected
 */
router.get('/caricatures', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('caricatures defaultCaricature photoUploadedAt')
      .lean();

    if (!user?.caricatures?.length) {
      return res.status(200).json({
        caricatures:       [],
        defaultCaricature: null,
        message:           'No caricatures generated yet. Upload a photo first.',
      });
    }

    return res.status(200).json({
      caricatures:       user.caricatures,
      defaultCaricature: user.defaultCaricature,
      photoUploadedAt:   user.photoUploadedAt,
      count:             user.caricatures.length,
    });
  } catch (err) { next(err); }
});

/**
 * @route   DELETE /api/user/photo
 * @desc    Remove stored photo and caricatures (privacy / GDPR)
 * @access  Protected
 */
router.delete('/photo', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: {
        caricatures:         '',
        defaultCaricature:   '',
        originalPhotoBase64: '',
        photoUploadedAt:     '',
      },
    });
    return res.status(200).json({ message: 'Photo and caricatures deleted successfully' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MOUNT UPLOAD ROUTE WITH MULTER MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multer error handler — converts MulterError into consistent API error shape.
 */
const multerMiddleware = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE:      'File is too large. Maximum size is 5MB.',
        LIMIT_UNEXPECTED_FILE:'Only JPEG, PNG, and WebP images are accepted.',
        LIMIT_FILE_COUNT:     'Only one file can be uploaded at a time.',
      };
      return res.status(400).json({
        error: messages[err.code] ?? `Upload error: ${err.message}`,
      });
    }

    // Unexpected error
    next(err);
  });
};

router.post('/upload-photo', multerMiddleware, uploadAndGenerateCaricatures);

export default router;