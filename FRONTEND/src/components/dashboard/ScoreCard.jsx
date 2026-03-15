/**
 * components/dashboard/ScoreCard.jsx
 * NPS Readiness Score — institutional style circular gauge.
 * Clean white card with navy/saffron accents matching eNPS design.
 */
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Skeleton } from '../ui/index.jsx';

const SCORE_MIN = 300;
const SCORE_MAX = 900;

const scoreToPercent = (score) =>
  Math.round(((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100);

const TIER_META = {
  Excellent: { color: '#2E7D32', label: 'Excellent',   bg: '#E8F5E9', border: '#A5D6A7', cls: 'tier-excellent' },
  Good:      { color: '#E65100', label: 'Good',         bg: '#FFF3E0', border: '#FFCC80', cls: 'tier-good'      },
  Fair:      { color: '#F57F17', label: 'Fair',          bg: '#FFF8E1', border: '#FFE082', cls: 'tier-fair'      },
  'Needs Work': { color: '#757575', label: 'Needs Work', bg: '#FAFAFA', border: '#E0E0E0', cls: 'tier-poor'   },
};

const BreakdownBar = ({ label, score, weight }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-text-secondary text-xs font-body">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-muted text-[10px] font-body">{weight}</span>
        <span className="font-mono font-bold text-ink text-xs">{score}</span>
      </div>
    </div>
    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden border border-border">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${score}%`,
          background: 'linear-gradient(90deg, #001F4D, #F47920)',
        }}
      />
    </div>
  </div>
);

export default function ScoreCard({ score, loading }) {
  if (loading) {
    return (
      <div className="card">
        <Skeleton className="h-4 w-40 mb-4" />
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
    <div className="card">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-base font-bold text-ink uppercase tracking-wide">
            NPS Readiness Score
          </h2>
          <div className="tricolor-bar mt-1 w-12" />
        </div>
        <span
          className={`stat-badge ${meta.cls}`}
          style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Circular ring — navy path on light track */}
        <div className="w-28 h-28 shrink-0">
          <CircularProgressbar
            value={percent}
            text={`${score.score}`}
            styles={buildStyles({
              textSize:               '20px',
              textColor:              meta.color,
              pathColor:              meta.color,
              trailColor:             '#E8EEF5',
              pathTransitionDuration: 0.8,
            })}
          />
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 space-y-2.5">
          {Object.entries(score.breakdown).map(([key, val]) => (
            <BreakdownBar key={key} label={val.label} score={val.score} weight={val.weight} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <p className="text-muted text-[10px] font-body">
          Calculated: {new Date(score.calculatedAt).toLocaleDateString('en-IN')}
        </p>
        <p className="text-[10px] font-body" style={{ color: meta.color }}>
          Range: 300 – 900
        </p>
      </div>
    </div>
  );
}