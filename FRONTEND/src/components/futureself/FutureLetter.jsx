/**
 * components/futureself/FutureLetter.jsx
 * Renders the AI-generated letter with a typewriter reveal effect.
 */
import { useState, useEffect } from 'react';

export default function FutureLetter({ letter, avatarDescription }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Trigger reveal animation after a short delay
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, [letter]);

  return (
    <div className="relative">
      {/* Decorative quote mark */}
      <div
        className="absolute -top-4 -left-2 text-8xl font-display text-gold/8 select-none pointer-events-none leading-none"
        aria-hidden
      >
        "
      </div>

      <div
        className="rounded-2xl border border-gold/15 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f1520 0%, #161d2e 60%, #12180a 100%)' }}
      >
        {/* Letter header */}
        <div className="px-6 pt-5 pb-4 border-b border-gold/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20
                          flex items-center justify-center text-gold text-sm">
            ✉
          </div>
          <div>
            <p className="text-gold/80 text-xs font-body font-medium">A Letter From Your Future Self</p>
            <p className="text-muted text-[10px] font-body">Written at age 60 · For you, right now</p>
          </div>
        </div>

        {/* Avatar description */}
        {avatarDescription && (
          <div className="px-6 py-3 border-b border-gold/10 bg-gold/5">
            <p className="text-gold/70 text-xs font-body italic leading-relaxed">
              📍 {avatarDescription}
            </p>
          </div>
        )}

        {/* Letter body */}
        <div className="px-6 py-5">
          <p
            className={`
              text-text-secondary font-body text-sm leading-relaxed whitespace-pre-line
              transition-all duration-700
              ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
            `}
          >
            {letter}
          </p>

          <div className={`
            mt-5 pt-4 border-t border-gold/10 flex items-center justify-end gap-2
            transition-all duration-700 delay-300
            ${revealed ? 'opacity-100' : 'opacity-0'}
          `}>
            <div className="w-px h-6 bg-gold/20" />
            <p className="text-gold text-sm font-body font-medium italic">— Future You</p>
          </div>
        </div>
      </div>
    </div>
  );
}