/**
 * components/ui/index.jsx
 * Shared primitive components used across pages.
 */

// ── Skeleton loader ───────────────────────────────────────────────────────────
export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

// ── Error banner ──────────────────────────────────────────────────────────────
export const ErrorBanner = ({ message, onDismiss }) => (
  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
    <span className="text-red-400 text-lg mt-0.5">⚠</span>
    <p className="text-red-300 text-sm flex-1 font-body">{message}</p>
    {onDismiss && (
      <button onClick={onDismiss} className="text-red-400 hover:text-red-200 text-lg leading-none">×</button>
    )}
  </div>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-gold/30 border-t-gold rounded-full animate-spin`} />
  );
};

// ── Rupee formatter ───────────────────────────────────────────────────────────
export const formatINR = (amount) => {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
  if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

// ── Score tier colour ─────────────────────────────────────────────────────────
export const scoreTierColor = (score) => {
  if (score >= 750) return 'text-sage';
  if (score >= 600) return 'text-gold';
  if (score >= 450) return 'text-ember';
  return 'text-muted';
};