/**
 * components/dashboard/FutureSelfCard.jsx
 * Snapshot preview of the AI-generated future self with link to full page.
 */
import { Link } from 'react-router-dom';
import { formatINR, Skeleton } from '../ui/index.jsx';

export default function FutureSelfCard({ futureSelf, loading }) {
  if (loading) {
    return (
      <div className="card">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-8 w-28" />
      </div>
    );
  }

  if (!futureSelf) {
    return (
      <div className="card border-dashed border-gold/20 text-center py-6">
        <p className="text-4xl mb-2">🔮</p>
        <p className="text-text-secondary text-sm font-body mb-4">
          Your future self is waiting to be discovered.
        </p>
        <Link to="/onboarding" className="btn-primary inline-block w-auto px-6">
          Complete Onboarding
        </Link>
      </div>
    );
  }

  return (
    <div className="card relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #161d2e 0%, #1a2235 100%)' }}>
      {/* Decorative orb */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full
                      bg-gradient-radial from-gold/10 to-transparent pointer-events-none" />

      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔮</span>
        <h3 className="font-display text-sm font-bold text-text-primary tracking-wide uppercase">
          Future Self Preview
        </h3>
      </div>

      {/* Avatar description */}
      <p className="text-text-secondary text-sm font-body leading-relaxed mb-4 italic">
        "{futureSelf.avatarDescription}"
      </p>

      {/* Corpus figures */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-surface-2/60 rounded-xl p-3">
          <p className="text-muted text-[10px] font-body uppercase tracking-wide mb-1">Projected Corpus</p>
          <p className="text-gold font-mono font-bold text-base">
            {formatINR(futureSelf.projectedCorpus)}
          </p>
        </div>
        <div className="flex-1 bg-surface-2/60 rounded-xl p-3">
          <p className="text-muted text-[10px] font-body uppercase tracking-wide mb-1">Today's Value</p>
          <p className="text-frost font-mono font-bold text-base">
            {formatINR(futureSelf.inflationAdjustedCorpus)}
          </p>
        </div>
      </div>

      <Link
        to="/future-self"
        className="inline-flex items-center gap-1.5 text-gold text-sm font-body font-medium
                   hover:text-gold-dim transition-colors"
      >
        Read your letter from the future →
      </Link>
    </div>
  );
}