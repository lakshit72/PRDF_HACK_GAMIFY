/**
 * pages/Tribes.jsx
 *
 * Tribe management page with two states:
 *   A) No tribe  → tabs to Create or Join
 *   B) In a tribe → tribe home: header, invite code, members list, leave button
 *
 * API calls: getMyTribe, createTribe, joinTribe
 * Uses: ToastProvider, socialApi, useAuth
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socialApi }  from '../services/api.js';
import { useAuth }    from '../context/AuthContext.jsx';
import { useToast }   from '../components/shared/Toast.jsx';
import { Spinner, Skeleton } from '../components/ui/index.jsx';
import TribeCard      from '../components/tribes/TribeCard.jsx';
import InviteCode     from '../components/tribes/InviteCode.jsx';

// ── Tribe stats bar ───────────────────────────────────────────────────────────
function TribeStats({ tribe }) {
  const members    = tribe.members ?? [];
  const avgScore   = members.length > 0
    ? Math.round(members.reduce((s, m) => s + (m.score ?? 300), 0) / members.length)
    : 0;
  const topMember  = [...members].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { label: 'Members',   value: members.length, icon: '👥' },
        { label: 'Avg Score', value: avgScore,        icon: '📊' },
        { label: 'Top Score', value: topMember?.score ?? '—', icon: '🏆' },
      ].map(({ label, value, icon }) => (
        <div key={label} className="bg-surface-2 rounded-xl p-3 text-center border border-border">
          <p className="text-base mb-1">{icon}</p>
          <p className="font-mono font-extrabold text-lg text-text-primary">{value}</p>
          <p className="text-muted text-[10px] font-body uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Create tribe form ─────────────────────────────────────────────────────────
function CreateTribeForm({ onSuccess }) {
  const { addToast }     = useToast();
  const [name, setName]  = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) { addToast('Tribe name must be at least 2 characters', 'warning'); return; }
    if (trimmed.length > 50) { addToast('Tribe name must be under 50 characters', 'warning'); return; }
    setLoading(true);
    try {
      const { data } = await socialApi.createTribe({ name: trimmed });
      addToast(`🏕️ Tribe "${data.tribe.name}" created!`, 'success');
      onSuccess(data.tribe);
    } catch (err) {
      addToast(err.response?.data?.error ?? 'Could not create tribe', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-2">
          Tribe Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. NPS Ninjas, Pension Pros…"
          maxLength={50}
          className="input-base"
          autoFocus
        />
        <p className="text-muted text-[10px] font-body mt-1.5 text-right">{name.length}/50</p>
      </div>
      <button
        type="submit"
        disabled={loading || name.trim().length < 2}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner size="sm" /> Creating…</> : '🏕️ Create Tribe'}
      </button>
    </form>
  );
}

// ── Join tribe form ───────────────────────────────────────────────────────────
function JoinTribeForm({ onSuccess }) {
  const { addToast }     = useToast();
  const [code, setCode]  = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) { addToast('Invite code must be exactly 6 characters', 'warning'); return; }
    setLoading(true);
    try {
      const { data } = await socialApi.joinTribe({ inviteCode: trimmed });
      addToast(
        data.message === 'Already a member'
          ? 'You are already a member of this tribe!'
          : `🎉 Joined tribe "${data.tribe.name}"!`,
        'success'
      );
      onSuccess(data.tribe);
    } catch (err) {
      addToast(
        err.response?.data?.error ?? 'Invalid invite code or tribe not found',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-2">
          Invite Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          maxLength={6}
          className="input-base font-mono text-center text-lg tracking-[0.3em]"
          autoFocus
        />
        <p className="text-muted text-[10px] font-body mt-1.5">
          6-character alphanumeric code from your tribe member
        </p>
      </div>
      <button
        type="submit"
        disabled={loading || code.trim().length !== 6}
        className="btn-primary flex items-center justify-center gap-2"
        style={{ background: code.trim().length === 6 ? '#7dd3fc' : undefined, color: '#0b0f1a' }}
      >
        {loading ? <><Spinner size="sm" /> Joining…</> : '🚪 Join Tribe'}
      </button>
    </form>
  );
}

// ── No-tribe landing ──────────────────────────────────────────────────────────
function NoTribeView({ onTribeJoined }) {
  const [tab, setTab] = useState('create');

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🏕️</div>
        <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
          Find Your Tribe
        </h2>
        <p className="text-text-secondary text-sm font-body max-w-xs mx-auto leading-relaxed">
          Join a group of fellow NPS savers. Compete on the leaderboard,
          share progress, and grow together.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-6">
        {[
          { id: 'create', label: '✦ Create Tribe' },
          { id: 'join',   label: '↗ Join Tribe'   },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`
              flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-200
              ${tab === id
                ? 'bg-surface border border-border text-text-primary shadow-sm'
                : 'text-muted hover:text-text-secondary'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card">
        {tab === 'create'
          ? <CreateTribeForm onSuccess={onTribeJoined} />
          : <JoinTribeForm   onSuccess={onTribeJoined} />
        }
      </div>

      {/* Benefits */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { icon: '🏆', text: 'Compete on tribe leaderboards' },
          { icon: '🔥', text: 'See each other\'s streaks' },
          { icon: '📊', text: 'Compare NPS Readiness Scores' },
          { icon: '💬', text: 'Shareable invite codes' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-2 p-3 bg-surface-2/60 rounded-xl border border-border/50">
            <span className="text-base shrink-0">{icon}</span>
            <p className="text-text-secondary text-xs font-body leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── In-tribe view ─────────────────────────────────────────────────────────────
function InTribeView({ tribe, currentUserId, onLeave }) {
  const { addToast }         = useToast();
  const navigate             = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const members = tribe.members ?? [];
  const sorted  = [...members].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const handleLeave = async () => {
    if (!confirmLeave) { setConfirmLeave(true); setTimeout(() => setConfirmLeave(false), 4000); return; }
    setLeaving(true);
    try {
      // Note: leave endpoint not in current backend — show info toast
      addToast('Leave tribe feature coming soon! Contact your tribe admin.', 'info');
    } finally {
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Tribe header */}
      <div
        className="rounded-2xl p-5 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #12182a 0%, #161d2e 100%)',
          borderColor: 'rgba(125,211,252,0.2)',
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.06) 0%, transparent 70%)' }}
        />
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-frost/60 text-[10px] uppercase tracking-widest font-body mb-1">Your Tribe</p>
            <h2 className="font-display text-2xl font-extrabold text-text-primary">{tribe.name}</h2>
          </div>
          <span className="text-3xl">🏕️</span>
        </div>
        <p className="text-muted text-xs font-body mb-4">
          Founded by <span className="text-text-secondary">{
            (tribe.createdBy?.email ?? '').replace(/(.{2}).*(@.*)/, '$1***$2') || 'Unknown'
          }</span>
        </p>
        <InviteCode code={tribe.inviteCode} />
      </div>

      {/* Stats */}
      <TribeStats tribe={{ members: sorted }} />

      {/* Members */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
            Members · {members.length}
          </h3>
          <button
            onClick={() => navigate('/leaderboards?tab=tribe')}
            className="text-frost text-xs font-body hover:text-frost/80 transition-colors"
          >
            Full Leaderboard →
          </button>
        </div>

        <div className="space-y-2">
          {sorted.map((member, i) => (
            <TribeCard
              key={member._id ?? member.userId ?? i}
              member={{
                email:  member.email ?? '',
                score:  member.score ?? 300,
                age:    member.age,
                userId: member._id ?? member.userId,
              }}
              rank={i + 1}
              isCurrentUser={
                (member._id ?? member.userId)?.toString() === currentUserId?.toString()
              }
            />
          ))}
        </div>
      </div>

      {/* Leave button */}
      <button
        onClick={handleLeave}
        disabled={leaving}
        className={`
          w-full py-3 rounded-xl border text-sm font-body font-medium transition-all duration-200
          ${confirmLeave
            ? 'border-red-500/40 bg-red-500/10 text-red-400'
            : 'border-border bg-surface-2 text-muted hover:border-red-500/30 hover:text-red-400/80'
          }
        `}
      >
        {confirmLeave ? '⚠️ Tap again to confirm leave' : 'Leave Tribe'}
      </button>
    </div>
  );
}

// ── Page skeleton ─────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Tribes() {
  const navigate              = useNavigate();
  const { user }              = useAuth();
  const [tribe,    setTribe]  = useState(null);
  const [loading,  setLoading]= useState(true);
  const [error,    setError]  = useState(null);

  const loadTribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await socialApi.getMyTribe();
      setTribe(data.tribe ?? null);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Could not load tribe data');
      }
      setTribe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTribe(); }, [loadTribe]);

  return (
    <div className="min-h-dvh">
      {/* Ambient background */}
      <div
        className="fixed inset-x-0 top-0 h-80 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 30% -5%, rgba(125,211,252,0.07) 0%, transparent 65%),' +
            'radial-gradient(ellipse 50% 40% at 80% 20%, rgba(110,231,183,0.04) 0%, transparent 55%)',
        }}
      />

      <div className="relative max-w-lg mx-auto px-4 pt-10 pb-28">

        {/* Nav back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-secondary text-sm font-body mb-8
                     hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Dashboard
        </button>

        {/* Page header */}
        <div className="flex items-end gap-3 mb-8">
          <span className="text-4xl">🏕️</span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight leading-tight">
              Tribes
            </h1>
            <p className="text-text-secondary text-sm font-body">Build your retirement community</p>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-4">
            <p className="text-red-300 text-sm font-body">{error}</p>
          </div>
        )}

        {loading ? (
          <PageSkeleton />
        ) : tribe ? (
          <InTribeView
            tribe={tribe}
            currentUserId={user?._id ?? user?.id}
            onLeave={() => setTribe(null)}
          />
        ) : (
          <NoTribeView onTribeJoined={(newTribe) => setTribe(newTribe)} />
        )}

      </div>
    </div>
  );
}