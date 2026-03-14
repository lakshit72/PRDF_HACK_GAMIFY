/**
 * components/leaderboard/LeaderboardTable.jsx
 *
 * Leaderboard ranked list with:
 *  - Top-3 podium medals (🥇🥈🥉)
 *  - Per-row score tier colour ring
 *  - Current-user row highlight + sticky positioning when visible
 *  - Optional "My Rank" sticky footer when current user is off-screen
 *  - Skeleton loading state
 */
import { useRef, useEffect, useState } from 'react';
import { Skeleton } from '../ui/index.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIER_COLOR = (score) => {
  if (score >= 750) return '#6ee7b7';
  if (score >= 600) return '#f5c542';
  if (score >= 450) return '#ff6b35';
  return '#64748b';
};

const maskEmail = (email = '') => email.replace(/(.{2}).*(@.*)/, '$1***$2');

// Generate avatar hue from email
const emailToHue = (email = '') => {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};

// ── Mini avatar ───────────────────────────────────────────────────────────────
function MiniAvatar({ email }) {
  const hue = emailToHue(email);
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},55%,22%) 0%, hsl(${hue},45%,16%) 100%)`,
        border:     `1.5px solid hsl(${hue},45%,38%)`,
        color:      `hsl(${hue},65%,72%)`,
      }}
    >
      {(email[0] ?? '?').toUpperCase()}
    </div>
  );
}

// ── Single row ────────────────────────────────────────────────────────────────
function LeaderboardRow({ entry, isCurrentUser, animDelay = 0 }) {
  const { rank, userId, email = '', score = 300 } = entry;
  const color   = TIER_COLOR(score);
  const ref     = useRef(null);

  const rankEl =
    rank === 1 ? <span className="text-xl leading-none">🥇</span> :
    rank === 2 ? <span className="text-xl leading-none">🥈</span> :
    rank === 3 ? <span className="text-xl leading-none">🥉</span> :
    <span className="font-mono text-xs text-muted tabular-nums w-6 text-right">{rank}</span>;

  return (
    <div
      ref={ref}
      data-rank={rank}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 animate-fade-up
        ${isCurrentUser
          ? 'border-gold/35 bg-gradient-to-r from-gold/8 to-transparent sticky top-0 z-10'
          : rank <= 3
          ? 'border-border/80 bg-surface hover:bg-surface-2'
          : 'border-transparent hover:border-border hover:bg-surface'
        }
      `}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-end shrink-0">{rankEl}</div>

      {/* Avatar */}
      <MiniAvatar email={email} />

      {/* Email */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body font-medium truncate ${isCurrentUser ? 'text-gold' : 'text-text-primary'}`}>
          {maskEmail(email)}
          {isCurrentUser && (
            <span className="ml-2 text-[9px] font-mono text-gold/60 bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full align-middle">
              YOU
            </span>
          )}
        </p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="font-mono font-extrabold text-base tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
        {/* Tier dot */}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 4px ${color}80` }}
        />
      </div>
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────
function LeaderboardSkeleton({ rows = 10 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-8 h-4" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LeaderboardTable({
  entries = [],
  currentUserId,
  loading = false,
  emptyMessage = 'No entries yet.',
  myRank = null,
  myScore = null,
}) {
  const [myRowVisible, setMyRowVisible] = useState(true);
  const listRef = useRef(null);

  // Observe when current user's row scrolls off screen
  useEffect(() => {
    if (!currentUserId || !listRef.current) return;
    const myRow = listRef.current.querySelector('[data-current-user="true"]');
    if (!myRow) return;

    const obs = new IntersectionObserver(
      ([entry]) => setMyRowVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(myRow);
    return () => obs.disconnect();
  }, [currentUserId, entries]);

  if (loading) return <LeaderboardSkeleton />;

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-text-secondary text-sm font-body">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* List */}
      <div ref={listRef} className="space-y-1">
        {entries.map((entry, i) => {
          const isCurrent = entry.userId?.toString() === currentUserId?.toString();
          return (
            <div key={entry.userId ?? i} data-current-user={isCurrent ? 'true' : undefined}>
              <LeaderboardRow
                entry={entry}
                isCurrentUser={isCurrent}
                animDelay={Math.min(i * 30, 400)}
              />
            </div>
          );
        })}
      </div>

      {/* Sticky "My Rank" footer when user row is off-screen */}
      {!myRowVisible && myRank && (
        <div
          className="sticky bottom-4 mx-4 mt-2 animate-fade-up"
          style={{ animationDuration: '0.2s' }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gold/40 bg-ink/95 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-gold text-sm font-mono font-bold">#{myRank}</span>
              <span className="text-text-secondary text-sm font-body">Your rank</span>
            </div>
            {myScore && (
              <span className="font-mono font-extrabold text-gold text-base">{myScore}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}