/**
 * components/dashboard/QuestCard.jsx
 * Shows the first incomplete quest with a progress bar.
 * Falls back to the first quest if all complete.
 */
import { Skeleton } from '../ui/index.jsx';

export default function QuestCard({ quests, loading }) {
  if (loading) {
    return (
      <div className="card-sm">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  const quest = quests?.find((q) => !q.completed) ?? quests?.[0];
  if (!quest) return null;

  const pct = quest.progress ?? 0;

  return (
    <div className="card-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-secondary text-xs font-body uppercase tracking-wide">Active Quest</p>
        <span className="text-lg">{quest.icon ?? '🎯'}</span>
      </div>

      <p className="text-text-primary text-sm font-body font-medium mb-1 leading-snug">
        {quest.description}
      </p>

      {quest.reward && (
        <p className="text-muted text-xs font-body mb-3">
          Reward: <span className="text-gold">{quest.reward}</span>
        </p>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 100
                ? 'linear-gradient(90deg, #6ee7b7, #34d399)'
                : 'linear-gradient(90deg, #f5c542, #fb923c)',
            }}
          />
        </div>
        <span className="text-muted text-xs font-mono shrink-0">{pct}%</span>
      </div>

      {quest.completed && (
        <p className="text-sage text-xs font-body mt-2">✓ Completed!</p>
      )}
    </div>
  );
}