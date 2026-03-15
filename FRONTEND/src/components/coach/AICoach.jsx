/**
 * components/coach/AICoach.jsx
 *
 * AI Coach "Niyati" — floating chat widget with:
 *   • Personal caricature avatar (from user's uploaded photo)
 *   • Avatar animation: cycles through caricatures while bot is typing
 *   • Thought bubble showing the last bot response (or typing dots)
 *   • Full chat history in a slide-up panel
 *   • Language switcher (EN / HI / HG)
 *   • Suggested prompt chips
 *   • Graceful fallback to default SVG avatar when no caricatures exist
 *
 * Usage: <AICoach /> — drop anywhere, self-positions fixed bottom-right.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api         from '../../services/api.js';

// ── Default avatar (shown when user has no caricatures) ───────────────────────
// Inline SVG data URL — no file needed, always works
const DEFAULT_AVATAR = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="48" fill="#001F4D" stroke="#F47920" stroke-width="3"/>
  <ellipse cx="50" cy="58" rx="22" ry="26" fill="#FDBF7B"/>
  <path d="M28 44 Q28 20 50 18 Q72 20 72 44 L68 40 Q62 22 50 20 Q38 22 32 40 Z" fill="#B0BEC5"/>
  <ellipse cx="42" cy="50" rx="4" ry="3" fill="#5D4037"/>
  <ellipse cx="58" cy="50" rx="4" ry="3" fill="#5D4037"/>
  <path d="M40 62 Q50 70 60 62" stroke="#8B4513" stroke-width="2" fill="none" stroke-linecap="round"/>
  <text x="50" y="96" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#F47920" font-weight="bold">Niyati</text>
</svg>`)}`;

// ── Mock responses (used when API is unavailable) ─────────────────────────────
const MOCK = {
  'what is nps':    "NPS (National Pension System) is a government-backed retirement savings scheme regulated by PFRDA. Invest monthly, withdraw 60% tax-free at 60, and convert 40% to an annuity for monthly income. 🏛️",
  'tax':            "NPS gives ₹2 lakh in deductions — ₹1.5L under 80C and ₹50K exclusively under 80CCD(1B). That's up to ₹62,400 saved per year for a 30% bracket earner! 💰",
  'withdraw':       "At 60, withdraw up to 60% tax-free. The remaining 40% buys an annuity. Partial withdrawals (25% of your contributions) are allowed after 3 years for education, medical, or home purchase. 🔓",
  'pran':           "PRAN is your 12-digit Permanent Retirement Account Number — it's yours for life across all employers and cities. Find it on your NPS statement or eNPS portal. 🪪",
  'default':        "Great question! I'm Niyati, your NPS coach. Ask me about tax benefits, withdrawal rules, PRAN, asset allocation, or how to get started with NPS. 😊",
};

const getMockResponse = (text) => {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(MOCK)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  return MOCK.default;
};

// ── Suggested prompts ─────────────────────────────────────────────────────────
const PROMPTS = [
  { label: 'What is NPS?',      query: 'What is NPS?' },
  { label: '💰 Tax Benefits',   query: 'What are the tax benefits of NPS?' },
  { label: '🔓 Withdrawals',    query: 'When can I withdraw from NPS?' },
  { label: '📈 How to start?',  query: 'How do I start investing in NPS?' },
  { label: '🪪 What is PRAN?',  query: 'What is PRAN?' },
];

const LANG_OPTIONS = [
  { id: 'en',       label: 'EN' },
  { id: 'hi',       label: 'हि' },
  { id: 'hinglish', label: 'HG' },
];

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gold inline-block animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  );
}

// ── Thought bubble ────────────────────────────────────────────────────────────
function ThoughtBubble({ text, isTyping }) {
  return (
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-20 w-56">
      <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-card">
        {isTyping ? (
          <TypingDots />
        ) : (
          <p className="text-ink text-xs font-body leading-relaxed line-clamp-3">
            {text}
          </p>
        )}
        {/* Arrow pointing down to avatar */}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft:  '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop:   '8px solid white',
            filter:      'drop-shadow(0 1px 0 #C8D6E8)',
          }}
        />
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-up`}
         style={{ animationDuration: '0.2s' }}>
      <div className={`
        max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed
        ${isUser
          ? 'bg-gold text-ink rounded-br-sm font-medium'
          : 'bg-surface-2 border border-border text-ink rounded-bl-sm'
        }
      `}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AICoach() {
  const { user } = useAuth();

  // Caricatures from user profile (set after photo upload)
  const caricatures = user?.caricatures?.length ? user.caricatures : [DEFAULT_AVATAR];

  const [open,          setOpen]          = useState(false);
  const [messages,      setMessages]      = useState([
    {
      id:      'welcome',
      role:    'assistant',
      content: "Hi! I'm Niyati, your NPS coach 👋 Ask me anything about the National Pension System!",
    },
  ]);
  const [input,         setInput]         = useState('');
  const [isTyping,      setIsTyping]      = useState(false);
  const [lang,          setLang]          = useState('en');
  const [unread,        setUnread]        = useState(0);
  const [avatarIndex,   setAvatarIndex]   = useState(0);
  const [lastBotMsg,    setLastBotMsg]    = useState(
    "Hi! I'm Niyati, your NPS coach 👋 Ask me anything about NPS!"
  );

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // ── Avatar cycling animation ──────────────────────────────────────────────
  // Cycles through caricatures every 300ms while bot is typing.
  // Cleared immediately when isTyping becomes false.
  useEffect(() => {
    let interval;
    if (isTyping && caricatures.length > 1) {
      interval = setInterval(() => {
        setAvatarIndex(prev => (prev + 1) % caricatures.length);
      }, 300);
    } else {
      // Settle on the first caricature when done typing
      setAvatarIndex(0);
    }
    return () => clearInterval(interval);
  }, [isTyping, caricatures]);

  // ── Auto-scroll messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) { inputRef.current?.focus(); setUnread(0); }
  }, [open]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Minimum visible typing delay so animation plays
    const delay = 500 + Math.random() * 600;
    await new Promise(r => setTimeout(r, delay));

    let response;
    try {
      const { data } = await api.post('/coach/ask', {
        question: trimmed,
        language: lang,
      });
      response = data.answer ?? getMockResponse(trimmed);
    } catch {
      response = getMockResponse(trimmed);
    }

    setIsTyping(false);
    const botMsg = { id: Date.now() + 1, role: 'assistant', content: response };
    setMessages(prev => [...prev, botMsg]);
    setLastBotMsg(response);
    if (!open) setUnread(prev => prev + 1);
  }, [lang, isTyping, open]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const currentAvatar = caricatures[avatarIndex] ?? DEFAULT_AVATAR;

  return (
    <>
      {/* ── Floating button with thought bubble ── */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        {/* Thought bubble — always visible when panel is closed */}
        {!open && (
          <div className="relative mb-1">
            <ThoughtBubble text={lastBotMsg} isTyping={isTyping} />
          </div>
        )}

        {/* Avatar button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="relative w-16 h-16 rounded-full shadow-2xl overflow-hidden
                     ring-4 ring-gold/50 active:scale-95 transition-all duration-200
                     hover:ring-gold focus:outline-none"
          aria-label="Open AI Coach"
          style={{
            // Spin border effect while typing
            animation: isTyping ? 'spin 2s linear infinite' : 'none',
            background: isTyping
              ? 'conic-gradient(#F47920, #001F4D, #F47920)'
              : 'transparent',
            padding: isTyping ? '3px' : '0',
          }}
        >
          <img
            src={currentAvatar}
            alt="Niyati — NPS Coach"
            className="w-full h-full rounded-full object-cover bg-surface-2"
            onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
          />
          {unread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500
                            border-2 border-white flex items-center justify-center
                            text-[10px] font-mono font-bold text-white z-10">
              {unread}
            </div>
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      <div
        className={`
          fixed inset-x-0 bottom-0 z-50 flex flex-col
          sm:inset-x-auto sm:right-4 sm:bottom-24 sm:w-96
          transition-all duration-300 ease-out origin-bottom-right
          ${open
            ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
          }
        `}
        style={{ maxHeight: '85dvh' }}
      >
        <div className="flex flex-col bg-white border border-border rounded-t-3xl sm:rounded-3xl
                        shadow-2xl overflow-hidden"
             style={{ maxHeight: '75dvh' }}>

          {/* Panel header — avatar + name + lang switcher */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0
                          bg-gradient-to-r from-ink to-ink-2">
            {/* Avatar */}
            <div className={`
              w-10 h-10 rounded-full overflow-hidden border-2 shrink-0
              ${isTyping ? 'border-gold animate-pulse' : 'border-gold/50'}
            `}>
              <img
                src={currentAvatar}
                alt="Niyati"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-white">Niyati</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-gold animate-pulse' : 'bg-sage'}`} />
                <p className="text-white/50 text-[10px] font-body">
                  {isTyping ? 'Thinking...' : 'NPS Coach · Online'}
                </p>
              </div>
            </div>

            {/* Language picker */}
            <div className="flex gap-1">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLang(opt.id)}
                  className={`
                    w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all duration-150
                    ${lang === opt.id
                      ? 'bg-gold/20 border border-gold/50 text-gold'
                      : 'bg-white/10 border border-white/20 text-white/60 hover:text-white'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white text-xl leading-none ml-1"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-surface-2/30">
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-gold/30 shrink-0">
                  <img src={currentAvatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}
          <div className="px-3 pb-2 shrink-0 bg-white">
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.query)}
                  disabled={isTyping}
                  className="shrink-0 text-[11px] font-body px-2.5 py-1.5 rounded-full border
                             border-border bg-surface-2 text-text-secondary
                             hover:border-gold/40 hover:text-gold transition-all duration-150
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-4 pt-2 border-t border-border shrink-0 bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about NPS..."
                rows={1}
                disabled={isTyping}
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5
                           text-ink text-sm font-body placeholder-muted
                           focus:outline-none focus:border-frost/50 focus:ring-1 focus:ring-frost/20
                           transition-all duration-200 resize-none disabled:opacity-50"
                style={{ maxHeight: '80px', overflowY: 'auto' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                           transition-all duration-200 active:scale-90 disabled:opacity-40"
                style={{
                  background: input.trim() && !isTyping ? '#F47920' : '#E8EEF5',
                }}
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !isTyping ? 'white' : '#94a3b8'} strokeWidth="2.5"
                >
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-muted text-[10px] font-body text-center mt-1.5">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}