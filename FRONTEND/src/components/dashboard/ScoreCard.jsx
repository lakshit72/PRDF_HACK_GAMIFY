/**
 * components/dashboard/ScoreCard.jsx
 * Circular progress bar showing NPS Readiness Score (300–900).
 */
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Skeleton } from '../ui/index.jsx';

const SCORE_MIN = 300;
const SCORE_MAX = 900;

// Map score to 0-100 percentage for the ring
const scoreToPercent = (score) =>
  Math.round(((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100);

const TIER_META = {
  Excellent: { color: '#6ee7b7', label: 'Excellent',  glow: 'rgba(110,231,183,0.2)' },
  Good:      { color: '#f5c542', label: 'Good',       glow: 'rgba(245,197,66,0.2)'  },
  Fair:      { color: '#ff6b35', label: 'Fair',       glow: 'rgba(255,107,53,0.2)'  },
  'Needs Work': { color: '#64748b', label: 'Needs Work', glow: 'rgba(100,116,139,0.15)' },
};

const BreakdownBar = ({ label, score, weight }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-text-secondary text-xs font-body">{label}</span>
      <span className="text-text-primary text-xs font-mono">{score}</span>
    </div>
    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold transition-all duration-700"
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export default function ScoreCard({ score, loading }) {
  if (loading) {
    return (
      <div className="card glow-gold">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="flex items-center gap-6">
          <Skeleton className="w-28 h-28 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!score) return null;

  const percent = scoreToPercent(score.score);
  const meta    = TIER_META[score.tier] ?? TIER_META['Needs Work'];

  return (
    <div className="card" style={{ boxShadow: `0 0 40px ${meta.glow}` }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-bold text-text-primary tracking-wide uppercase">
          NPS Readiness Score
        </h2>
        <span
          className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border"
          style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}10` }}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular ring */}
        <div className="w-28 h-28 shrink-0">
          <CircularProgressbar
            value={percent}
            text={`${score.score}`}
            styles={buildStyles({
              textSize:         '22px',
              textColor:        meta.color,
              pathColor:        meta.color,
              trailColor:       '#1e2740',
              pathTransitionDuration: 0.8,
            })}
          />
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 space-y-2.5">
          {Object.entries(score.breakdown).map(([key, val]) => (
            <BreakdownBar
              key={key}
              label={val.label}
              score={val.score}
              weight={val.weight}
            />
          ))}
        </div>
      </div>

      <p className="text-muted text-xs font-body mt-4 text-right">
        Last updated · {new Date(score.calculatedAt).toLocaleDateString('en-IN')}
      </p>
    </div>
  );
}