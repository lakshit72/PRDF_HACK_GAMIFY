/**
 * components/coach/AICoach.jsx
 *
 * - Avatar floats/sways with CSS animation (idle = gentle float, talking = nod, happy = bounce)
 * - Thought bubble above avatar, scrollable text, centered, current response only
 * - Input bar sits BELOW the avatar at the very bottom
 * - No typing dots — cloud is empty/cursor while waiting
 * - Fully responsive: scales from 14" laptops (~1366px) to 24"+ monitors
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth }     from '../../context/AuthContext.jsx';
import { useLocation } from 'react-router-dom';
import api              from '../../services/api.js';

const POSE_IDLE     = 0;
const POSE_THINKING = 1;
const POSE_TALKING  = 2;
const POSE_HAPPY    = 3;

const FALLBACK = [
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300"><defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs><rect x="52" y="210" width="22" height="70" rx="11" fill="#5D4037"/><rect x="86" y="210" width="22" height="70" rx="11" fill="#5D4037"/><ellipse cx="63" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="97" cy="280" rx="14" ry="8" fill="#4E342E"/><rect x="38" y="128" width="84" height="90" rx="16" fill="#2E7D32"/><rect x="22" y="132" width="18" height="55" rx="9" fill="#2E7D32"/><ellipse cx="31" cy="188" rx="12" ry="10" fill="url(#s)"/><g transform="rotate(-55,122,138)"><rect x="120" y="130" width="18" height="48" rx="9" fill="#2E7D32"/></g><ellipse cx="127" cy="88" rx="13" ry="11" fill="url(#s)"/><rect x="123" y="76" width="6" height="15" rx="3" fill="url(#s)"/><rect x="130" y="74" width="6" height="16" rx="3" fill="url(#s)"/><rect x="137" y="77" width="5" height="14" rx="2.5" fill="url(#s)"/><rect x="68" y="108" width="24" height="22" rx="9" fill="url(#s)"/><ellipse cx="80" cy="76" rx="42" ry="46" fill="url(#s)"/><ellipse cx="80" cy="38" rx="40" ry="20" fill="#B0BEC5"/><path d="M40 53Q44 26 65 22Q80 17 95 22Q116 26 120 53Q108 36 80 33Q52 36 40 53Z" fill="#CFD8DC"/><ellipse cx="38" cy="80" rx="9" ry="12" fill="#D4845A"/><ellipse cx="122" cy="80" rx="9" ry="12" fill="#D4845A"/><path d="M55 62Q65 58 73 61" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M87 61Q95 58 105 62" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="64" cy="74" rx="10" ry="9" fill="white"/><ellipse cx="96" cy="74" rx="10" ry="9" fill="white"/><circle cx="64" cy="75" r="6" fill="#4E342E"/><circle cx="96" cy="75" r="6" fill="#4E342E"/><circle cx="64" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="96" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="66" cy="73" r="1.5" fill="white"/><circle cx="98" cy="73" r="1.5" fill="white"/><ellipse cx="80" cy="88" rx="7" ry="5" fill="#C07050" opacity="0.7"/><path d="M65 100Q72 97 80 99Q88 97 95 100" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M62 110Q80 124 98 110" stroke="#8D4E20" stroke-width="2" fill="none" stroke-linecap="round"/><text x="130" y="70" font-size="18">👋</text></svg>`)}`,
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300"><defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs><rect x="52" y="215" width="22" height="65" rx="11" fill="#5D4037"/><rect x="86" y="215" width="22" height="65" rx="11" fill="#5D4037"/><ellipse cx="63" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="97" cy="280" rx="14" ry="8" fill="#4E342E"/><rect x="36" y="130" width="84" height="90" rx="16" fill="#1565C0"/><rect x="20" y="135" width="18" height="50" rx="9" fill="#1565C0"/><ellipse cx="28" cy="186" rx="12" ry="10" fill="url(#s)"/><g transform="rotate(-80,122,138)"><rect x="120" y="130" width="18" height="46" rx="9" fill="#1565C0"/></g><ellipse cx="96" cy="106" rx="11" ry="10" fill="url(#s)"/><rect x="93" y="90" width="7" height="18" rx="3.5" fill="url(#s)"/><rect x="68" y="110" width="24" height="22" rx="9" fill="url(#s)"/><ellipse cx="80" cy="78" rx="42" ry="46" fill="url(#s)"/><ellipse cx="80" cy="40" rx="40" ry="20" fill="#90A4AE"/><path d="M40 55Q44 28 65 24Q80 19 95 24Q116 28 120 55Q108 38 80 35Q52 38 40 55Z" fill="#B0BEC5"/><ellipse cx="38" cy="82" rx="9" ry="12" fill="#D4845A"/><ellipse cx="122" cy="82" rx="9" ry="12" fill="#D4845A"/><path d="M53 64Q63 58 72 62" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M86 62Q95 58 106 64" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="63" cy="76" rx="11" ry="10" fill="white"/><ellipse cx="96" cy="76" rx="11" ry="10" fill="white"/><circle cx="65" cy="75" r="6.5" fill="#4E342E"/><circle cx="98" cy="75" r="6.5" fill="#4E342E"/><circle cx="65" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="98" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="67" cy="73" r="1.5" fill="white"/><circle cx="100" cy="73" r="1.5" fill="white"/><ellipse cx="80" cy="90" rx="7" ry="5" fill="#C07050" opacity="0.7"/><path d="M65 102Q72 99 80 101Q88 99 95 102" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M68 113Q80 117 92 113" stroke="#8D4E20" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="116" cy="36" r="16" fill="white" stroke="#F47920" stroke-width="2"/><text x="109" y="43" font-size="16" fill="#F47920" font-weight="bold">?</text></svg>`)}`,
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs><rect x="72" y="212" width="22" height="68" rx="11" fill="#5D4037"/><rect x="106" y="212" width="22" height="68" rx="11" fill="#5D4037"/><ellipse cx="83" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="117" cy="280" rx="14" ry="8" fill="#4E342E"/><rect x="56" y="128" width="88" height="92" rx="16" fill="#F47920"/><rect x="14" y="134" width="44" height="18" rx="9" fill="#F47920"/><ellipse cx="12" cy="143" rx="14" ry="12" fill="url(#s)"/><rect x="142" y="134" width="44" height="18" rx="9" fill="#F47920"/><ellipse cx="188" cy="143" rx="14" ry="12" fill="url(#s)"/><rect x="88" y="108" width="24" height="22" rx="9" fill="url(#s)"/><ellipse cx="100" cy="76" rx="42" ry="46" fill="url(#s)"/><ellipse cx="100" cy="38" rx="40" ry="20" fill="#B0BEC5"/><path d="M60 53Q64 26 85 22Q100 17 115 22Q136 26 140 53Q128 36 100 33Q72 36 60 53Z" fill="#CFD8DC"/><ellipse cx="58" cy="80" rx="9" ry="12" fill="#D4845A"/><ellipse cx="142" cy="80" rx="9" ry="12" fill="#D4845A"/><path d="M72 60Q83 55 91 59" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M108 59Q116 55 128 60" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="82" cy="74" rx="11" ry="10" fill="white"/><ellipse cx="118" cy="74" rx="11" ry="10" fill="white"/><circle cx="82" cy="75" r="6.5" fill="#4E342E"/><circle cx="118" cy="75" r="6.5" fill="#4E342E"/><circle cx="82" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="118" cy="75" r="3.5" fill="#1A1A1A"/><circle cx="84" cy="73" r="1.5" fill="white"/><circle cx="120" cy="73" r="1.5" fill="white"/><ellipse cx="100" cy="88" rx="7" ry="5" fill="#C07050" opacity="0.7"/><path d="M84 100Q92 97 100 99Q108 97 116 100" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="100" cy="112" rx="12" ry="9" fill="#8D4E20"/><ellipse cx="100" cy="110" rx="8" ry="5" fill="#FF8A65" opacity="0.7"/></svg>`)}`,
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 310"><defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs><rect x="62" y="215" width="22" height="68" rx="11" fill="#5D4037" transform="rotate(-4,73,249)"/><rect x="96" y="215" width="22" height="68" rx="11" fill="#5D4037" transform="rotate(4,107,249)"/><ellipse cx="72" cy="283" rx="14" ry="8" fill="#4E342E"/><ellipse cx="108" cy="283" rx="14" ry="8" fill="#4E342E"/><rect x="46" y="130" width="88" height="92" rx="16" fill="#6A1B9A"/><g transform="rotate(-140,46,138)"><rect x="28" y="130" width="18" height="52" rx="9" fill="#6A1B9A"/></g><ellipse cx="22" cy="80" rx="13" ry="11" fill="url(#s)"/><g transform="rotate(140,134,138)"><rect x="134" y="130" width="18" height="52" rx="9" fill="#6A1B9A"/></g><ellipse cx="158" cy="80" rx="13" ry="11" fill="url(#s)"/><rect x="78" y="110" width="24" height="22" rx="9" fill="url(#s)"/><ellipse cx="90" cy="78" rx="42" ry="46" fill="url(#s)"/><ellipse cx="90" cy="40" rx="40" ry="20" fill="#B0BEC5"/><path d="M50 55Q54 28 75 24Q90 19 105 24Q126 28 130 55Q118 38 90 35Q62 38 50 55Z" fill="#CFD8DC"/><ellipse cx="48" cy="82" rx="9" ry="12" fill="#D4845A"/><ellipse cx="132" cy="82" rx="9" ry="12" fill="#D4845A"/><path d="M60 65Q71 60 79 64" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M99 64Q107 60 120 65" stroke="#78909C" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 78Q70 70 80 78" stroke="#4E342E" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M100 78Q110 70 120 78" stroke="#4E342E" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="58" cy="90" rx="12" ry="8" fill="#EF9A9A" opacity="0.5"/><ellipse cx="122" cy="90" rx="12" ry="8" fill="#EF9A9A" opacity="0.5"/><ellipse cx="90" cy="90" rx="7" ry="5" fill="#C07050" opacity="0.7"/><path d="M74 102Q81 99 90 101Q99 99 106 102" stroke="#ECEFF1" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M66 114Q90 136 114 114" stroke="#8D4E20" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="4" y="68" font-size="16">⭐</text><text x="152" y="63" font-size="16">⭐</text></svg>`)}`,
];

const LANG_OPTIONS = [
  { id: 'en', label: 'EN' },
  { id: 'hi', label: 'हि' },
  { id: 'hinglish', label: 'HG' },
];

const PROMPTS = [
  { label: 'What is NPS?',    query: 'What is NPS?' },
  { label: '💰 Tax benefits', query: 'What are the tax benefits of NPS?' },
  { label: '🔓 Withdrawals',  query: 'When can I withdraw from NPS?' },
  { label: '📈 How to start', query: 'How do I start investing in NPS?' },
  { label: '🪪 PRAN',         query: 'What is PRAN?' },
];

const DASHBOARD_GREETING =
  "Hello younger me! 👴 I see you're planning your future with NPS again — " +
  "that's exactly what I wish I'd done more of at your age. " +
  "Every contribution you make today is a gift to the version of you standing right here. " +
  "Ask me anything!";

const MOCK = {
  'what is nps':  "Trust me on this — starting NPS was the single best financial decision I made. Government-backed, invest monthly, take 60% tax-free at 60. Start early! 🏛️",
  'tax':          "NPS gives ₹2L in deductions — ₹1.5L under 80C plus ₹50K under 80CCD(1B). Up to ₹62,400 saved per year. I wish I'd maxed this from day one! 💰",
  'withdraw':     "At 60, withdraw 60% completely tax-free. Remaining 40% becomes a monthly annuity. Partial withdrawals allowed after 3 years for emergencies. 🔓",
  'pran':         "PRAN — Permanent Retirement Account Number — travels with you for life. Every job, every city, same number. Guard it well! 🪪",
  'default':      "Great question! Stay consistent with your NPS contributions — that's the one thing I'd tell my younger self. What else would you like to know?",
};
const getMock = (t) => {
  const l = t.toLowerCase();
  for (const [k, v] of Object.entries(MOCK)) if (k !== 'default' && l.includes(k)) return v;
  return MOCK.default;
};

export default function AICoach() {
  const { user }  = useAuth();
  const location  = useLocation();
  const poses     = user?.caricatures?.length >= 4 ? user.caricatures : FALLBACK;

  const [open,        setOpen]        = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [input,       setInput]       = useState('');
  const [typing,      setTyping]      = useState(false);
  const [streaming,   setStreaming]   = useState(false);
  const [lang,        setLang]        = useState('en');
  const [unread,      setUnread]      = useState(0);
  const [poseIdx,     setPoseIdx]     = useState(POSE_IDLE);

  const inputRef     = useRef(null);
  const cloudTextRef = useRef(null);
  const streamingRef = useRef(false);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { if (open) setUnread(0); }, [open]);

  useEffect(() => {
    if (cloudTextRef.current) {
      cloudTextRef.current.scrollTop = cloudTextRef.current.scrollHeight;
    }
  }, [currentText]);

  const streamText = useCallback(async (text) => {
    const words = text.split(' ');
    setCurrentText('');
    for (let i = 0; i < words.length; i++) {
      if (!streamingRef.current) break;
      setCurrentText(words.slice(0, i + 1).join(' '));
      await new Promise(r => setTimeout(r, 50));
    }
  }, []);

  const playGreeting = useCallback(async () => {
    setOpen(true);
    setCurrentText('');
    setPoseIdx(POSE_TALKING);
    setStreaming(true);
    streamingRef.current = true;
    await streamText(DASHBOARD_GREETING);
    streamingRef.current = false;
    setStreaming(false);
    setPoseIdx(POSE_IDLE);
  }, [streamText]);

  const greetCount = useRef(0);

  useEffect(() => {
    if (location.pathname !== '/dashboard') return;
    greetCount.current += 1;
    const id = greetCount.current;
    const t = setTimeout(() => {
      if (greetCount.current !== id) return;
      playGreeting();
    }, 800);
    return () => clearTimeout(t);
  }, [location.pathname, location.key]); // eslint-disable-line

  const sendMessage = useCallback(async (text) => {
    const t = text.trim();
    if (!t || typing || streaming) return;
    setInput('');
    setTyping(true);
    setPoseIdx(POSE_THINKING);
    setCurrentText('…');

    let answer;
    try {
      const { data } = await api.post('/coach/ask', { question: t, language: lang });
      answer = data.answer ?? getMock(t);
    } catch { answer = getMock(t); }

    setTyping(false);
    setPoseIdx(POSE_TALKING);
    setStreaming(true);
    streamingRef.current = true;
    await streamText(answer);
    streamingRef.current = false;
    setStreaming(false);
    setPoseIdx(POSE_HAPPY);
    setTimeout(() => setPoseIdx(POSE_IDLE), 1400);
    if (!open) setUnread(p => p + 1);
  }, [lang, typing, streaming, open, streamText]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const poseSrc = poses[poseIdx] ?? poses[0];
  const busy    = typing || streaming;

  const avatarAnim = {
    [POSE_IDLE]:     'fy-idle',
    [POSE_THINKING]: 'fy-thinking',
    [POSE_TALKING]:  'fy-talking',
    [POSE_HAPPY]:    'fy-happy',
  }[poseIdx] ?? 'fy-idle';

  return (
    <>
      <style>{`
        /* ── Avatar animations ──────────────────────────────────── */
        @keyframes fy-float {
          0%,100% { transform: translateY(0px)   rotate(0deg);   }
          30%     { transform: translateY(-8px)  rotate(0.6deg); }
          60%     { transform: translateY(-5px)  rotate(-0.4deg);}
        }
        @keyframes fy-think {
          0%,100% { transform: translateY(0)    rotate(0deg);    }
          50%     { transform: translateY(-4px) rotate(-2.5deg); }
        }
        @keyframes fy-talk {
          0%,100% { transform: rotate(0deg)    translateY(0);    }
          20%     { transform: rotate(1.8deg)  translateY(-3px); }
          50%     { transform: rotate(-1.5deg) translateY(-5px); }
          75%     { transform: rotate(1.2deg)  translateY(-3px); }
        }
        @keyframes fy-bounce-up {
          0%,100% { transform: translateY(0)    scale(1);    }
          30%     { transform: translateY(-16px) scale(1.04); }
          55%     { transform: translateY(-8px)  scale(1.02); }
          75%     { transform: translateY(-14px) scale(1.03); }
        }

        .fy-idle     { animation: fy-float    3.8s ease-in-out infinite; }
        .fy-thinking { animation: fy-think    2.2s ease-in-out infinite; }
        .fy-talking  { animation: fy-talk     0.7s ease-in-out infinite; }
        .fy-happy    { animation: fy-bounce-up 0.55s ease-in-out infinite; }

        /* ── Cloud entrance ─────────────────────────────────────── */
        @keyframes fy-cloud-in {
          from { opacity:0; transform: scale(0.82) translateY(28px); }
          to   { opacity:1; transform: scale(1)    translateY(0);    }
        }
        .fy-cloud-enter { animation: fy-cloud-in 0.32s cubic-bezier(0.34,1.56,0.64,1); }

        /* ── Scrollbar inside cloud ─────────────────────────────── */
        .fy-cloud-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,31,77,0.15) transparent; }
        .fy-cloud-scroll::-webkit-scrollbar { width: 4px; }
        .fy-cloud-scroll::-webkit-scrollbar-thumb { background: rgba(0,31,77,0.15); border-radius: 4px; }

        /* ── Laptop safety: prevent entire coach from overflowing ── */
        @media (max-height: 768px) {
          .fy-coach-wrap { bottom: 0 !important; }
        }
      `}</style>

      {/*
        ┌─────────────────────────────────────────────────────────────┐
        │  SIZING STRATEGY                                             │
        │  Avatar:    clamp(120px, 18vw, 280px)  ← was 30vw (too big) │
        │  Container: clamp(200px, 22vw, 380px)  ← tighter envelope   │
        │  Cloud:     clamp(180px, 20vw, 340px)  ← proportional       │
        │  All use min/preferred/max so 14" and 24"+ both look right   │
        └─────────────────────────────────────────────────────────────┘
      */}

      {/* Fixed container — anchored bottom-right, scales with viewport */}
      <div
        className="fy-coach-wrap"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          zIndex: 9999,
          /* Container width: 22vw sits comfortably on 1366px (≈300px) and 1920px (≈420px) */
          width: 'clamp(200px, 22vw, 380px)',
          /* Hard cap on total height so panel never overflows on short laptop screens */
          maxHeight: '96vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >

        {/* ── Thought bubble ── */}
        {open && (
          <div
            className="fy-cloud-enter"
            style={{
              /* Cloud: slightly narrower than container so it doesn't clip */
              width: 'clamp(180px, 20vw, 340px)',
              position: 'relative',
              /* Negative margin pulls cloud down to overlap avatar top */
              marginBottom: 'clamp(-14px, -1.5vw, -22px)',
              pointerEvents: 'all',
              flexShrink: 1,
            }}
          >
            {/* Cloud SVG shape */}
            <svg
              viewBox="0 0 520 290"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                display: 'block',
                width: '100%',
                filter: 'drop-shadow(0 6px 22px rgba(0,31,77,0.14))',
                overflow: 'visible',
              }}
            >
              <path
                fill="white" stroke="#C8D6E8" strokeWidth="2"
                d="
                  M 46 228
                  C 18 226  6 204 14 184
                  C -2 172 -4 148 14 134
                  C  0 118  8  94 30  88
                  C 18  62 38  38 66  36
                  C 70   8 96  -8 126   2
                  C 142 -16 174 -22 200  -2
                  C 218 -18 252 -22 276  -2
                  C 296 -16 328 -12 340  10
                  C 364  -2 398   8 406  34
                  C 434  24 458  52 448  80
                  C 474  90 484 120 468 140
                  C 486 158 482 188 462 202
                  C 478 222 468 250 444 256
                  C 432 278 404 290 376 278
                  C 360 298 328 304 304 286
                  C 284 304 250 304 232 286
                  C 210 302 178 300 164 280
                  C 136 294 104 288  92 264
                  C 62 276  40 260  46 238
                  Z
                "
              />
              <circle cx="454" cy="272" r="10"  fill="white" stroke="#C8D6E8" strokeWidth="2"/>
              <circle cx="476" cy="286" r="7"   fill="white" stroke="#C8D6E8" strokeWidth="2"/>
              <circle cx="494" cy="296" r="5"   fill="white" stroke="#C8D6E8" strokeWidth="2"/>
            </svg>

            {/* Text area — absolute over the SVG, scrollable, centered */}
            <div
              ref={cloudTextRef}
              className="fy-cloud-scroll"
              style={{
                position: 'absolute',
                top: '8%', left: '8%', right: '8%', bottom: '18%',
                overflowY: 'auto',
                display: 'flex',
                alignItems: currentText.length < 120 ? 'center' : 'flex-start',
                justifyContent: 'center',
              }}
            >
              <p style={{
                margin: 0,
                width: '100%',
                /* Font scales: 10px on very small, 1.1vw on mid, 14px max */
                fontSize: 'clamp(10px, 1.0vw, 14px)',
                lineHeight: '1.65',
                color: '#001F4D',
                fontFamily: 'inherit',
                textAlign: 'center',
                fontWeight: 400,
              }}>
                {currentText || <span style={{ opacity: 0.2, fontWeight: 700 }}>▍</span>}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              style={{
                position: 'absolute', top: '6%', right: '6%',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#b0bcc8', fontSize: 'clamp(13px, 1.1vw, 17px)', lineHeight: 1,
                padding: '0', fontFamily: 'inherit',
                pointerEvents: 'all',
              }}
            >×</button>
          </div>
        )}

        {/* ── Avatar — animated, clickable ── */}
        <div
          onClick={() => setOpen(v => !v)}
          style={{
            position: 'relative',
            cursor: 'pointer',
            pointerEvents: 'all',
            flexShrink: 0,
          }}
        >
          {unread > 0 && !open && (
            <div style={{
              position: 'absolute', top: '14px', left: '2px', zIndex: 10,
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#E63946',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: '700', color: 'white',
            }}>{unread}</div>
          )}
          <img
            src={poseSrc}
            alt="Your future self"
            className={avatarAnim}
            style={{
              /*
               * KEY FIX — was clamp(180px, 30vw, 600px):
               *   30vw on 1366px = 410px → overflows a 768px-tall laptop screen
               *   18vw on 1366px ≈ 246px → fits perfectly with room for cloud + input
               *   18vw on 1920px ≈ 346px → nice and visible on large monitors
               *   Hard cap at 300px keeps it sane on ultra-wide displays
               */
              width: 'clamp(120px, 18vw, 300px)',
              height: 'auto',
              display: 'block',
              mixBlendMode: 'multiply',
              filter: 'brightness(1.05) contrast(1.08)',
              transformOrigin: 'center bottom',
            }}
            onError={e => { e.currentTarget.src = FALLBACK[POSE_IDLE]; }}
          />
        </div>

        {/* ── Input bar — below the avatar ── */}
        {open && (
          <div style={{
            width: 'clamp(180px, 20vw, 340px)',
            padding: 'clamp(2px, 0.3vh, 4px) 0 clamp(6px, 1vh, 12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(4px, 0.6vh, 7px)',
            pointerEvents: 'all',
            flexShrink: 0,
          }}>

            {/* Lang switcher row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 2px',
            }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%', marginRight: '5px',
                  background: busy ? '#F47920' : '#2E7D32',
                  animation: busy ? 'fy-float 0.6s ease-in-out infinite' : 'none',
                }}/>
                {LANG_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => setLang(o.id)} style={{
                    width: 'clamp(20px, 2vw, 30px)',
                    height: 'clamp(16px, 1.6vw, 22px)',
                    borderRadius: '6px',
                    border: `1.5px solid ${lang === o.id ? '#F47920' : 'rgba(0,31,77,0.2)'}`,
                    background: lang === o.id ? 'rgba(244,121,32,0.1)' : 'rgba(255,255,255,0.8)',
                    color: lang === o.id ? '#F47920' : '#64748b',
                    fontSize: 'clamp(7px, 0.65vw, 9px)',
                    fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            {/* Prompt chips */}
            <div style={{
              display: 'flex', gap: '4px',
              overflowX: 'auto', paddingBottom: '1px',
            }}>
              {PROMPTS.map(p => (
                <button key={p.label} onClick={() => sendMessage(p.query)} disabled={busy}
                  style={{
                    flexShrink: 0,
                    fontSize: 'clamp(7px, 0.75vw, 10px)',
                    fontFamily: 'inherit',
                    padding: 'clamp(2px, 0.3vw, 5px) clamp(5px, 0.7vw, 10px)',
                    borderRadius: '20px',
                    border: '1.5px solid rgba(0,31,77,0.14)',
                    background: 'rgba(255,255,255,0.88)', color: '#001F4D',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap', opacity: busy ? 0.4 : 1,
                    boxShadow: '0 1px 4px rgba(0,31,77,0.07)',
                  }}>{p.label}</button>
              ))}
            </div>

            {/* Text input */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask your future self…"
                rows={1} disabled={busy}
                style={{
                  flex: 1, resize: 'none',
                  border: '1.5px solid rgba(0,31,77,0.18)',
                  borderRadius: '12px',
                  padding: 'clamp(5px, 0.6vw, 9px) clamp(7px, 0.9vw, 12px)',
                  fontSize: 'clamp(10px, 0.9vw, 12px)',
                  fontFamily: 'inherit',
                  color: '#001F4D', background: 'rgba(255,255,255,0.92)',
                  outline: 'none', maxHeight: '70px',
                  overflowY: 'auto', lineHeight: '1.4',
                  opacity: busy ? 0.6 : 1,
                  boxShadow: '0 1px 8px rgba(0,31,77,0.08)',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || busy}
                style={{
                  width: 'clamp(28px, 2.4vw, 36px)',
                  height: 'clamp(28px, 2.4vw, 36px)',
                  borderRadius: '10px',
                  border: 'none', flexShrink: 0,
                  background: input.trim() && !busy ? '#F47920' : '#E2E8F0',
                  cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                  boxShadow: input.trim() && !busy ? '0 2px 10px rgba(244,121,32,0.4)' : 'none',
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !busy ? 'white' : '#94a3b8'} strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {!open && unread === 0 && (
          <div style={{
            marginBottom: '6px', pointerEvents: 'none',
            fontSize: 'clamp(8px, 0.8vw, 10px)', color: 'rgba(0,31,77,0.35)',
            fontFamily: 'inherit', textAlign: 'center',
            width: 'clamp(120px, 18vw, 300px)',
          }}>
            tap to chat
          </div>
        )}
      </div>
    </>
  );
}