/**
 * components/ui/index.jsx
 * NPS-themed shared primitive components.
 */

// ── Skeleton loader ──────────────────────────────────────────────────────────
export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

// ── Error banner ─────────────────────────────────────────────────────────────
export const ErrorBanner = ({ message, onDismiss }) => (
  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
    <span className="text-red-500 text-lg mt-0.5 shrink-0">⚠</span>
    <p className="text-red-700 text-sm flex-1 font-body leading-relaxed">{message}</p>
    {onDismiss && (
      <button onClick={onDismiss}
              className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0">
        ×
      </button>
    )}
  </div>
);

// ── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-white/30 border-t-white rounded-full animate-spin`} />
  );
};

// ── Rupee formatter ──────────────────────────────────────────────────────────
export const formatINR = (amount) => {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
  if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(1)} L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

// ── Score tier colour ─────────────────────────────────────────────────────────
export const scoreTierColor = (score) => {
  if (score >= 750) return 'text-sage';
  if (score >= 600) return 'text-gold';
  if (score >= 450) return 'text-amber-600';
  return 'text-muted';
};

// ── Section divider with saffron accent ──────────────────────────────────────
export const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px bg-border" />
    {label && <span className="text-text-secondary text-[10px] font-body uppercase tracking-widest px-2">{label}</span>}
    <div className="flex-1 h-px bg-border" />
  </div>
);

// ── Page wrapper with NPS ambient ────────────────────────────────────────────
export const PageWrapper = ({ children, className = '' }) => (
  <div className={`min-h-dvh nps-watermark ${className}`}>
    {children}
  </div>
);