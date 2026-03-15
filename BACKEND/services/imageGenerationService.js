/**
 * services/imageGenerationService.js
 *
 * Generates 4 FULL-BODY pose images of the user's future self (age 60).
 * Each pose maps to a specific conversational state in the AI Coach:
 *
 *   [0] IDLE    — standing upright, waving warmly   → default / greeting
 *   [1] THINKING — leaning forward, finger to chin   → bot is processing
 *   [2] TALKING  — arms open, mid-explanation        → bot is responding
 *   [3] HAPPY    — arms raised, celebrating          → after answering
 *
 * Style reference: 3D Pixar-like cartoon grandpa — warm Indian skin,
 * silver swept-back hair, white moustache, kurta. Full body on white bg.
 *
 * The uploaded user photo is used to anchor skin tone and face shape
 * but we generate text-to-image (FLUX.1-schnell) since img2img is
 * not available on the free HF router tier.
 */

import axios  from 'axios';
import { Buffer } from 'buffer';

const HF_TXT2IMG_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';

// ── Pose-specific prompt builder ──────────────────────────────────────────────
// Each prompt produces a FULL-BODY illustration in a distinct pose.
// Consistent character description across all 4 ensures visual coherence.

const CHARACTER_BASE =
  'full body illustration, elderly Indian person at age 60, ' +
  'warm medium-brown skin tone, silver swept-back hair, ' +
  'neat white moustache, kind expressive eyes with laugh lines, ' +
  'wearing a colourful kurta and comfortable trousers, ' +
  '3D cartoon style like Pixar or Disney, smooth shading, ' +
  'clean pure white background, full body visible from head to toe, ' +
  'soft warm studio lighting, friendly approachable character';

const NEGATIVE =
  'deformed, ugly, extra limbs, floating limbs, bad anatomy, ' +
  'text, watermark, cropped, partial body, face only, portrait only';

const POSE_PROMPTS = [
  // [0] IDLE — waving
  `${CHARACTER_BASE}, standing upright confidently, one hand raised in a friendly wave, ` +
  `warm smile, relaxed posture, welcoming gesture, standing pose`,

  // [1] THINKING — leaning forward, finger to chin
  `${CHARACTER_BASE}, leaning slightly forward with interest, one finger raised to chin ` +
  `in thoughtful pose, eyebrows gently raised, contemplative expression, curious pose`,

  // [2] TALKING / EXPLAINING — arms open
  `${CHARACTER_BASE}, both arms open wide in an explanatory gesture, mouth open mid-speech, ` +
  `animated expression, enthusiastic talking pose, engaging and expressive`,

  // [3] HAPPY / CELEBRATING — arms raised
  `${CHARACTER_BASE}, both arms raised up in joyful celebration, big wide smile, ` +
  `eyes sparkling with happiness, triumphant celebratory pose, energy and joy`,
];

// ── Full-body SVG fallbacks ───────────────────────────────────────────────────
// Used when HF fails. Full-body SVG characters with the same 4 poses.
// Styled like the 3D grandpa reference: warm skin, silver hair, kurta.

const makeFallbackSVG = (pose) => {
  const svgs = {
    idle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300" width="160" height="300">
  <defs>
    <radialGradient id="skin" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFF9F0"/><stop offset="100%" stop-color="#FFE0B2"/></radialGradient>
  </defs>
  <!-- Background circle -->
  <ellipse cx="80" cy="155" rx="75" ry="140" fill="url(#bg)" opacity="0.4"/>
  <!-- Legs -->
  <rect x="52" y="210" width="22" height="70" rx="11" fill="#5D4037"/>
  <rect x="86" y="210" width="22" height="70" rx="11" fill="#5D4037"/>
  <!-- Feet -->
  <ellipse cx="63" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <ellipse cx="97" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <!-- Kurta body -->
  <rect x="38" y="130" width="84" height="88" rx="16" fill="#2E7D32"/>
  <!-- Kurta details -->
  <line x1="80" y1="140" x2="80" y2="215" stroke="#1B5E20" stroke-width="2" stroke-dasharray="4,3"/>
  <ellipse cx="80" cy="145" rx="6" ry="8" fill="#1B5E20" opacity="0.5"/>
  <!-- Left arm (body side, relaxed) -->
  <rect x="22" y="132" width="18" height="55" rx="9" fill="#2E7D32"/>
  <ellipse cx="31" cy="188" rx="12" ry="10" fill="url(#skin)"/>
  <!-- Right arm RAISED — waving -->
  <g transform="rotate(-55, 122, 140)">
    <rect x="120" y="132" width="18" height="48" rx="9" fill="#2E7D32"/>
  </g>
  <!-- Waving hand -->
  <ellipse cx="126" cy="90" rx="13" ry="11" fill="url(#skin)"/>
  <rect x="122" y="78" width="6" height="16" rx="3" fill="url(#skin)"/>
  <rect x="129" y="76" width="6" height="17" rx="3" fill="url(#skin)"/>
  <rect x="136" y="79" width="5" height="15" rx="2.5" fill="url(#skin)"/>
  <!-- Neck -->
  <rect x="68" y="110" width="24" height="22" rx="9" fill="url(#skin)"/>
  <!-- Head -->
  <ellipse cx="80" cy="78" rx="42" ry="46" fill="url(#skin)"/>
  <!-- Silver hair -->
  <ellipse cx="80" cy="40" rx="40" ry="20" fill="#B0BEC5"/>
  <path d="M40 55 Q44 28 65 24 Q80 19 95 24 Q116 28 120 55 Q108 38 80 35 Q52 38 40 55Z" fill="#CFD8DC"/>
  <!-- Hair detail lines -->
  <path d="M50 42 Q65 36 80 37 Q95 36 110 42" stroke="#90A4AE" stroke-width="1.5" fill="none"/>
  <!-- Ears -->
  <ellipse cx="38" cy="82" rx="9" ry="12" fill="#D4845A"/>
  <ellipse cx="122" cy="82" rx="9" ry="12" fill="#D4845A"/>
  <!-- Eyebrows -->
  <path d="M55 64 Q65 60 73 63" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M87 63 Q95 60 105 64" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Eyes -->
  <ellipse cx="64" cy="76" rx="10" ry="9" fill="white"/>
  <ellipse cx="96" cy="76" rx="10" ry="9" fill="white"/>
  <circle cx="64" cy="77" r="6" fill="#4E342E"/>
  <circle cx="96" cy="77" r="6" fill="#4E342E"/>
  <circle cx="64" cy="77" r="3.5" fill="#1A1A1A"/>
  <circle cx="96" cy="77" r="3.5" fill="#1A1A1A"/>
  <circle cx="66" cy="75" r="1.5" fill="white"/>
  <circle cx="98" cy="75" r="1.5" fill="white"/>
  <!-- Laugh lines -->
  <path d="M50 72 Q46 79 48 86" stroke="#B5774A" stroke-width="1.2" fill="none" opacity="0.5"/>
  <path d="M110 72 Q114 79 112 86" stroke="#B5774A" stroke-width="1.2" fill="none" opacity="0.5"/>
  <!-- Nose -->
  <ellipse cx="80" cy="90" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
  <!-- White moustache -->
  <path d="M65 102 Q72 99 80 101 Q88 99 95 102" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M68 105 Q74 102 80 104 Q86 102 92 105" stroke="#CFD8DC" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Warm smile -->
  <path d="M62 112 Q80 126 98 112" stroke="#8D4E20" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Wave emoji hint -->
  <text x="130" y="72" font-size="18">👋</text>
</svg>`,

    thinking: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300" width="160" height="300">
  <defs>
    <radialGradient id="skin" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient>
  </defs>
  <!-- Legs — slight lean forward -->
  <rect x="52" y="215" width="22" height="65" rx="11" fill="#5D4037" transform="rotate(3,63,248)"/>
  <rect x="86" y="215" width="22" height="65" rx="11" fill="#5D4037" transform="rotate(-3,97,248)"/>
  <ellipse cx="63" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <ellipse cx="97" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <!-- Kurta — slight forward lean -->
  <rect x="36" y="132" width="84" height="88" rx="16" fill="#1565C0" transform="rotate(2,78,176)"/>
  <line x1="78" y1="142" x2="78" y2="217" stroke="#0D47A1" stroke-width="2" stroke-dasharray="4,3"/>
  <!-- Left arm (hanging) -->
  <rect x="20" y="135" width="18" height="50" rx="9" fill="#1565C0" transform="rotate(5,29,160)"/>
  <ellipse cx="28" cy="186" rx="12" ry="10" fill="url(#skin)"/>
  <!-- Right arm RAISED — finger to chin -->
  <g transform="rotate(-80,122,140)">
    <rect x="120" y="132" width="18" height="46" rx="9" fill="#1565C0"/>
  </g>
  <!-- Hand at chin -->
  <ellipse cx="96" cy="108" rx="11" ry="10" fill="url(#skin)"/>
  <!-- Pointing finger -->
  <rect x="93" y="92" width="7" height="18" rx="3.5" fill="url(#skin)"/>
  <!-- Neck -->
  <rect x="68" y="112" width="24" height="22" rx="9" fill="url(#skin)"/>
  <!-- Head — slight tilt forward -->
  <ellipse cx="80" cy="80" rx="42" ry="46" fill="url(#skin)" transform="rotate(5,80,80)"/>
  <!-- Silver hair -->
  <ellipse cx="80" cy="42" rx="40" ry="20" fill="#90A4AE"/>
  <path d="M40 57 Q44 30 65 26 Q80 21 95 26 Q116 30 120 57 Q108 40 80 37 Q52 40 40 57Z" fill="#B0BEC5"/>
  <!-- Ears -->
  <ellipse cx="38" cy="84" rx="9" ry="12" fill="#D4845A"/>
  <ellipse cx="122" cy="84" rx="9" ry="12" fill="#D4845A"/>
  <!-- Eyebrows — raised, curious -->
  <path d="M53 66 Q63 60 72 64" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M86 64 Q95 60 106 66" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Eyes — wide, looking up-right -->
  <ellipse cx="63" cy="78" rx="11" ry="10" fill="white"/>
  <ellipse cx="96" cy="78" rx="11" ry="10" fill="white"/>
  <circle cx="65" cy="77" r="6.5" fill="#4E342E"/>
  <circle cx="98" cy="77" r="6.5" fill="#4E342E"/>
  <circle cx="65" cy="77" r="3.5" fill="#1A1A1A"/>
  <circle cx="98" cy="77" r="3.5" fill="#1A1A1A"/>
  <circle cx="67" cy="75" r="1.5" fill="white"/>
  <circle cx="100" cy="75" r="1.5" fill="white"/>
  <!-- Nose -->
  <ellipse cx="80" cy="92" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
  <!-- Moustache -->
  <path d="M65 104 Q72 101 80 103 Q88 101 95 104" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Thoughtful mouth — slight pursed smile -->
  <path d="M68 115 Q80 119 92 115" stroke="#8D4E20" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Question bubble -->
  <circle cx="118" cy="38" r="18" fill="#FFF9F0" stroke="#F47920" stroke-width="2.5"/>
  <text x="110" y="45" font-size="18" fill="#F47920" font-weight="bold">?</text>
  <!-- Thinking dots -->
  <circle cx="108" cy="60" r="3" fill="#F47920" opacity="0.5"/>
  <circle cx="113" cy="54" r="4" fill="#F47920" opacity="0.35"/>
  <circle cx="119" cy="46" r="5" fill="#F47920" opacity="0.2"/>
</svg>`,

    talking: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
  <defs>
    <radialGradient id="skin" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient>
  </defs>
  <!-- Legs -->
  <rect x="72" y="212" width="22" height="68" rx="11" fill="#5D4037"/>
  <rect x="106" y="212" width="22" height="68" rx="11" fill="#5D4037"/>
  <ellipse cx="83" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <ellipse cx="117" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <!-- Kurta body -->
  <rect x="56" y="130" width="88" height="90" rx="16" fill="#F47920"/>
  <line x1="100" y1="140" x2="100" y2="217" stroke="#E65100" stroke-width="2" stroke-dasharray="4,3"/>
  <!-- LEFT arm WIDE open -->
  <rect x="16" y="136" width="42" height="18" rx="9" fill="#F47920"/>
  <ellipse cx="14" cy="145" rx="13" ry="11" fill="url(#skin)"/>
  <!-- Left hand fingers spread -->
  <rect x="4"  y="132" width="6" height="14" rx="3" fill="url(#skin)" transform="rotate(-15,7,139)"/>
  <rect x="10" y="130" width="6" height="15" rx="3" fill="url(#skin)" transform="rotate(-5,13,137)"/>
  <rect x="17" y="131" width="6" height="14" rx="3" fill="url(#skin)" transform="rotate(5,20,138)"/>
  <rect x="23" y="133" width="5" height="12" rx="2.5" fill="url(#skin)" transform="rotate(15,25,139)"/>
  <!-- RIGHT arm WIDE open -->
  <rect x="142" y="136" width="42" height="18" rx="9" fill="#F47920"/>
  <ellipse cx="186" cy="145" rx="13" ry="11" fill="url(#skin)"/>
  <!-- Right hand fingers spread -->
  <rect x="179" y="132" width="6" height="14" rx="3" fill="url(#skin)" transform="rotate(15,182,139)"/>
  <rect x="173" y="130" width="6" height="15" rx="3" fill="url(#skin)" transform="rotate(5,176,137)"/>
  <rect x="166" y="131" width="6" height="14" rx="3" fill="url(#skin)" transform="rotate(-5,169,138)"/>
  <rect x="160" y="133" width="5" height="12" rx="2.5" fill="url(#skin)" transform="rotate(-15,162,139)"/>
  <!-- Neck -->
  <rect x="88" y="110" width="24" height="22" rx="9" fill="url(#skin)"/>
  <!-- Head -->
  <ellipse cx="100" cy="78" rx="42" ry="46" fill="url(#skin)"/>
  <!-- Silver hair -->
  <ellipse cx="100" cy="40" rx="40" ry="20" fill="#B0BEC5"/>
  <path d="M60 55 Q64 28 85 24 Q100 19 115 24 Q136 28 140 55 Q128 38 100 35 Q72 38 60 55Z" fill="#CFD8DC"/>
  <!-- Ears -->
  <ellipse cx="58" cy="82" rx="9" ry="12" fill="#D4845A"/>
  <ellipse cx="142" cy="82" rx="9" ry="12" fill="#D4845A"/>
  <!-- Eyebrows — animated/raised -->
  <path d="M72 62 Q83 57 91 61" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M108 61 Q116 57 128 62" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Eyes — wide animated -->
  <ellipse cx="82" cy="76" rx="11" ry="10" fill="white"/>
  <ellipse cx="118" cy="76" rx="11" ry="10" fill="white"/>
  <circle cx="82" cy="77" r="6.5" fill="#4E342E"/>
  <circle cx="118" cy="77" r="6.5" fill="#4E342E"/>
  <circle cx="82" cy="77" r="3.5" fill="#1A1A1A"/>
  <circle cx="118" cy="77" r="3.5" fill="#1A1A1A"/>
  <circle cx="84" cy="75" r="1.5" fill="white"/>
  <circle cx="120" cy="75" r="1.5" fill="white"/>
  <!-- Nose -->
  <ellipse cx="100" cy="90" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
  <!-- Moustache -->
  <path d="M84 102 Q92 99 100 101 Q108 99 116 102" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Open talking mouth -->
  <ellipse cx="100" cy="114" rx="12" ry="9" fill="#8D4E20"/>
  <ellipse cx="100" cy="112" rx="8" ry="5" fill="#FF8A65" opacity="0.7"/>
  <!-- Speech dots -->
  <circle cx="150" cy="44" r="4" fill="#FFF" stroke="#F47920" stroke-width="1.5"/>
  <circle cx="158" cy="32" r="6" fill="#FFF" stroke="#F47920" stroke-width="1.5"/>
  <circle cx="166" cy="20" r="8" fill="#FFF" stroke="#F47920" stroke-width="1.5"/>
  <text x="160" y="25" text-anchor="middle" font-size="10" fill="#F47920">💬</text>
</svg>`,

    happy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 310" width="180" height="310">
  <defs>
    <radialGradient id="skin" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient>
  </defs>
  <!-- Legs — slight bounce stance -->
  <rect x="62" y="215" width="22" height="68" rx="11" fill="#5D4037" transform="rotate(-4,73,249)"/>
  <rect x="96" y="215" width="22" height="68" rx="11" fill="#5D4037" transform="rotate(4,107,249)"/>
  <ellipse cx="72" cy="283" rx="14" ry="8" fill="#4E342E"/>
  <ellipse cx="108" cy="283" rx="14" ry="8" fill="#4E342E"/>
  <!-- Kurta -->
  <rect x="46" y="132" width="88" height="90" rx="16" fill="#6A1B9A"/>
  <line x1="90" y1="142" x2="90" y2="219" stroke="#4A148C" stroke-width="2" stroke-dasharray="4,3"/>
  <!-- LEFT arm RAISED UP -->
  <g transform="rotate(-140,46,140)">
    <rect x="28" y="132" width="18" height="52" rx="9" fill="#6A1B9A"/>
  </g>
  <ellipse cx="22" cy="82" rx="13" ry="11" fill="url(#skin)"/>
  <rect x="17" y="66" width="7" height="17" rx="3.5" fill="url(#skin)" transform="rotate(-15,20,74)"/>
  <rect x="24" y="64" width="7" height="18" rx="3.5" fill="url(#skin)"/>
  <rect x="31" y="66" width="6" height="16" rx="3" fill="url(#skin)" transform="rotate(15,34,74)"/>
  <!-- RIGHT arm RAISED UP -->
  <g transform="rotate(140,134,140)">
    <rect x="134" y="132" width="18" height="52" rx="9" fill="#6A1B9A"/>
  </g>
  <ellipse cx="158" cy="82" rx="13" ry="11" fill="url(#skin)"/>
  <rect x="152" y="66" width="7" height="17" rx="3.5" fill="url(#skin)" transform="rotate(15,155,74)"/>
  <rect x="159" y="64" width="7" height="18" rx="3.5" fill="url(#skin)"/>
  <rect x="166" y="66" width="6" height="16" rx="3" fill="url(#skin)" transform="rotate(-15,169,74)"/>
  <!-- Neck -->
  <rect x="78" y="112" width="24" height="22" rx="9" fill="url(#skin)"/>
  <!-- Head -->
  <ellipse cx="90" cy="80" rx="42" ry="46" fill="url(#skin)"/>
  <!-- Silver hair -->
  <ellipse cx="90" cy="42" rx="40" ry="20" fill="#B0BEC5"/>
  <path d="M50 57 Q54 30 75 26 Q90 21 105 26 Q126 30 130 57 Q118 40 90 37 Q62 40 50 57Z" fill="#CFD8DC"/>
  <!-- Ears -->
  <ellipse cx="48" cy="84" rx="9" ry="12" fill="#D4845A"/>
  <ellipse cx="132" cy="84" rx="9" ry="12" fill="#D4845A"/>
  <!-- Eyebrows — squinting happy -->
  <path d="M60 67 Q71 62 79 66" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M99 66 Q107 62 120 67" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Happy squinting eyes — arched -->
  <path d="M60 80 Q70 72 80 80" stroke="#4E342E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M100 80 Q110 72 120 80" stroke="#4E342E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Rosy cheeks -->
  <ellipse cx="58" cy="92" rx="12" ry="8" fill="#EF9A9A" opacity="0.5"/>
  <ellipse cx="122" cy="92" rx="12" ry="8" fill="#EF9A9A" opacity="0.5"/>
  <!-- Nose -->
  <ellipse cx="90" cy="92" rx="7" ry="5" fill="#C07050" opacity="0.7"/>
  <!-- Moustache -->
  <path d="M74 104 Q81 101 90 103 Q99 101 106 104" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Big happy smile -->
  <path d="M66 116 Q90 138 114 116" stroke="#8D4E20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M66 116 Q90 136 114 116 Q114 120 90 132 Q66 120 66 116Z" fill="#FFCCAA" opacity="0.35"/>
  <!-- Stars -->
  <text x="4"  y="70" font-size="16">⭐</text>
  <text x="152" y="65" font-size="16">⭐</text>
  <text x="78"  y="20" font-size="14">✨</text>
</svg>`,
  };

  const s = svgs[pose];
  return `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;
};

const DEFAULT_AVATARS = [
  makeFallbackSVG('idle'),
  makeFallbackSVG('thinking'),
  makeFallbackSVG('talking'),
  makeFallbackSVG('happy'),
];

// ── HF generation ─────────────────────────────────────────────────────────────
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

  // Remove white/near-white background using sharp so the avatar
  // blends seamlessly into any page background on the frontend.
  // Strategy: convert to RGBA, then set pixels with high lightness
  // (R>230 && G>230 && B>230) to fully transparent.
  let pngBuffer = Buffer.from(response.data);
  try {
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(pngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data.buffer);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      // Remove white and near-white background pixels
      if (r > 230 && g > 230 && b > 230) {
        pixels[i + 3] = 0; // fully transparent
      } else if (r > 200 && g > 200 && b > 200) {
        // Semi-transparent for soft edges (anti-aliasing)
        pixels[i + 3] = Math.round(((255 - r) + (255 - g) + (255 - b)) / 3 * 4);
      }
    }

    pngBuffer = await sharp(Buffer.from(pixels.buffer), {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toBuffer();
  } catch (sharpErr) {
    // sharp not available — return original, CSS mix-blend-mode handles blending
    console.warn('[ImageGen] sharp not available for bg removal:', sharpErr.message);
  }

  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
};

// ── Public API ────────────────────────────────────────────────────────────────
export const generateCaricatures = async (imageBuffer, userProfile = {}) => {
  const HF_TOKEN = process.env.HF_API_TOKEN;
  const results  = [];
  const errors   = [];
  let   source   = 'default';

  console.log(`[ImageGen] Starting pose generation. HF=${!!HF_TOKEN}`);

  if (HF_TOKEN) {
    const poses = ['idle', 'thinking', 'talking', 'happy'];
    for (let i = 0; i < POSE_PROMPTS.length; i++) {
      try {
        console.log(`[HF] Generating pose ${i + 1}/4 (${poses[i]})...`);
        const dataUrl = await generateViaHFRouter(POSE_PROMPTS[i], HF_TOKEN);
        results.push(dataUrl);
        source = 'huggingface';
      } catch (err) {
        console.warn(`[HF] Pose ${i + 1} failed: ${err.message}`);
        errors.push(err.message);
      }
    }
  }

  // Fill gaps with SVG fallbacks
  while (results.length < 4) {
    results.push(DEFAULT_AVATARS[results.length]);
  }
  if (results.every((_, i) => results[i] === DEFAULT_AVATARS[i])) source = 'default';

  console.log(`[ImageGen] Done. source=${source} count=${results.length}`);
  return { caricatures: results.slice(0, 4), source, errors };
};

export const getDefaultCaricatures = () => [...DEFAULT_AVATARS];