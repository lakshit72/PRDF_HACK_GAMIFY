/**
 * components/tribes/TribeCard.jsx
 *
 * Reusable tribe member card.
 * Shows: masked email initial, masked email, NPS score with tier ring, rank badge.
 * Used in both the Tribes member list and tribe leaderboard.
 */

// ── Score tier metadata ───────────────────────────────────────────────────────
const TIER = (score) => {
  if (score >= 750) return { label: 'Excellent', color: '#6ee7b7', ring: 'rgba(110,231,183,0.35)' };
  if (score >= 600) return { label: 'Good',      color: '#f5c542', ring: 'rgba(245,197,66,0.35)'  };
  if (score >= 450) return { label: 'Fair',       color: '#ff6b35', ring: 'rgba(255,107,53,0.35)'  };
  return              { label: 'Learning',    color: '#64748b', ring: 'rgba(100,116,139,0.25)' };
};

// Generate a deterministic hue from an email string for avatar colour
const emailToHue = (email = '') => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

export function MemberAvatar({ email = '', size = 'md' }) {
  const initial = (email[0] ?? '?').toUpperCase();
  const hue     = emailToHue(email);
  const dim     = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm';

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-display font-bold shrink-0`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue},60%,25%) 0%, hsl(${hue},50%,18%) 100%)`,
        border:     `1.5px solid hsl(${hue},50%,40%)`,
        color:      `hsl(${hue},70%,75%)`,
      }}
    >
      {initial}
    </div>
  );
}

export default function TribeCard({ member, rank, isCurrentUser = false, showRank = true }) {
  const { email = '', score = 300, age } = member;
  const tier    = TIER(score);
  const display = email.replace(/(.{2}).*(@.*)/, '$1***$2');

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200
        ${isCurrentUser
          ? 'border-gold/30 bg-gold/5'
          : 'border-border bg-surface hover:bg-surface-2 hover:border-border/80'
        }
      `}
    >
      {/* Rank badge */}
      {showRank && (
        <div className="w-8 text-center shrink-0">
          {rank <= 3 ? (
            <span className="text-lg">
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted tabular-nums">#{rank}</span>
          )}
        </div>
      )}

      {/* Avatar */}
      <MemberAvatar email={email} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body font-medium truncate ${isCurrentUser ? 'text-gold' : 'text-text-primary'}`}>
          {display}
          {isCurrentUser && <span className="text-gold/60 text-[10px] ml-1.5 font-mono">YOU</span>}
        </p>
        {age && <p className="text-muted text-[10px] font-body">Age {age}</p>}
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p
          className="font-mono font-extrabold text-base leading-tight tabular-nums"
          style={{ color: tier.color }}
        >
          {score}
        </p>
        <p className="text-[10px] font-body" style={{ color: tier.color, opacity: 0.6 }}>
          {tier.label}
        </p>
      </div>

      {/* Score ring dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: tier.color, boxShadow: `0 0 6px ${tier.ring}` }}
      />
    </div>
  );
}