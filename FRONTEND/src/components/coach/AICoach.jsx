/**
 * components/coach/AICoach.jsx
 *
 * AI Coach chat interface — floating bubble + slide-up panel.
 *
 * Features:
 *  - Floating action button with unread badge
 *  - Slide-up chat panel (mobile-native feel)
 *  - Suggested prompt chips
 *  - Language toggle (English / Hindi / Hinglish)
 *  - Typing indicator (3-dot pulse)
 *  - Message bubbles with timestamps
 *  - Mock AI responses with NPS knowledge (falls back gracefully if /api/coach/ask fails)
 *  - Local conversation state (not persisted)
 *
 * Usage: Drop <AICoach /> anywhere in the app tree — it self-positions.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api.js';

// ── Mock AI responses (used as fallback) ─────────────────────────────────────
const MOCK_RESPONSES = {
  en: {
    default: "Great question! NPS (National Pension System) is one of India's most tax-efficient retirement tools. Would you like to know about tax benefits, withdrawal rules, or how to maximise your corpus?",
    'what is nps':          "NPS stands for National Pension System — a government-backed retirement savings scheme regulated by PFRDA. You invest monthly, your corpus grows over time, and at 60 you can withdraw 60% tax-free and use 40% to buy an annuity for regular income. 🏛️",
    'tax benefits':         "NPS gives you up to ₹2 lakh in deductions! ₹1.5L under Section 80C and an exclusive additional ₹50,000 under Section 80CCD(1B) — that's over and above the 80C limit. For someone in the 30% tax bracket, that saves up to ₹62,400/year! 💰",
    'withdrawal':           "At 60, you can withdraw up to 60% of your corpus as a lump sum — completely tax-free! The remaining 40% goes into an annuity for monthly income. You can also make partial withdrawals after 3 years for specific needs like education or medical emergencies. 🔓",
    'how to invest':        "Start simple: open an NPS Tier I account via your bank or the eNPS portal. Choose a Pension Fund Manager, pick your asset allocation (I'd suggest more equity when you're young!), and set up a monthly SIP. Even ₹2,000/month at 25 can grow to over ₹1 crore by 60! 📈",
    'asset allocation':     "NPS offers three asset classes: E (Equity) for growth, C (Corporate Bonds) for stability, and G (Govt Securities) for safety. At a younger age, going heavier on E makes sense — the Aggressive Lifecycle Fund auto-manages this for you. ⚖️",
    'pran':                 "PRAN (Permanent Retirement Account Number) is your unique 12-digit NPS identity. It stays with you for life, travels across employers and cities, and links all your NPS contributions. Think of it as your pension passport! 🪪",
    'tier 1 vs tier 2':     "Tier I is your primary pension account — tax benefits, restricted withdrawals, long-term focus. Tier II is a voluntary savings account — no tax benefits generally, but completely flexible withdrawals. Most people focus on Tier I for retirement. 📊",
  },
  hi: {
    default: "बढ़िया सवाल! NPS (राष्ट्रीय पेंशन प्रणाली) भारत के सबसे कर-कुशल सेवानिवृत्ति उपकरणों में से एक है। क्या आप कर लाभ, निकासी नियम, या अपने कॉर्पस को अधिकतम करने के बारे में जानना चाहते हैं?",
    'what is nps':          "NPS यानी राष्ट्रीय पेंशन प्रणाली — PFRDA द्वारा नियंत्रित एक सरकारी सेवानिवृत्ति बचत योजना। आप मासिक निवेश करते हैं, 60 साल पर 60% कर-मुक्त निकाल सकते हैं! 🏛️",
    'tax benefits':         "NPS में ₹2 लाख तक की कटौती मिलती है! 80C में ₹1.5 लाख और 80CCD(1B) में अतिरिक्त ₹50,000। 30% टैक्स ब्रैकेट में यह ₹62,400/साल की बचत है! 💰",
  },
  hinglish: {
    default: "Bilkul sahi question! NPS ek ekdum solid retirement tool hai — tax bhi bachta hai, aur retirement ke liye bhi best hai. Kya aap tax benefits, withdrawal rules, ya corpus maximize karne ke baare mein jaanna chahte ho?",
    'what is nps':          "Yaar, NPS matlab National Pension System — government-backed retirement plan hai jo PFRDA regulate karta hai. Monthly invest karo, 60 saal par 60% tax-free nikaalo. Simple aur powerful! 🏛️",
    'tax benefits':         "NPS se 2 lakh tak deduction milta hai bhai! 1.5L 80C mein, aur exclusive 50K 80CCD(1B) mein. 30% bracket mein ho toh 62,400 rupaye ka direct tax bachta hai har saal! 💰",
  },
};

const SUGGESTED_PROMPTS = [
  { id: 'what-is-nps',  label: 'What is NPS?',         query: 'what is nps'          },
  { id: 'tax',          label: '💰 Tax Benefits',       query: 'tax benefits'         },
  { id: 'withdrawal',   label: '🔓 Withdrawal Rules',   query: 'withdrawal'           },
  { id: 'invest',       label: '📈 How to invest?',     query: 'how to invest'        },
  { id: 'allocation',   label: '⚖️ Asset Allocation',   query: 'asset allocation'     },
  { id: 'pran',         label: '🪪 What is PRAN?',      query: 'pran'                 },
  { id: 'tiers',        label: '📊 Tier I vs Tier II',  query: 'tier 1 vs tier 2'     },
];

const LANG_OPTIONS = [
  { id: 'en',       label: 'EN',        name: 'English'   },
  { id: 'hi',       label: 'हि',        name: 'Hindi'     },
  { id: 'hinglish', label: 'HG',        name: 'Hinglish'  },
];

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold to-ember flex items-center justify-center text-xs text-ink font-bold shrink-0">
        🤖
      </div>
      <div className="bg-surface-2 border border-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const time   = new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex items-end gap-2 animate-fade-up ${isUser ? 'justify-end' : 'justify-start'}`}
         style={{ animationDuration: '0.2s' }}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold to-ember flex items-center justify-center text-xs text-ink font-bold shrink-0 mb-1">
          🤖
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm font-body leading-relaxed ${
            isUser
              ? 'bg-gold text-ink rounded-br-sm font-medium'
              : 'bg-surface-2 border border-border text-text-primary rounded-bl-sm'
          }`}
        >
          {msg.content}
        </div>
        <p className="text-[10px] text-muted font-mono px-1">{time}</p>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs shrink-0 mb-1">
          👤
        </div>
      )}
    </div>
  );
}

// ── Get mock or real response ─────────────────────────────────────────────────
async function getResponse(text, lang) {
  // Try real API first
  try {
    const { data } = await api.post('/coach/ask', { message: text, language: lang });
    return data.response ?? data.message ?? data.answer ?? 'I received your question!';
  } catch {
    // Fallback to mock responses
    const lower   = text.toLowerCase().trim();
    const bank    = MOCK_RESPONSES[lang] ?? MOCK_RESPONSES.en;
    const matched = Object.entries(bank).find(([key]) => key !== 'default' && lower.includes(key));
    return matched ? matched[1] : bank.default;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AICoach() {
  const [open,     setOpen]    = useState(false);
  const [messages, setMessages]= useState([
    {
      id:      'welcome',
      role:    'assistant',
      content: "Hi! I'm your NPS Coach 🤖 Ask me anything about the National Pension System — tax benefits, withdrawals, how to invest, and more!",
      ts:      Date.now(),
    },
  ]);
  const [input,    setInput]   = useState('');
  const [typing,   setTyping]  = useState(false);
  const [lang,     setLang]    = useState('en');
  const [unread,   setUnread]  = useState(0);
  const messagesEndRef         = useRef(null);
  const inputRef               = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { if (open) scrollToBottom(); }, [messages, open, scrollToBottom]);
  useEffect(() => { if (open) { inputRef.current?.focus(); setUnread(0); } }, [open]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate realistic typing delay
    const delay = 600 + Math.random() * 800;
    await new Promise(r => setTimeout(r, delay));

    const response = await getResponse(trimmed, lang);
    setTyping(false);

    const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: response, ts: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    if (!open) setUnread(prev => prev + 1);
  }, [lang, open]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        {/* Pulse hint for first open */}
        {!open && (
          <div
            className="bg-surface border border-border rounded-2xl px-3 py-2 text-xs font-body text-text-secondary
                       shadow-xl animate-fade-up pointer-events-none"
            style={{ animationDelay: '1s' }}
          >
            Ask your NPS Coach ✨
          </div>
        )}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center
                     active:scale-95 transition-all duration-200 relative"
          style={{ background: 'linear-gradient(135deg, #f5c542 0%, #ff6b35 100%)' }}
          aria-label="Open AI Coach"
        >
          <span className="text-2xl">{open ? '✕' : '🤖'}</span>
          {unread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-ink
                            flex items-center justify-center text-[10px] font-mono font-bold text-white">
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
          transition-all duration-350 ease-out
          ${open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full sm:translate-y-8 opacity-0 pointer-events-none'}
        `}
        style={{ maxHeight: '85dvh' }}
      >
        <div className="flex flex-col bg-ink border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden h-full"
             style={{ maxHeight: '75dvh' }}>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0"
            style={{ background: 'linear-gradient(135deg, #0f1520 0%, #161d2e 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-ember
                              flex items-center justify-center text-base shadow-lg">
                🤖
              </div>
              <div>
                <p className="font-display font-bold text-sm text-text-primary">NPS Coach</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse-slow" />
                  <p className="text-muted text-[10px] font-body">Online · Powered by AI</p>
                </div>
              </div>
            </div>

            {/* Language selector */}
            <div className="flex gap-1">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLang(opt.id)}
                  className={`
                    w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all duration-150
                    ${lang === opt.id
                      ? 'bg-gold/20 border border-gold/40 text-gold'
                      : 'bg-surface-2 border border-border text-muted hover:text-text-secondary'
                    }
                  `}
                  title={opt.name}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {typing && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => sendMessage(p.query)}
                  disabled={typing}
                  className="shrink-0 text-[11px] font-body px-2.5 py-1.5 rounded-full border
                             border-border bg-surface-2 text-text-secondary
                             hover:border-gold/30 hover:text-gold transition-all duration-150
                             disabled:opacity-40"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-4 shrink-0 border-t border-border pt-2">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about NPS…"
                rows={1}
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5
                           text-text-primary text-sm font-body placeholder-muted
                           focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                           transition-all duration-200 resize-none"
                style={{ maxHeight: '100px', overflowY: 'auto' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || typing}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                           transition-all duration-200 active:scale-90 disabled:opacity-40"
                style={{ background: input.trim() ? 'linear-gradient(135deg, #f5c542, #ff6b35)' : '#1e2740' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                     style={{ color: input.trim() ? '#0b0f1a' : '#64748b' }}>
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="text-muted text-[10px] font-body text-center mt-1.5">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}