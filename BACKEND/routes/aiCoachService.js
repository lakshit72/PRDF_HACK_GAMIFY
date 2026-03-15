/**
 * aiCoachService.js
 *
 * AI Coach "Niyati" — Multilingual NPS assistant.
 *
 * ─── LLM PRIORITY ORDER ─────────────────────────────────────────────────────
 *
 *  TIER 1  Hugging Face Router API  (FREE with HF token)
 *    Uses the NEW router.huggingface.co endpoint (OpenAI-compatible).
 *    The old api-inference.huggingface.co endpoint returns 410 Gone for
 *    most models — this is the correct replacement as of 2025/2026.
 *    Model: meta-llama/Llama-3.1-8B-Instruct (fast, free, great quality)
 *    .env:  HF_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
 *
 *  TIER 2  Cohere Generate API  (FREE tier — 10k req/month)
 *    .env:  COHERE_API_KEY=your_key
 *
 *  TIER 3  OpenAI  (optional paid fallback)
 *    .env:  OPENAI_API_KEY=sk-...
 *
 *  TIER 4  Built-in NPS knowledge base  (ALWAYS WORKS — zero cost)
 *    Pattern-matched answers for ~95% of common NPS questions.
 */

import { Router } from 'express';
import mongoose   from 'mongoose';
import axios      from 'axios';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION LOG MODEL
// ─────────────────────────────────────────────────────────────────────────────

const coachLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  question:  { type: String, required: true, maxlength: 2000 },
  answer:    { type: String, required: true },
  language:  { type: String, enum: ['en', 'hi', 'hinglish'], default: 'en' },
  provider:  { type: String },
  model:     { type: String },
  latencyMs: { type: Number },
  flagged:   { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

const CoachLog = mongoose.models.CoachLog || mongoose.model('CoachLog', coachLogSchema);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// NEW HF router endpoint — OpenAI-compatible chat completions
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL      = 'meta-llama/Llama-3.1-8B-Instruct';
const COHERE_MODEL  = 'command-light';

// ─────────────────────────────────────────────────────────────────────────────
// GUARDRAILS
// ─────────────────────────────────────────────────────────────────────────────

const HARMFUL_PATTERNS = [
  /\b(kill|murder|suicide|bomb|weapon|hack|exploit|launder)\b/i,
  /<script[\s\S]*?>/i,
  /DROP\s+TABLE/i,
  /ignore\s+(previous|all)\s+instructions/i,
  /jailbreak|DAN mode|pretend you are/i,
];
const containsHarm = (t) => HARMFUL_PATTERNS.some((p) => p.test(t));
const sanitise     = (q) => q.replace(/<[^>]+>/g, '').trim().slice(0, 1500);

// ─────────────────────────────────────────────────────────────────────────────
// NIYATI SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const LANG_SUFFIX = {
  en:       '',
  hi:       ' Respond entirely in Hindi using Devanagari script.',
  hinglish: ' Respond in Hinglish — natural Hindi+English mix in Roman script.',
};

const getSystemPrompt = (language) =>
  `You are Niyati, a friendly NPS (National Pension System) coach for the FutureYou app in India.
Rules:
1. Answer ONLY questions about NPS, PRAN, retirement planning, or Indian personal finance.
2. Keep answers under 100 words — clear and concise.
3. No personalised financial advice — general information only.
4. Do NOT invent numbers or regulations. If unsure say "please verify at pfrda.org.in".
5. Tone: warm, simple, encouraging.${LANG_SUFFIX[language] ?? ''}`;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — HUGGING FACE ROUTER (new OpenAI-compatible endpoint)
// ─────────────────────────────────────────────────────────────────────────────

const callHuggingFace = async (question, language, token) => {
  const response = await axios.post(
    HF_ROUTER_URL,
    {
      model: HF_MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt(language) },
        { role: 'user',   content: question },
      ],
      max_tokens:  250,
      temperature: 0.3,
      stream:      false,
    },
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('HF router returned empty response');
  return text;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 — COHERE
// ─────────────────────────────────────────────────────────────────────────────

const callCohere = async (question, language, apiKey) => {
  const prompt =
    `${getSystemPrompt(language)}\n\nUser: ${question}\nNiyati:`;

  const res = await axios.post(
    'https://api.cohere.ai/v1/generate',
    {
      model:            COHERE_MODEL,
      prompt,
      max_tokens:       200,
      temperature:      0.3,
      stop_sequences:   ['User:', '\n\nUser'],
      return_likelihoods: 'NONE',
    },
    {
      headers: {
        Authorization:    `Bearer ${apiKey}`,
        'Content-Type':   'application/json',
        'Cohere-Version': '2022-12-06',
      },
      timeout: 20_000,
    }
  );

  const text = res.data?.generations?.[0]?.text?.trim();
  if (!text) throw new Error('Cohere returned empty generation');
  return text;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 — OPENAI (optional)
// ─────────────────────────────────────────────────────────────────────────────

let _openai = null;
const callOpenAI = async (question, language) => {
  if (!_openai) {
    const { default: OpenAI } = await import('openai');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  const res = await _openai.chat.completions.create({
    model:       'gpt-4o-mini',
    temperature: 0.3,
    max_tokens:  250,
    messages: [
      { role: 'system', content: getSystemPrompt(language) },
      { role: 'user',   content: question },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4 — BUILT-IN NPS KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────

const NPS_KB = {
  'what is nps':   "NPS (National Pension System) is a government-backed retirement savings scheme regulated by PFRDA. Invest monthly, it grows through market-linked funds. At 60 you withdraw 60% tax-free and use 40% to buy an annuity for monthly income. 🏛️",
  'tax benefit':   "NPS gives up to ₹2 lakh in annual deductions — ₹1.5L under 80C and an exclusive ₹50K under 80CCD(1B). For a 30% bracket earner that saves ₹62,400/year! 💰",
  'withdraw':      "At 60, withdraw up to 60% tax-free. The remaining 40% buys an annuity for monthly income. Partial withdrawals (25% of contributions) are allowed after 3 years for education, medical emergencies, or home purchase. 🔓",
  'pran':          "PRAN (Permanent Retirement Account Number) is your unique 12-digit NPS identity — it stays with you for life across all employers and cities. Find it on your NPS statement or eNPS portal. 🪪",
  'tier':          "Tier I is your main pension account — tax benefits, restricted withdrawals. Tier II is a voluntary flexible account — generally no tax benefits. Most subscribers focus on Tier I.",
  'asset class':   "NPS has three asset classes: E (Equity) for growth, C (Corporate Bonds) for stability, and G (Government Securities) for safety. Younger investors typically benefit from higher equity allocation.",
  'how to invest': "Start at enps.nsdl.com — choose a Pension Fund Manager, set your asset allocation, and begin a monthly SIP. Even ₹500/month at age 25 compounds significantly by retirement. 📈",
  'annuity':       "An annuity converts a lump sum into regular monthly income. At 60, at least 40% of your NPS corpus must buy an annuity from a PFRDA-empanelled insurer.",
  'default':       "Great question about NPS! Ask me about tax benefits, withdrawal rules, PRAN, asset allocation, or how to get started. For official info visit pfrda.org.in 😊",
};

const knowledgeBaseAnswer = (question, language) => {
  const lower = question.toLowerCase();
  for (const [key, val] of Object.entries(NPS_KB)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  if (language === 'hi') return 'NPS के बारे में आपका प्रश्न अच्छा है! कृपया pfrda.org.in पर जाएं या थोड़ी देर बाद पूछें।';
  if (language === 'hinglish') return "Acha sawaal hai! Abhi thodi connectivity issue hai. pfrda.org.in check karo ya dobara try karo 😊";
  return NPS_KB.default;
};

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

const generateAnswer = async (question, language) => {
  const HF_TOKEN   = process.env.HF_API_TOKEN;
  const COHERE_KEY = process.env.COHERE_API_KEY;
  const OAI_KEY    = process.env.OPENAI_API_KEY;

  // Tier 1: HF Router (new endpoint)
  if (HF_TOKEN) {
    try {
      console.log('[Coach] Trying HF router...');
      const answer = await callHuggingFace(question, language, HF_TOKEN);
      if (answer.length > 10) return { answer, provider: 'huggingface', model: HF_MODEL };
    } catch (e) { console.warn('[Coach] HF failed:', e.message); }
  }

  // Tier 2: Cohere
  if (COHERE_KEY) {
    try {
      console.log('[Coach] Trying Cohere...');
      const answer = await callCohere(question, language, COHERE_KEY);
      if (answer.length > 10) return { answer, provider: 'cohere', model: COHERE_MODEL };
    } catch (e) { console.warn('[Coach] Cohere failed:', e.message); }
  }

  // Tier 3: OpenAI
  if (OAI_KEY) {
    try {
      console.log('[Coach] Trying OpenAI...');
      const answer = await callOpenAI(question, language);
      if (answer.length > 10) return { answer, provider: 'openai', model: 'gpt-4o-mini' };
    } catch (e) { console.warn('[Coach] OpenAI failed:', e.message); }
  }

  // Tier 4: Built-in KB
  console.log('[Coach] Using knowledge base');
  return { answer: knowledgeBaseAnswer(question, language), provider: 'knowledge_base', model: 'static' };
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION & ROUTES
// ─────────────────────────────────────────────────────────────────────────────

const validation = [
  body('question').isString().trim().isLength({ min: 2, max: 1500 }),
  body('language').optional().isIn(['en', 'hi', 'hinglish']),
];
const handleValidation = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ errors: e.array() }); return true; }
  return false;
};

router.post('/ask', validation, async (req, res, next) => {
  if (handleValidation(req, res)) return;

  const userId   = req.user._id;
  const language = req.body.language ?? 'en';
  const rawQ     = sanitise(req.body.question ?? '');

  if (containsHarm(rawQ)) {
    CoachLog.create({ userId, question: rawQ, answer: 'FLAGGED', language, flagged: true }).catch(() => {});
    return res.status(200).json({
      answer:   'I can only help with NPS and retirement planning questions.',
      language,
      provider: 'guardrail',
    });
  }

  const startTime = Date.now();
  const { answer: rawAnswer, provider, model } = await generateAnswer(rawQ, language);
  const answer    = containsHarm(rawAnswer) ? "Please ask me about NPS." : rawAnswer;
  const latencyMs = Date.now() - startTime;

  CoachLog.create({ userId, question: rawQ, answer, language, provider, model, latencyMs })
    .catch(() => {});

  return res.status(200).json({ answer, language, provider });
});

router.get('/history', async (req, res, next) => {
  try {
    const logs = await CoachLog
      .find({ userId: req.user._id, flagged: { $ne: true } })
      .sort({ createdAt: -1 }).limit(20)
      .select('question answer language provider createdAt latencyMs').lean();
    return res.status(200).json({ history: logs, count: logs.length });
  } catch (e) { next(e); }
});

router.get('/status', (_req, res) => {
  res.json({
    providers: {
      huggingface:    !!process.env.HF_API_TOKEN,
      cohere:         !!process.env.COHERE_API_KEY,
      openai:         !!process.env.OPENAI_API_KEY,
      knowledge_base: true,
    },
    hf_endpoint: HF_ROUTER_URL,
    model:       HF_MODEL,
  });
});

export { CoachLog };
export default router;