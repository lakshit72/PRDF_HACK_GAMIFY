/**
 * services/imageGenerationService.js
 *
 * Personalised 4-pose avatar generation pipeline.
 *
 * ENDPOINTS (verified 2025):
 *
 *  Vision (image analysis):
 *    POST https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-11B-Vision-Instruct
 *    Uses HF's own chat-completion format (NOT the /v1/chat/completions router)
 *    Body: { model, messages: [{role, content: [{type:"image_url",...},{type:"text",...}]}] }
 *
 *  Image gen:
 *    POST https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell
 *    Body: { inputs: "prompt string" }
 *    Returns: binary image (arraybuffer)
 *    Auth: Bearer HF_TOKEN in header
 *
 * WHY fal-ai PROVIDER:
 *  - FLUX.1-schnell is no longer available on hf-inference (CPU-only since July 2025)
 *  - fal-ai is the fastest GPU provider for FLUX models via HF router
 *  - Same HF token works — billed to your HF account
 *
 * TOKEN REQUIREMENTS:
 *  Your HF_TOKEN must be a fine-grained token with:
 *    ✅ "Make calls to Inference Providers" permission
 *  Create/edit at: https://huggingface.co/settings/tokens
 *
 * PERSONALISATION:
 *  Step 1 — Vision model analyses photo → extracts gender, skin tone, hair,
 *            face shape, build (falls back to neutral defaults on any error)
 *  Step 2 — Features + DETECTED GENDER injected into FLUX prompts
 *  Step 3 — Background removal via Sharp pixel-alpha manipulation
 */

import axios        from 'axios';
import { Buffer }   from 'buffer';

// ── HF router base ────────────────────────────────────────────────────────────
const HF_ROUTER = 'https://router.huggingface.co';

// Vision: uses hf-inference provider with /models/{model} path (correct 2025 format)
const HF_VISION_URL   = `${HF_ROUTER}/hf-inference/models/meta-llama/Llama-3.2-11B-Vision-Instruct`;

// Image gen: fal-ai provider via HF router (FLUX.1-schnell runs on GPU here)
const HF_IMG_URL      = `${HF_ROUTER}/fal-ai/models/black-forest-labs/FLUX.1-schnell`;

// ── Step 1: Vision analysis ───────────────────────────────────────────────────
/**
 * Sends the photo to Llama-3.2-Vision and extracts:
 *  - gender (man/woman) — used to correct avatar gender
 *  - physical features for personalised prompt
 *
 * Returns { gender, featureDesc } or safe defaults on any failure.
 */
const analysePhoto = async (imageBuffer, token) => {
  const DEFAULTS = {
    gender:      'man',
    featureDesc: 'warm medium-brown skin tone, dark hair with silver streaks, oval face, warm brown eyes, medium build',
  };

  try {
    const b64    = imageBuffer.toString('base64');
    const imgUrl = `data:image/jpeg;base64,${b64}`;

    // Correct format for hf-inference vision models (2025):
    // POST to /hf-inference/models/{model} with messages in chat format
    const res = await axios.post(
      HF_VISION_URL,
      {
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
        max_tokens:  220,
        temperature: 0.1,
        messages: [
          {
            role:    'user',
            content: [
              {
                type:      'image_url',
                image_url: { url: imgUrl },
              },
              {
                type: 'text',
                text:
                  'Look at this photo and return ONLY a JSON object — no extra text, no markdown, no backticks. Format:\n' +
                  '{"gender":"man or woman","skin_tone":"e.g. warm light brown","hair":"e.g. thick black hair","face":"e.g. oval face","eyes":"e.g. dark brown eyes","build":"e.g. slim","notable":"e.g. high cheekbones"}',
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Wait-For-Model': 'true', // don't 503 if model is loading
        },
        timeout: 45_000,
      }
    );

    const raw   = res.data?.choices?.[0]?.message?.content?.trim() ?? '';
    console.log('[ImageGen] Vision raw response:', raw.slice(0, 200));

    // Strip any markdown fences the model might add despite instructions
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match   = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error(`No JSON found in vision response: "${raw.slice(0, 100)}"`);

    const f = JSON.parse(match[0]);
    console.log('[ImageGen] Vision parsed:', f);

    const gender =
      (f.gender ?? '').toLowerCase().includes('woman') ||
      (f.gender ?? '').toLowerCase().includes('female') ||
      (f.gender ?? '').toLowerCase().includes('girl')
        ? 'woman' : 'man';

    const featureDesc =
      `${f.skin_tone  || 'warm medium-brown'} skin tone, ` +
      `${f.hair       || 'dark hair turning silver'}, ` +
      `${f.face       || 'oval face'}, ` +
      `${f.eyes       || 'warm brown eyes'}, ` +
      `${f.build      || 'medium build'}` +
      (f.notable ? `, ${f.notable}` : '');

    return { gender, featureDesc };

  } catch (err) {
    // Log the full error for debugging
    const status  = err.response?.status;
    const detail  = err.response?.data
      ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message;
    console.warn(`[ImageGen] Vision analysis failed (HTTP ${status ?? 'N/A'}): ${detail}`);
    console.warn('[ImageGen] Falling back to default features');
    return DEFAULTS;
  }
};

// ── Step 2: Build gender-correct personalised prompts ─────────────────────────
const buildPrompts = (gender, featureDesc) => {
  const genderWord = gender === 'woman' ? 'woman' : 'man';
  const outfit     = gender === 'woman'
    ? 'wearing a beautiful salwar kameez or saree with silver jewellery'
    : 'wearing a traditional kurta and comfortable trousers';

  const BASE =
    `full body illustration, elderly Indian ${genderWord} at age 60, ` +
    `aged version of someone with: ${featureDesc}, ` +
    `silver-grey hair (aged naturally from their original colour), deep smile lines and laugh lines, ` +
    `${outfit}, ` +
    `3D cartoon character style like Pixar or Disney, smooth cel shading, ` +
    `pure white background, complete full body visible head to toe, ` +
    `soft warm studio lighting, warm friendly approachable character design, ` +
    `high quality illustration, no text, no watermarks`;

  return [
    // [0] POSE_IDLE — waving
    `${BASE}, standing tall with confidence, one hand raised in a warm friendly wave, ` +
    `big genuine warm smile, welcoming body language, relaxed joyful posture`,

    // [1] POSE_THINKING — finger to chin
    `${BASE}, leaning slightly forward with curiosity, ` +
    `one finger gently raised to chin in a thoughtful pose, ` +
    `eyebrows raised, wise contemplative expression, calm intelligent look`,

    // [2] POSE_TALKING — arms open wide
    `${BASE}, both arms spread wide open in an enthusiastic explanatory gesture, ` +
    `mouth open mid-speech, animated expressive face, ` +
    `engaging storyteller pose, full of energy and warmth`,

    // [3] POSE_HAPPY — arms raised celebrating
    `${BASE}, both arms raised high overhead in joyful celebration, ` +
    `eyes sparkling with happiness, wide beaming smile showing teeth, ` +
    `triumphant celebratory pose, pure joy and excitement`,
  ];
};

// ── Step 3: Generate one image via HF router → fal-ai → FLUX ─────────────────
const generateImage = async (prompt, token) => {
  console.log(`[ImageGen] Sending prompt to fal-ai/FLUX (${prompt.length} chars)...`);

  const res = await axios.post(
    HF_IMG_URL,
    { inputs: prompt },
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept:         'image/png',
      },
      responseType: 'arraybuffer',
      timeout:      90_000, // fal-ai cold starts can be slow
    }
  );

  // Validate we actually got image bytes back (not a JSON error wrapped in 200)
  const contentType = res.headers['content-type'] ?? '';
  if (!contentType.startsWith('image/')) {
    const bodyText = Buffer.from(res.data).toString('utf8').slice(0, 300);
    throw new Error(`Expected image response but got ${contentType}: ${bodyText}`);
  }

  let buf = Buffer.from(res.data);

  // ── Background removal (Sharp pixel-alpha) ───────────────────────────────
  try {
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const px = new Uint8ClampedArray(data.buffer);
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i+1], b = px[i+2];
      if (r > 230 && g > 230 && b > 230) {
        px[i+3] = 0; // pure white → transparent
      } else if (r > 210 && g > 210 && b > 210) {
        // soft anti-aliased edge
        px[i+3] = Math.round(((255-r)+(255-g)+(255-b)) / 3 * 5);
      }
    }

    buf = await sharp(Buffer.from(px.buffer), {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toBuffer();

    console.log('[ImageGen] Background removal applied ✓');
  } catch (sharpErr) {
    // sharp unavailable — return original; CSS mix-blend-mode handles blending
    console.warn('[ImageGen] Sharp unavailable, skipping bg removal:', sharpErr.message);
  }

  return `data:image/png;base64,${buf.toString('base64')}`;
};

// ── SVG fallback avatars (4 poses, gender-neutral) ────────────────────────────
const makeSVG = (pose) => {
  const svgs = {
    idle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300">
<defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs>
<rect x="52" y="210" width="22" height="70" rx="11" fill="#5D4037"/><rect x="86" y="210" width="22" height="70" rx="11" fill="#5D4037"/>
<ellipse cx="63" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="97" cy="280" rx="14" ry="8" fill="#4E342E"/>
<rect x="38" y="128" width="84" height="90" rx="16" fill="#2E7D32"/>
<rect x="22" y="132" width="18" height="55" rx="9" fill="#2E7D32"/>
<ellipse cx="31" cy="188" rx="12" ry="10" fill="url(#s)"/>
<g transform="rotate(-55,122,138)"><rect x="120" y="130" width="18" height="48" rx="9" fill="#2E7D32"/></g>
<ellipse cx="127" cy="88" rx="13" ry="11" fill="url(#s)"/>
<rect x="123" y="76" width="6" height="15" rx="3" fill="url(#s)"/><rect x="130" y="74" width="6" height="16" rx="3" fill="url(#s)"/>
<rect x="68" y="108" width="24" height="22" rx="9" fill="url(#s)"/>
<ellipse cx="80" cy="76" rx="42" ry="46" fill="url(#s)"/>
<ellipse cx="80" cy="38" rx="40" ry="20" fill="#B0BEC5"/>
<path d="M40 53Q44 26 65 22Q80 17 95 22Q116 26 120 53Q108 36 80 33Q52 36 40 53Z" fill="#CFD8DC"/>
<ellipse cx="38" cy="80" rx="9" ry="12" fill="#D4845A"/><ellipse cx="122" cy="80" rx="9" ry="12" fill="#D4845A"/>
<path d="M55 62Q65 58 73 61" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M87 61Q95 58 105 62" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<ellipse cx="64" cy="74" rx="10" ry="9" fill="white"/><ellipse cx="96" cy="74" rx="10" ry="9" fill="white"/>
<circle cx="64" cy="75" r="6" fill="#4E342E"/><circle cx="96" cy="75" r="6" fill="#4E342E"/>
<circle cx="64" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="96" cy="75" r="3.5" fill="#1A1A1A"/>
<circle cx="66" cy="73" r="1.5" fill="white"/><circle cx="98" cy="73" r="1.5" fill="white"/>
<ellipse cx="80" cy="88" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
<path d="M65 100Q72 97 80 99Q88 97 95 100" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M62 110Q80 124 98 110" stroke="#8D4E20" stroke-width="2" fill="none" stroke-linecap="round"/>
<text x="130" y="70" font-size="18">👋</text></svg>`,

    thinking: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300">
<defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs>
<rect x="52" y="215" width="22" height="65" rx="11" fill="#5D4037"/><rect x="86" y="215" width="22" height="65" rx="11" fill="#5D4037"/>
<ellipse cx="63" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="97" cy="280" rx="14" ry="8" fill="#4E342E"/>
<rect x="36" y="130" width="84" height="90" rx="16" fill="#1565C0"/>
<rect x="20" y="135" width="18" height="50" rx="9" fill="#1565C0"/>
<ellipse cx="28" cy="186" rx="12" ry="10" fill="url(#s)"/>
<g transform="rotate(-80,122,138)"><rect x="120" y="130" width="18" height="46" rx="9" fill="#1565C0"/></g>
<ellipse cx="96" cy="106" rx="11" ry="10" fill="url(#s)"/><rect x="93" y="90" width="7" height="18" rx="3.5" fill="url(#s)"/>
<rect x="68" y="110" width="24" height="22" rx="9" fill="url(#s)"/>
<ellipse cx="80" cy="78" rx="42" ry="46" fill="url(#s)"/>
<ellipse cx="80" cy="40" rx="40" ry="20" fill="#90A4AE"/>
<path d="M40 55Q44 28 65 24Q80 19 95 24Q116 28 120 55Q108 38 80 35Q52 38 40 55Z" fill="#B0BEC5"/>
<ellipse cx="38" cy="82" rx="9" ry="12" fill="#D4845A"/><ellipse cx="122" cy="82" rx="9" ry="12" fill="#D4845A"/>
<path d="M53 64Q63 58 72 62" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M86 62Q95 58 106 64" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<ellipse cx="63" cy="76" rx="11" ry="10" fill="white"/><ellipse cx="96" cy="76" rx="11" ry="10" fill="white"/>
<circle cx="65" cy="75" r="6.5" fill="#4E342E"/><circle cx="98" cy="75" r="6.5" fill="#4E342E"/>
<circle cx="65" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="98" cy="75" r="3.5" fill="#1A1A1A"/>
<circle cx="67" cy="73" r="1.5" fill="white"/><circle cx="100" cy="73" r="1.5" fill="white"/>
<ellipse cx="80" cy="90" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
<path d="M65 102Q72 99 80 101Q88 99 95 102" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M68 113Q80 117 92 113" stroke="#8D4E20" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="116" cy="36" r="16" fill="white" stroke="#F47920" stroke-width="2"/>
<text x="109" y="43" font-size="16" fill="#F47920" font-weight="bold">?</text></svg>`,

    talking: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
<defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs>
<rect x="72" y="212" width="22" height="68" rx="11" fill="#5D4037"/><rect x="106" y="212" width="22" height="68" rx="11" fill="#5D4037"/>
<ellipse cx="83" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="117" cy="280" rx="14" ry="8" fill="#4E342E"/>
<rect x="56" y="128" width="88" height="92" rx="16" fill="#F47920"/>
<rect x="14" y="134" width="44" height="18" rx="9" fill="#F47920"/><ellipse cx="12" cy="143" rx="14" ry="12" fill="url(#s)"/>
<rect x="142" y="134" width="44" height="18" rx="9" fill="#F47920"/><ellipse cx="188" cy="143" rx="14" ry="12" fill="url(#s)"/>
<rect x="88" y="108" width="24" height="22" rx="9" fill="url(#s)"/>
<ellipse cx="100" cy="76" rx="42" ry="46" fill="url(#s)"/>
<ellipse cx="100" cy="38" rx="40" ry="20" fill="#B0BEC5"/>
<path d="M60 53Q64 26 85 22Q100 17 115 22Q136 26 140 53Q128 36 100 33Q72 36 60 53Z" fill="#CFD8DC"/>
<ellipse cx="58" cy="80" rx="9" ry="12" fill="#D4845A"/><ellipse cx="142" cy="80" rx="9" ry="12" fill="#D4845A"/>
<path d="M72 60Q83 55 91 59" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M108 59Q116 55 128 60" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<ellipse cx="82" cy="74" rx="11" ry="10" fill="white"/><ellipse cx="118" cy="74" rx="11" ry="10" fill="white"/>
<circle cx="82" cy="75" r="6.5" fill="#4E342E"/><circle cx="118" cy="75" r="6.5" fill="#4E342E"/>
<circle cx="82" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="118" cy="75" r="3.5" fill="#1A1A1A"/>
<circle cx="84" cy="73" r="1.5" fill="white"/><circle cx="120" cy="73" r="1.5" fill="white"/>
<ellipse cx="100" cy="88" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
<path d="M84 100Q92 97 100 99Q108 97 116 100" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<ellipse cx="100" cy="112" rx="12" ry="9" fill="#8D4E20"/><ellipse cx="100" cy="110" rx="8" ry="5" fill="#FF8A65" opacity="0.7"/></svg>`,

    happy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 310">
<defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs>
<rect x="62" y="215" width="22" height="68" rx="11" fill="#5D4037" transform="rotate(-4,73,249)"/>
<rect x="96" y="215" width="22" height="68" rx="11" fill="#5D4037" transform="rotate(4,107,249)"/>
<ellipse cx="72" cy="283" rx="14" ry="8" fill="#4E342E"/><ellipse cx="108" cy="283" rx="14" ry="8" fill="#4E342E"/>
<rect x="46" y="130" width="88" height="92" rx="16" fill="#6A1B9A"/>
<g transform="rotate(-140,46,138)"><rect x="28" y="130" width="18" height="52" rx="9" fill="#6A1B9A"/></g>
<ellipse cx="22" cy="80" rx="13" ry="11" fill="url(#s)"/>
<g transform="rotate(140,134,138)"><rect x="134" y="130" width="18" height="52" rx="9" fill="#6A1B9A"/></g>
<ellipse cx="158" cy="80" rx="13" ry="11" fill="url(#s)"/>
<rect x="78" y="110" width="24" height="22" rx="9" fill="url(#s)"/>
<ellipse cx="90" cy="78" rx="42" ry="46" fill="url(#s)"/>
<ellipse cx="90" cy="40" rx="40" ry="20" fill="#B0BEC5"/>
<path d="M50 55Q54 28 75 24Q90 19 105 24Q126 28 130 55Q118 38 90 35Q62 38 50 55Z" fill="#CFD8DC"/>
<ellipse cx="48" cy="82" rx="9" ry="12" fill="#D4845A"/><ellipse cx="132" cy="82" rx="9" ry="12" fill="#D4845A"/>
<path d="M60 65Q71 60 79 64" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M99 64Q107 60 120 65" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M60 78Q70 70 80 78" stroke="#4E342E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M100 78Q110 70 120 78" stroke="#4E342E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<ellipse cx="58" cy="90" rx="12" ry="8" fill="#EF9A9A" opacity="0.5"/>
<ellipse cx="122" cy="90" rx="12" ry="8" fill="#EF9A9A" opacity="0.5"/>
<ellipse cx="90" cy="90" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
<path d="M74 102Q81 99 90 101Q99 99 106 102" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M66 114Q90 136 114 114" stroke="#8D4E20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<text x="4" y="68" font-size="16">⭐</text><text x="152" y="63" font-size="16">⭐</text></svg>`,
  };
  return `data:image/svg+xml;base64,${Buffer.from(svgs[pose] ?? svgs.idle).toString('base64')}`;
};

const POSE_KEYS      = ['idle', 'thinking', 'talking', 'happy'];
const DEFAULT_AVATARS = POSE_KEYS.map(makeSVG);

// ── Public API ────────────────────────────────────────────────────────────────
export const generateCaricatures = async (imageBuffer, userProfile = {}) => {
  const token   = process.env.HF_API_TOKEN;
  const results = [];
  const errors  = [];
  let   source  = 'default';

  // ── Token pre-flight check ─────────────────────────────────────────────────
  if (!token) {
    console.warn('[ImageGen] HF_API_TOKEN not set in .env — returning SVG defaults');
    return { caricatures: [...DEFAULT_AVATARS], source: 'default', errors: ['HF_API_TOKEN missing'] };
  }

  if (!token.startsWith('hf_')) {
    console.warn('[ImageGen] HF_API_TOKEN does not look like a valid HF token (should start with "hf_")');
  }

  console.log(`[ImageGen] Starting personalised generation. Token prefix: ${token.slice(0, 8)}...`);

  // Step 1: Analyse photo
  console.log('[ImageGen] Analysing photo features via vision model...');
  const { gender, featureDesc } = await analysePhoto(imageBuffer, token);
  console.log(`[ImageGen] Detected gender: "${gender}" | Features: "${featureDesc.slice(0, 80)}..."`);

  // Step 2: Build gender-correct prompts
  const prompts = buildPrompts(gender, featureDesc);

  // Step 3: Generate each pose
  for (let i = 0; i < prompts.length; i++) {
    try {
      console.log(`[HF/fal-ai] Generating pose ${i+1}/4 (${POSE_KEYS[i]}, ${gender})...`);
      const dataUrl = await generateImage(prompts[i], token);
      results.push(dataUrl);
      source = 'huggingface';
      console.log(`[HF/fal-ai] Pose ${i+1} done ✓`);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data
        ? Buffer.isBuffer(err.response.data)
          ? Buffer.from(err.response.data).toString('utf8').slice(0, 200)
          : JSON.stringify(err.response.data).slice(0, 200)
        : err.message;
      console.warn(`[HF/fal-ai] Pose ${i+1} failed (HTTP ${status ?? 'N/A'}): ${detail}`);
      errors.push(`pose${i+1}: ${detail}`);
    }
  }

  // Fill any failed poses with SVG fallbacks
  while (results.length < 4) {
    results.push(DEFAULT_AVATARS[results.length]);
  }

  if (results.every((r, i) => r === DEFAULT_AVATARS[i])) source = 'default';

  console.log(`[ImageGen] Done. source=${source} generated=${results.filter(r=>r.startsWith('data:image/png')).length}/4`);
  return { caricatures: results.slice(0, 4), source, errors };
};

export const getDefaultCaricatures = () => [...DEFAULT_AVATARS];