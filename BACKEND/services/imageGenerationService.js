/**
 * services/imageGenerationService.js
 *
 * Generates 4 FULL-BODY personalised pose images of the user's future self.
 *
 * HOW PERSONALISATION WORKS:
 * ─────────────────────────────────────────────────────────────────────────────
 * Step 1 — Vision analysis (Llama-3.2-11B-Vision-Instruct via HF router)
 *   The uploaded photo is sent to a vision LLM which returns a JSON description
 *   of the person's physical features: skin tone, hair colour/texture, face shape,
 *   eye colour, build, distinguishing features.
 *
 * Step 2 — Personalised prompt construction
 *   The extracted features are injected into each pose prompt so FLUX.1-schnell
 *   generates a character that actually resembles the user, aged to 60.
 *
 * Step 3 — 4 pose images generated
 *   [0] idle/waving  [1] thinking  [2] talking  [3] happy/celebrating
 *
 * FALLBACK CHAIN:
 *   Vision model unavailable → use default Indian person description
 *   FLUX unavailable → SVG fallback avatars
 */

import axios        from 'axios';
import { Buffer }   from 'buffer';

const HF_ROUTER_BASE  = 'https://router.huggingface.co';
const HF_VISION_MODEL = 'meta-llama/Llama-3.2-11B-Vision-Instruct';
const HF_IMG_URL      = `${HF_ROUTER_BASE}/hf-inference/models/black-forest-labs/FLUX.1-schnell`;
const HF_CHAT_URL     = `${HF_ROUTER_BASE}/v1/chat/completions`;

// ── Step 1: Analyse uploaded photo with vision LLM ───────────────────────────

/**
 * Sends the user's photo to Llama Vision and asks it to describe
 * the physical features needed to personalise the avatar generation.
 * Returns a structured description string or a default fallback.
 */
const analysePhotoFeatures = async (imageBuffer, token) => {
  try {
    const base64Image = imageBuffer.toString('base64');
    const mimeType    = 'image/jpeg';

    const response = await axios.post(
      HF_CHAT_URL,
      {
        model:       HF_VISION_MODEL,
        max_tokens:  200,
        temperature: 0.1,
        messages: [{
          role:    'user',
          content: [
            {
              type:      'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: 'text',
              text: `Look at this person's photo and describe ONLY their physical appearance for an artist to recreate them as an elderly 60-year-old cartoon character. Reply with ONLY a JSON object in this exact format, nothing else:
{
  "skin_tone": "e.g. warm light brown, medium dark brown, fair with olive undertones",
  "hair_desc": "e.g. thick black hair, curly dark brown hair, thin straight hair",
  "face_shape": "e.g. round face, oval face, square jaw",
  "eye_desc": "e.g. dark brown eyes, almond-shaped eyes",
  "build": "e.g. slim, medium build, stocky",
  "notable": "e.g. strong jawline, high cheekbones, prominent nose"
}`,
            },
          ],
        }],
      },
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 25_000,
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content?.trim() ?? '';

    // Extract JSON from response (model may add some text around it)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in vision response');

    const features = JSON.parse(jsonMatch[0]);
    console.log('[ImageGen] Vision analysis:', features);

    return `${features.skin_tone || 'warm medium brown'} skin tone, ` +
           `${features.hair_desc || 'dark hair turning silver'}, ` +
           `${features.face_shape || 'oval face'}, ` +
           `${features.eye_desc || 'warm brown eyes'}, ` +
           `${features.build || 'medium build'}, ` +
           `${features.notable || 'friendly expression'}`;

  } catch (err) {
    console.warn('[ImageGen] Vision analysis failed, using defaults:', err.message);
    // Default description — neutral Indian person
    return 'warm medium-brown skin tone, dark hair with silver streaks, oval face, warm brown eyes, medium build, friendly approachable expression';
  }
};

// ── Step 2: Build personalised prompts ───────────────────────────────────────

const buildPrompts = (featureDesc) => {
  const BASE = `full body illustration, elderly Indian person at age 60, ` +
    `aged version of someone with: ${featureDesc}, ` +
    `silver-grey hair (aged from their natural colour), deep laugh lines, ` +
    `wearing a colourful traditional kurta and comfortable trousers, ` +
    `3D cartoon character style like Pixar or Disney, smooth cel shading, ` +
    `clean pure white background, full body head to toe visible, ` +
    `soft warm studio lighting, warm friendly character design`;

  return [
    // [0] Idle — waving
    `${BASE}, standing upright with confidence, one hand raised in a warm friendly wave, ` +
    `big warm smile showing joy, welcoming gesture, relaxed happy posture`,

    // [1] Thinking — finger to chin
    `${BASE}, leaning slightly forward with curiosity, one finger gently raised to chin, ` +
    `eyebrows slightly raised, thoughtful contemplative expression, wise look`,

    // [2] Talking — arms open
    `${BASE}, both arms spread wide open in an enthusiastic explanatory gesture, ` +
    `mouth open mid-speech, animated excited expression, engaging storyteller pose`,

    // [3] Happy — arms raised
    `${BASE}, both arms raised high in joyful celebration, ` +
    `eyes sparkling with happiness, huge beaming smile, triumphant pose, pure joy`,
  ];
};

// ── Step 3: Generate each image via FLUX ─────────────────────────────────────

const generateViaFlux = async (prompt, token) => {
  const response = await axios.post(
    HF_IMG_URL,
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

  let pngBuffer = Buffer.from(response.data);

  // Remove white/near-white background pixels
  try {
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(pngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data.buffer);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (r > 230 && g > 230 && b > 230) {
        pixels[i + 3] = 0;
      } else if (r > 200 && g > 200 && b > 200) {
        pixels[i + 3] = Math.round(((255 - r) + (255 - g) + (255 - b)) / 3 * 4);
      }
    }
    pngBuffer = await sharp(Buffer.from(pixels.buffer), {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toBuffer();
  } catch (_) {
    // sharp unavailable — return original
  }

  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
};

// ── SVG fallbacks ─────────────────────────────────────────────────────────────

const makeFallbackSVG = (pose) => {
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
  <rect x="123" y="76" width="6" height="15" rx="3" fill="url(#s)"/><rect x="130" y="74" width="6" height="16" rx="3" fill="url(#s)"/><rect x="137" y="77" width="5" height="14" rx="2.5" fill="url(#s)"/>
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
  <text x="130" y="70" font-size="18">👋</text>
</svg>`,
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
  <text x="109" y="43" font-size="16" fill="#F47920" font-weight="bold">?</text>
</svg>`,
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
  <ellipse cx="100" cy="112" rx="12" ry="9" fill="#8D4E20"/><ellipse cx="100" cy="110" rx="8" ry="5" fill="#FF8A65" opacity="0.7"/>
</svg>`,
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
  <text x="4" y="68" font-size="16">⭐</text><text x="152" y="63" font-size="16">⭐</text>
</svg>`,
  };

  const svg = svgs[pose] ?? svgs.idle;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const POSE_KEYS    = ['idle', 'thinking', 'talking', 'happy'];
const DEFAULT_AVATARS = POSE_KEYS.map(makeFallbackSVG);

// ── Public API ────────────────────────────────────────────────────────────────

export const generateCaricatures = async (imageBuffer, userProfile = {}) => {
  const HF_TOKEN = process.env.HF_API_TOKEN;
  const results  = [];
  const errors   = [];
  let   source   = 'default';

  console.log(`[ImageGen] Starting personalised generation. HF=${!!HF_TOKEN}`);

  if (HF_TOKEN) {
    // Step 1: Analyse the uploaded photo to extract personal features
    console.log('[ImageGen] Analysing photo features via vision model...');
    const featureDesc = await analysePhotoFeatures(imageBuffer, HF_TOKEN);
    console.log(`[ImageGen] Features: "${featureDesc.slice(0, 80)}..."`);

    // Step 2: Build personalised prompts
    const prompts = buildPrompts(featureDesc);

    // Step 3: Generate each pose
    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(`[HF] Generating pose ${i + 1}/4 (${POSE_KEYS[i]})...`);
        const dataUrl = await generateViaFlux(prompts[i], HF_TOKEN);
        results.push(dataUrl);
        source = 'huggingface';
      } catch (err) {
        console.warn(`[HF] Pose ${i + 1} failed: ${err.message}`);
        errors.push(err.message);
      }
    }
  }

  // Fill any gaps with SVG defaults
  while (results.length < 4) {
    results.push(DEFAULT_AVATARS[results.length]);
  }

  if (results.every((r, i) => r === DEFAULT_AVATARS[i])) source = 'default';

  console.log(`[ImageGen] Done. source=${source} count=${results.length}`);
  return { caricatures: results.slice(0, 4), source, errors };
};

export const getDefaultCaricatures = () => [...DEFAULT_AVATARS];