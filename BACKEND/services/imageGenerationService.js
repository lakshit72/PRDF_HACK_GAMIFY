/**
 * services/imageGenerationService.js
 *
 * Caricature generation with three tiers:
 *
 *  TIER 1 — HF Router text-to-image  (FREE)
 *    The old api-inference.huggingface.co img2img models (instruct-pix2pix,
 *    stable-diffusion-inpainting) return 410 Gone — they were removed.
 *    We now use text-to-image via the NEW router endpoint with SDXL-Lightning.
 *    Prompt includes age-60 description so likeness is approximate but stylised.
 *    Endpoint: https://router.huggingface.co/v1
 *    Model: black-forest-labs/FLUX.1-schnell (fast, free on HF router)
 *    .env: HF_API_TOKEN=hf_...
 *
 *  TIER 2 — Default SVG avatars  (ALWAYS WORKS — zero cost, zero config)
 *    Four distinct hand-drawn SVG caricatures embedded as base64 data URLs.
 */

import axios from 'axios';

// HF router text-to-image endpoint
const HF_TXT2IMG_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
const HF_MODEL       = 'black-forest-labs/FLUX.1-schnell';

// Caricature prompts — text-to-image (no input photo needed)
// Warm, illustrated style works better than photorealistic for caricatures
const PROMPTS = [
  'A warm friendly caricature illustration of a happy 60-year-old Indian person with silver hair, reading glasses, gentle smile, wearing traditional kurta, soft watercolour style, white background',
  'Cartoon portrait of a wise 60-year-old Indian professional, thoughtful expression, grey streaks in hair, glasses, cosy cardigan, clean pastel digital art, white background',
  'Cheerful caricature of a joyful 60-year-old Indian person, laughing expression, white hair, crow\'s feet, rosy cheeks, bold colourful ink illustration style, white background',
  'Friendly caricature of a surprised 60-year-old Indian person, raised eyebrows, fluffy white hair, warm brown skin tones, expressive eyes, clean cartoon art style, white background',
];

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SVG AVATARS — always available, no API needed
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_AVATARS = [
  `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="98" fill="#FFF9F0" stroke="#F47920" stroke-width="3"/>
  <ellipse cx="100" cy="108" rx="44" ry="52" fill="#FDBF7B"/>
  <path d="M56 82 Q56 44 100 41 Q144 44 144 82 L137 77 Q128 48 100 46 Q72 48 63 77 Z" fill="#ECEFF1"/>
  <circle cx="82" cy="97" r="12" fill="none" stroke="#78909C" stroke-width="2"/>
  <circle cx="118" cy="97" r="12" fill="none" stroke="#78909C" stroke-width="2"/>
  <line x1="94" y1="97" x2="106" y2="97" stroke="#78909C" stroke-width="2"/>
  <ellipse cx="82" cy="97" rx="5" ry="4" fill="#5D4037"/>
  <ellipse cx="118" cy="97" rx="5" ry="4" fill="#5D4037"/>
  <path d="M82 118 Q100 130 118 118" stroke="#8B4513" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M80 80 Q100 76 120 80" stroke="#C8844A" stroke-width="1" fill="none" opacity="0.5"/>
  <text x="100" y="185" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#001F4D">Future You · Happy 😊</text>
</svg>`).toString('base64')}`,

  `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="98" fill="#F3F8FF" stroke="#1565C0" stroke-width="3"/>
  <ellipse cx="100" cy="110" rx="43" ry="50" fill="#FDBF7B"/>
  <path d="M57 83 Q57 44 100 41 Q143 44 143 83 L136 78 Q127 50 100 48 Q73 50 64 78 Z" fill="#F5F5F5"/>
  <ellipse cx="82" cy="100" rx="12" ry="9" fill="none" stroke="#546E7A" stroke-width="1.8"/>
  <ellipse cx="118" cy="100" rx="12" ry="9" fill="none" stroke="#546E7A" stroke-width="1.8"/>
  <line x1="94" y1="100" x2="106" y2="100" stroke="#546E7A" stroke-width="1.8"/>
  <path d="M76 91 Q82 88 88 91" stroke="#5D4037" stroke-width="1.5" fill="none"/>
  <path d="M112 91 Q118 88 124 91" stroke="#5D4037" stroke-width="1.5" fill="none"/>
  <path d="M88 120 Q100 124 112 120" stroke="#8B4513" stroke-width="2" fill="none"/>
  <path d="M82 77 Q100 74 118 77" stroke="#C8844A" stroke-width="0.8" fill="none" opacity="0.6"/>
  <text x="100" y="185" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#001F4D">Future You · Wise 🧠</text>
</svg>`).toString('base64')}`,

  `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="98" fill="#F9FBE7" stroke="#2E7D32" stroke-width="3"/>
  <ellipse cx="100" cy="108" rx="45" ry="53" fill="#FFCC80"/>
  <path d="M55 80 Q55 42 100 39 Q145 42 145 80 L138 75 Q130 47 100 45 Q70 47 62 75 Z" fill="#90A4AE"/>
  <path d="M72 91 Q65 96 64 103" stroke="#B5774A" stroke-width="1.5" fill="none"/>
  <path d="M128 91 Q135 96 136 103" stroke="#B5774A" stroke-width="1.5" fill="none"/>
  <path d="M76 93 Q82 89 88 93" stroke="#4E342E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M112 93 Q118 89 124 93" stroke="#4E342E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M80 116 Q100 135 120 116" stroke="#6D4C41" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="100" cy="122" rx="16" ry="8" fill="#FF8A65" opacity="0.8"/>
  <ellipse cx="74" cy="108" rx="10" ry="7" fill="#EF9A9A" opacity="0.4"/>
  <ellipse cx="126" cy="108" rx="10" ry="7" fill="#EF9A9A" opacity="0.4"/>
  <text x="100" y="185" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#001F4D">Future You · Joyful 😄</text>
</svg>`).toString('base64')}`,

  `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="98" fill="#FCE4EC" stroke="#AD1457" stroke-width="3"/>
  <ellipse cx="100" cy="108" rx="44" ry="52" fill="#FFAB76"/>
  <path d="M56 84 Q55 40 100 37 Q145 40 144 84" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="1"/>
  <circle cx="82" cy="97" r="9" fill="white" stroke="#3E2723" stroke-width="1.5"/>
  <circle cx="118" cy="97" r="9" fill="white" stroke="#3E2723" stroke-width="1.5"/>
  <circle cx="82" cy="97" r="5" fill="#5D4037"/>
  <circle cx="118" cy="97" r="5" fill="#5D4037"/>
  <circle cx="85" cy="94" r="2" fill="white"/>
  <circle cx="121" cy="94" r="2" fill="white"/>
  <path d="M73 83 Q82 79 91 82" stroke="#5D4037" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M109 82 Q118 79 127 83" stroke="#5D4037" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="100" cy="121" rx="10" ry="8" fill="#6D4C41"/>
  <ellipse cx="100" cy="120" rx="7" ry="5" fill="#FF7043"/>
  <text x="100" y="185" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#001F4D">Future You · Surprised 😮</text>
</svg>`).toString('base64')}`,
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — HF ROUTER TEXT-TO-IMAGE
// ─────────────────────────────────────────────────────────────────────────────

const generateViaHFRouter = async (prompt, token) => {
  const response = await axios.post(
    HF_TXT2IMG_URL,
    { inputs: prompt },
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept:         'image/png',
      },
      responseType: 'arraybuffer',
      timeout:      60_000,
    }
  );

  // Response is raw PNG bytes
  const pngBase64 = Buffer.from(response.data).toString('base64');
  return `data:image/png;base64,${pngBase64}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const generateCaricatures = async (imageBuffer, userProfile = {}) => {
  const HF_TOKEN = process.env.HF_API_TOKEN;
  const results  = [];
  const errors   = [];
  let   source   = 'default';

  console.log(`[ImageGen] Starting caricature generation. HF=${!!HF_TOKEN}`);

  // Tier 1: HF Router text-to-image
  if (HF_TOKEN) {
    for (let i = 0; i < PROMPTS.length; i++) {
      if (results.length >= 4) break;
      try {
        console.log(`[HF] Generating caricature ${i + 1}/4...`);
        const dataUrl = await generateViaHFRouter(PROMPTS[i], HF_TOKEN);
        results.push(dataUrl);
        source = 'huggingface';
      } catch (err) {
        const msg = `HF caricature ${i + 1} failed: ${err.message}`;
        console.warn(`[HF] ${msg}`);
        errors.push(msg);
      }
    }
  }

  // Fill remaining with default SVGs
  if (results.length < 4) {
    console.log(`[ImageGen] Using ${4 - results.length} default avatar(s)`);
    const shuffled = [...DEFAULT_AVATARS].sort(() => Math.random() - 0.5);
    while (results.length < 4) {
      results.push(shuffled[results.length % shuffled.length]);
    }
    if (source !== 'huggingface') source = 'default';
  }

  return { caricatures: results.slice(0, 4), source, errors };
};

export const getDefaultCaricatures = () => [...DEFAULT_AVATARS];