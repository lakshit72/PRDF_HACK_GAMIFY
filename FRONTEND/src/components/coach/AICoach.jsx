/**
 * components/coach/AICoach.jsx
 *
 * Redesigned AI Coach:
 *  - Avatar has no background box — blends into the page via CSS mix-blend-mode
 *  - Thought cloud uses an SVG blob shape (no broken icicle divs)
 *  - Bot speaks as "your future self", not Niyati
 *  - Pose switches with conversation state
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api         from '../../services/api.js';

const POSE_IDLE     = 0;
const POSE_THINKING = 1;
const POSE_TALKING  = 2;
const POSE_HAPPY    = 3;

// ── SVG fallback avatars — truly transparent background ──────────────────────
const FALLBACK = [
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300">
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
</svg>`)}`,

  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 300">
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
</svg>`)}`,

  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
  <defs><radialGradient id="s" cx="50%" cy="35%" r="55%"><stop offset="0%" stop-color="#FFCC99"/><stop offset="100%" stop-color="#D4845A"/></radialGradient></defs>
  <rect x="72" y="212" width="22" height="68" rx="11" fill="#5D4037"/><rect x="106" y="212" width="22" height="68" rx="11" fill="#5D4037"/>
  <ellipse cx="83" cy="280" rx="14" ry="8" fill="#4E342E"/><ellipse cx="117" cy="280" rx="14" ry="8" fill="#4E342E"/>
  <rect x="56" y="128" width="88" height="92" rx="16" fill="#F47920"/>
  <rect x="14" y="134" width="44" height="18" rx="9" fill="#F47920"/>
  <ellipse cx="12" cy="143" rx="14" ry="12" fill="url(#s)"/>
  <rect x="142" y="134" width="44" height="18" rx="9" fill="#F47920"/>
  <ellipse cx="188" cy="143" rx="14" ry="12" fill="url(#s)"/>
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
  <ellipse cx="100" cy="112" rx="12" ry="9" fill="#8D4E20"/>
  <ellipse cx="100" cy="110" rx="8" ry="5" fill="#FF8A65" opacity="0.7"/>
</svg>`)}`,

  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 310">
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
</svg>`)}`,
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
  { label: '🪪 What is PRAN', query: 'What is PRAN?' },
];

// Mock responses speak as future self — no "Niyati"
const MOCK = {
  'what is nps':  "Trust me on this — starting NPS was the single best financial decision I made. It's a government-backed retirement scheme where you invest monthly, and at 60 you can take 60% as a tax-free lump sum. The remaining 40% gives you a monthly pension. Start early! 🏛️",
  'tax':          "When I was your age I didn't realise NPS gives ₹2L in deductions — ₹1.5L under 80C plus an exclusive ₹50K under 80CCD(1B). That's up to ₹62,400 saved per year. I wish I'd maximised this from day one! 💰",
  'withdraw':     "At 60, you can withdraw 60% completely tax-free. The remaining 40% goes into an annuity that pays you monthly. You can also make partial withdrawals after 3 years for education or emergencies. 🔓",
  'pran':         "Your PRAN — Permanent Retirement Account Number — travels with you for life. Every job change, every city, same number. Find it on your NPS statement or the eNPS portal. Guard it well! 🪪",
  'default':      "Hello! I'm you — 30 years from now 👴 I built my retirement through NPS and I'm here to guide you. Ask me about tax benefits, withdrawals, how to get started, or anything about NPS!",
};
const getMock = (t) => {
  const l = t.toLowerCase();
  for (const [k,v] of Object.entries(MOCK)) if (k !== 'default' && l.includes(k)) return v;
  return MOCK.default;
};

export default function AICoach() {
  const { user } = useAuth();
  const poses    = user?.caricatures?.length >= 4 ? user.caricatures : FALLBACK;

  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { id: 'w', role: 'bot', text: "Hello! I'm you — 30 years from now 👴 I built my retirement through NPS and I'm here to help. What would you like to know?" }
  ]);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);  // waiting for API response
  const [streaming,setStreaming]= useState(false);  // printing words
  const [lang,     setLang]     = useState('en');
  const [unread,   setUnread]   = useState(0);
  const [poseIdx,  setPoseIdx]  = useState(POSE_IDLE);

  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  // Pose is now driven directly by sendMessage state machine.
  // This effect only resets to idle if typing is force-cleared externally.
  useEffect(() => {
    if (!typing && poseIdx === POSE_THINKING) setPoseIdx(POSE_IDLE);
  }, [typing]); // eslint-disable-line

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) { inputRef.current?.focus(); setUnread(0); }
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const t = text.trim();
    if (!t || typing || streaming) return;
    setMessages(p => [...p, { id: Date.now(), role: 'user', text: t }]);
    setInput('');
    setTyping(true);
    setPoseIdx(POSE_THINKING); // show thinking while waiting for API

    let answer;
    try {
      const { data } = await api.post('/coach/ask', { question: t, language: lang });
      answer = data.answer ?? getMock(t);
    } catch { answer = getMock(t); }

    // Response received — switch to talking and stream word by word
    setTyping(false);
    setPoseIdx(POSE_TALKING);
    setStreaming(true);

    const words = answer.split(' ');
    const msgId = Date.now() + 1;
    setMessages(p => [...p, { id: msgId, role: 'bot', text: '' }]);

    for (let i = 0; i < words.length; i++) {
      setMessages(p => p.map(m =>
        m.id === msgId ? { ...m, text: words.slice(0, i + 1).join(' ') } : m
      ));
      await new Promise(r => setTimeout(r, 55)); // ~55ms per word
    }

    // All words printed — go happy briefly then idle
    setStreaming(false);
    setPoseIdx(POSE_HAPPY);
    setTimeout(() => setPoseIdx(POSE_IDLE), 1200);
    if (!open) setUnread(p => p + 1);
  }, [lang, typing, streaming, open]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const poseSrc = poses[poseIdx] ?? poses[0];

  return (
    <>
      <style>{`
        @keyframes fy-bounce {
          0%,80%,100% { transform: translateY(0); }
          40%          { transform: translateY(-4px); }
        }
        .fy-dot { animation: fy-bounce 0.7s ease-in-out infinite; }
        .fy-cloud-enter { animation: fy-cloud-in 0.2s ease-out; }
        @keyframes fy-cloud-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .fy-scroll::-webkit-scrollbar { width: 3px; }
        .fy-scroll::-webkit-scrollbar-thumb { background: rgba(0,31,77,0.15); border-radius: 4px; }
      `}</style>

      <div style={{
        position: 'fixed', bottom: 0, right: '16px',
        zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      }}>

        {/* ── Thought cloud ── */}
        {open && (
          <div className="fy-cloud-enter" style={{ marginBottom: '4px', width: '300px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '24px',
              border: '2px solid rgba(0,31,77,0.18)',
              boxShadow: '0 8px 32px rgba(0,31,77,0.14), 0 2px 8px rgba(0,31,77,0.08)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>

              {/* Top bar — lang + close */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px 8px',
                borderBottom: '1px solid rgba(0,31,77,0.08)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {/* Pulse dot */}
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: typing ? '#F47920' : '#2E7D32',
                    marginRight: '6px',
                    animation: typing ? 'fy-bounce 0.7s ease-in-out infinite' : 'none',
                  }}/>
                  {LANG_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setLang(o.id)} style={{
                      width: '28px', height: '22px', borderRadius: '6px',
                      border: `1.5px solid ${lang === o.id ? '#F47920' : 'rgba(0,31,77,0.18)'}`,
                      background: lang === o.id ? 'rgba(244,121,32,0.1)' : 'transparent',
                      color: lang === o.id ? '#F47920' : '#64748b',
                      fontSize: '9px', fontWeight: '700', cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{o.label}</button>
                  ))}
                </div>
                <button onClick={() => setOpen(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', fontSize: '20px', lineHeight: 1,
                  padding: '0 2px', fontFamily: 'inherit',
                }}>×</button>
              </div>

              {/* Message list */}
              <div ref={scrollRef} className="fy-scroll" style={{
                overflowY: 'auto', padding: '12px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                minHeight: '140px', maxHeight: '260px',
                flexShrink: 0,
              }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg, #F47920, #E06810)'
                        : 'rgba(0,31,77,0.06)',
                      color: m.role === 'user' ? 'white' : '#001F4D',
                      fontSize: '12.5px', lineHeight: '1.5',
                      fontFamily: 'inherit', wordBreak: 'break-word',
                      border: m.role === 'user' ? 'none' : '1px solid rgba(0,31,77,0.1)',
                    }}>{m.text}</div>
                  </div>
                ))}

                {typing && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                      background: 'rgba(0,31,77,0.06)', border: '1px solid rgba(0,31,77,0.1)',
                      display: 'flex', gap: '4px', alignItems: 'center',
                    }}>
                      {[0,1,2].map(i => (
                        <span key={i} className="fy-dot" style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: '#001F4D', opacity: 0.5,
                          display: 'inline-block',
                          animationDelay: `${i * 150}ms`,
                        }}/>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt chips */}
              <div style={{
                display: 'flex', gap: '5px', padding: '4px 12px 6px',
                overflowX: 'auto', flexShrink: 0,
                borderTop: '1px solid rgba(0,31,77,0.06)',
              }}>
                {PROMPTS.map(p => (
                  <button key={p.label} onClick={() => sendMessage(p.query)} disabled={typing || streaming}
                    style={{
                      flexShrink: 0, fontSize: '10px', fontFamily: 'inherit',
                      padding: '4px 9px', borderRadius: '20px',
                      border: '1.5px solid rgba(0,31,77,0.15)',
                      background: 'white', color: '#001F4D',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      opacity: (typing || streaming) ? 0.4 : 1,
                    }}>{p.label}</button>
                ))}
              </div>

              {/* Input */}
              <div style={{
                display: 'flex', gap: '6px', alignItems: 'flex-end',
                padding: '8px 10px 10px',
                borderTop: '1.5px solid rgba(0,31,77,0.1)',
                background: 'rgba(255,255,255,0.9)',
                flexShrink: 0,
              }}>
                <textarea ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask your future self…"
                  rows={1} disabled={typing || streaming}
                  style={{
                    flex: 1, resize: 'none',
                    border: '1.5px solid rgba(0,31,77,0.18)',
                    borderRadius: '12px', padding: '7px 10px',
                    fontSize: '12px', fontFamily: 'inherit',
                    color: '#001F4D', background: '#F8FAFC',
                    outline: 'none', maxHeight: '70px',
                    overflowY: 'auto', lineHeight: '1.4',
                    opacity: (typing || streaming) ? 0.6 : 1,
                  }}
                />
                <button onClick={() => sendMessage(input)}
                  disabled={!input.trim() || typing || streaming}
                  style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    border: 'none', flexShrink: 0,
                    background: input.trim() && !typing && !streaming ? '#F47920' : '#E2E8F0',
                    cursor: input.trim() && !typing && !streaming ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={input.trim() && !typing && !streaming ? 'white' : '#94a3b8'} strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Connector dots from cloud to avatar */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              paddingRight: '42px', gap: '5px', marginTop: '4px',
              alignItems: 'flex-end',
            }}>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(0,31,77,0.18)', boxShadow: '0 2px 6px rgba(0,31,77,0.1)' }}/>
              <div style={{ width: '7px', height: '7px',  borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(0,31,77,0.18)', boxShadow: '0 2px 4px rgba(0,31,77,0.08)' }}/>
            </div>
          </div>
        )}

        {/* ── Avatar — blends into page background ── */}
        <div
          onClick={() => setOpen(v => !v)}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          {/* Unread badge */}
          {unread > 0 && !open && (
            <div style={{
              position: 'absolute', top: '12px', left: '-2px', zIndex: 10,
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#E63946', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: '700', color: 'white',
            }}>{unread}</div>
          )}

          <img
            src={poseSrc}
            alt="Your future self"
            style={{
              width: '116px',
              height: 'auto',
              display: 'block',
              mixBlendMode: 'multiply',
              filter: poseIdx === POSE_THINKING
                ? 'brightness(1.05) contrast(1.08) drop-shadow(0 0 16px rgba(244,121,32,0.8))'
                : poseIdx === POSE_TALKING
                ? 'brightness(1.05) contrast(1.08) drop-shadow(0 0 12px rgba(21,101,192,0.6))'
                : poseIdx === POSE_HAPPY
                ? 'brightness(1.05) contrast(1.08) drop-shadow(0 0 14px rgba(46,125,50,0.6))'
                : 'brightness(1.05) contrast(1.08) drop-shadow(0 3px 12px rgba(0,31,77,0.18))',
              transition: 'filter 0.35s ease, transform 0.15s ease',
              transform: open ? 'scale(0.94)' : 'scale(1)',
              cursor: 'pointer',
            }}
            onError={e => { e.currentTarget.src = FALLBACK[POSE_IDLE]; }}
          />
        </div>
      </div>
    </>
  );
}