/**
 * components/dashboard/StreakCard.jsx
 * Shows current streak with a fire icon and longest streak record.
 */
import { Skeleton } from '../ui/index.jsx';

const FlameBar = ({ filled }) => (
  <div className={`w-2 h-6 rounded-sm transition-all duration-300 ${
    filled ? 'bg-ember' : 'bg-surface-2'
  }`} />
);

export default function StreakCard({ streak, loading }) {
  if (loading) {
    return (
      <div className="card-sm">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-10 w-16 mb-2" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  const current = streak?.currentStreak ?? 0;
  const longest = streak?.longestStreak ?? 0;

  // Show up to 7 flame bars representing this week
  const bars = Array.from({ length: 7 }, (_, i) => i < (current % 7 || (current > 0 ? 7 : 0)));

  return (
    <div className="card-sm relative overflow-hidden">
      {/* Ambient glow if active streak */}
      {current > 0 && (
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-ember/10 blur-2xl pointer-events-none" />
      )}

      <div className="flex items-start justify-between mb-2">
        <p className="text-text-secondary text-xs font-body uppercase tracking-wide">Daily Streak</p>
        {current >= 7 && (
          <span className="text-[10px] font-mono text-ember bg-ember/10 border border-ember/20 px-2 py-0.5 rounded-full">
            On fire!
          </span>
        )}
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className="font-display text-4xl font-extrabold text-text-primary leading-none">
          {current}
        </span>
        <span className="text-2xl mb-0.5">{current > 0 ? '🔥' : '💤'}</span>
        <span className="text-text-secondary text-sm font-body mb-1">days</span>
      </div>

      {/* Mini flame bars */}
      <div className="flex items-end gap-1 mb-2">
        {bars.map((filled, i) => <FlameBar key={i} filled={filled} />)}
        <span className="text-muted text-[10px] font-body ml-1 self-center">this week</span>
      </div>

      <p className="text-muted text-xs font-body">
        Best: <span className="text-text-secondary font-medium">{longest} days</span>
      </p>
    </div>
  );
}