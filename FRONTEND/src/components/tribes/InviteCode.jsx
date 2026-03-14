/**
 * components/tribes/InviteCode.jsx
 * Displays the tribe invite code with a copy-to-clipboard button and tooltip feedback.
 */
import { useState, useCallback } from 'react';

export default function InviteCode({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const el = document.createElement('textarea');
      el.value = code;
      el.style.position = 'fixed';
      el.style.opacity  = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="flex items-center gap-2">
      {/* Code display */}
      <div
        className="flex-1 flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 py-2.5"
      >
        <span className="text-muted text-[10px] font-body uppercase tracking-wide shrink-0">
          Invite Code
        </span>
        <span className="font-mono font-bold text-gold text-base tracking-[0.2em] flex-1 text-center">
          {code}
        </span>
      </div>

      {/* Copy button with tooltip */}
      <div className="relative">
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-3 py-2.5 rounded-xl border font-body text-xs
            transition-all duration-200 font-medium
            ${copied
              ? 'border-sage/40 bg-sage/10 text-sage'
              : 'border-border bg-surface-2 text-text-secondary hover:border-gold/30 hover:text-gold'
            }
          `}
          title={copied ? 'Copied!' : 'Copy invite code'}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </>
          )}
        </button>

        {/* Tooltip pop */}
        {copied && (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg
                       bg-sage/90 text-ink text-[10px] font-mono font-bold whitespace-nowrap
                       animate-fade-up pointer-events-none"
            style={{ animationDuration: '0.15s' }}
          >
            Copied! ✓
          </div>
        )}
      </div>
    </div>
  );
}