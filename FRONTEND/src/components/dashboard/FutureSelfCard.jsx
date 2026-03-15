/**
 * components/dashboard/FutureSelfCard.jsx
 * NPS-themed future self preview card — official government-scheme styling.
 */
import { Link } from 'react-router-dom';
import { formatINR, Skeleton } from '../ui/index.jsx';

export default function FutureSelfCard({ futureSelf, loading }) {
  if (loading) {
    return (
      <div className="card">
        <Skeleton className="h-4 w-36 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!futureSelf) {
    return (
      <div className="card border-dashed text-center py-6" style={{ borderColor: '#C8D6E8' }}>
        <div className="w-14 h-14 rounded-full bg-surface-2 border border-border
                        flex items-center justify-center text-2xl mx-auto mb-3">
          🔮
        </div>
        <p className="text-ink font-display font-bold text-sm mb-1">
          Future Projection Not Generated
        </p>
        <p className="text-text-secondary text-xs font-body mb-4 max-w-xs mx-auto">
          Complete your profile to see your projected retirement corpus.
        </p>
        <Link to="/onboarding" className="btn-primary inline-block w-auto px-6 text-xs py-2.5">
          Complete Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Navy header band */}
      <div className="nps-header -mx-5 -mt-5 px-5 py-3 mb-4">
        <div className="tricolor-bar mb-2" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[10px] uppercase tracking-widest font-body">Retirement Projection</p>
            <h3 className="text-white font-display font-bold text-sm">Your Future Corpus</h3>
          </div>
          <span className="text-2xl">🔮</span>
        </div>
      </div>

      {/* Avatar description */}
      <p className="text-text-secondary text-xs font-body leading-relaxed mb-4 italic
                    border-l-2 border-gold pl-3">
        "{futureSelf.avatarDescription}"
      </p>

      {/* Corpus figures */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg p-3 border" style={{ background: '#FFF3E0', borderColor: '#FFCC80' }}>
          <p className="text-[10px] font-body uppercase tracking-wide mb-1" style={{ color: '#E65100' }}>
            Projected Corpus
          </p>
          <p className="font-mono font-bold text-base" style={{ color: '#BF360C' }}>
            {formatINR(futureSelf.projectedCorpus)}
          </p>
        </div>
        <div className="rounded-lg p-3 border" style={{ background: '#E3F2FD', borderColor: '#90CAF9' }}>
          <p className="text-[10px] font-body uppercase tracking-wide mb-1" style={{ color: '#1565C0' }}>
            Today's Value
          </p>
          <p className="font-mono font-bold text-base" style={{ color: '#0D47A1' }}>
            {formatINR(futureSelf.inflationAdjustedCorpus)}
          </p>
        </div>
      </div>

      <Link
        to="/future-self"
        className="flex items-center justify-between text-xs font-body font-semibold
                   text-gold hover:text-gold-dim transition-colors"
      >
        <span>Read your letter from the future</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </Link>
    </div>
  );
}