/**
 * pages/Leaderboards.jsx
 *
 * Leaderboard page with two tabs:
 *   - Global: top-100 users ranked by NPS Readiness Score
 *   - My Tribe: tribe-scoped leaderboard (only shown if user is in a tribe)
 *
 * Highlights the current user's row. Shows a sticky "My Rank" badge when
 * the user's row has scrolled off screen.
 *
 * URL param support: /leaderboards?tab=tribe
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { socialApi }   from '../services/api.js';
import { useAuth }     from '../context/AuthContext.jsx';
import { useToast }    from '../components/shared/Toast.jsx';
import { Skeleton }    from '../components/ui/index.jsx';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable.jsx';

// ── Rank summary card ─────────────────────────────────────────────────────────
function RankCard({ globalRank, tribeRank, tribeName, myScore }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      <div
        className="rounded-2xl p-4 border text-center relative overflow-hidden"
        style={{
          background:  'linear-gradient(135deg, #1a1500 0%, #12100a 100%)',
          borderColor: 'rgba(245,197,66,0.2)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-radial from-gold/6 to-transparent pointer-events-none" />
        <p className="text-gold/50 text-[10px] uppercase tracking-widest font-body mb-1">Global Rank</p>
        <p className="font-display text-3xl font-extrabold text-gold leading-none">
          {globalRank ? `#${globalRank}` : '—'}
        </p>
        {myScore && <p className="text-gold/40 text-[10px] font-mono mt-1">{myScore} pts</p>}
      </div>

      <div
        className="rounded-2xl p-4 border text-center relative overflow-hidden"
        style={{
          background:  'linear-gradient(135deg, #001520 0%, #000f18 100%)',
          borderColor: 'rgba(125,211,252,0.2)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-radial from-frost/5 to-transparent pointer-events-none" />
        <p className="text-frost/50 text-[10px] uppercase tracking-widest font-body mb-1">
          {tribeName ? `${tribeName} Rank` : 'Tribe Rank'}
        </p>
        <p className="font-display text-3xl font-extrabold text-frost leading-none">
          {tribeRank ? `#${tribeRank}` : '—'}
        </p>
        {!tribeRank && (
          <p className="text-muted text-[10px] font-body mt-1">Join a tribe</p>
        )}
      </div>
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <span
      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border
        ${source === 'redis'
          ? 'text-sage/70 border-sage/20 bg-sage/5'
          : 'text-muted border-border bg-surface-2'
        }`}
    >
      {source === 'redis' ? '⚡ cached' : '🔍 live'}
    </span>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-200
        ${active
          ? 'bg-surface border border-border text-text-primary shadow-sm'
          : 'text-muted hover:text-text-secondary'
        }
      `}
    >
      {children}
    </button>
  );
}

// ── Refresh button ────────────────────────────────────────────────────────────
function RefreshButton({ onClick, loading, lastUpdated }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 text-muted text-xs font-body hover:text-text-secondary
                 transition-colors disabled:opacity-40"
    >
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className={loading ? 'animate-spin' : ''}
      >
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      {lastUpdated ? `Updated ${lastUpdated}` : 'Refresh'}
    </button>
  );
}

// ── Empty tribe state ─────────────────────────────────────────────────────────
function NoTribeState({ onNavigateToTribes }) {
  return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">🏕️</p>
      <h3 className="font-display text-lg font-bold text-text-primary mb-2">
        You're not in a tribe yet
      </h3>
      <p className="text-text-secondary text-sm font-body mb-6 max-w-xs mx-auto">
        Join or create a tribe to compete with friends and colleagues on a shared leaderboard.
      </p>
      <button
        onClick={onNavigateToTribes}
        className="btn-primary w-auto px-8"
      >
        🏕️ Find a Tribe
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Leaderboards() {
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();
  const { user }             = useAuth();
  const { addToast }         = useToast();

  const initialTab = searchParams.get('tab') === 'tribe' ? 'tribe' : 'global';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data state
  const [globalEntries,  setGlobalEntries]  = useState([]);
  const [tribeEntries,   setTribeEntries]   = useState([]);
  const [rankData,       setRankData]       = useState(null);
  const [tribeId,        setTribeId]        = useState(null);
  const [tribeName,      setTribeName]      = useState('');
  const [globalSource,   setGlobalSource]   = useState(null);
  const [tribeSource,    setTribeSource]    = useState(null);
  const [loadingGlobal,  setLoadingGlobal]  = useState(false);
  const [loadingTribe,   setLoadingTribe]   = useState(false);
  const [loadingRank,    setLoadingRank]    = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState(null);

  const currentUserId = user?._id ?? user?.id;

  // ── Fetch rank + tribe info ────────────────────────────────────────────────
  const fetchRankAndTribe = useCallback(async () => {
    setLoadingRank(true);
    try {
      const [rankRes, tribeRes] = await Promise.allSettled([
        socialApi.getMyRank(),
        socialApi.getMyTribe(),
      ]);

      if (rankRes.status === 'fulfilled') {
        setRankData(rankRes.value.data);
      }

      if (tribeRes.status === 'fulfilled' && tribeRes.value.data.tribe) {
        const t = tribeRes.value.data.tribe;
        setTribeId(t._id);
        setTribeName(t.name);
      }
    } catch {} finally {
      setLoadingRank(false);
    }
  }, []);

  // ── Fetch global leaderboard ───────────────────────────────────────────────
  const fetchGlobal = useCallback(async () => {
    setLoadingGlobal(true);
    try {
      const { data } = await socialApi.getLeaderboard({ type: 'global' });
      setGlobalEntries(data.leaderboard ?? []);
      setGlobalSource(data.source);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      addToast(err.response?.data?.error ?? 'Could not load global leaderboard', 'error');
    } finally {
      setLoadingGlobal(false);
    }
  }, [addToast]);

  // ── Fetch tribe leaderboard ────────────────────────────────────────────────
  const fetchTribe = useCallback(async () => {
    if (!tribeId) return;
    setLoadingTribe(true);
    try {
      const { data } = await socialApi.getLeaderboard({ type: 'tribe', tribeId });
      setTribeEntries(data.leaderboard ?? []);
      setTribeSource(data.source);
    } catch (err) {
      addToast(err.response?.data?.error ?? 'Could not load tribe leaderboard', 'error');
    } finally {
      setLoadingTribe(false);
    }
  }, [tribeId, addToast]);

  // Initial loads
  useEffect(() => { fetchRankAndTribe(); fetchGlobal(); }, [fetchRankAndTribe, fetchGlobal]);
  useEffect(() => { if (tribeId) fetchTribe(); }, [tribeId, fetchTribe]);

  const handleRefresh = () => {
    if (activeTab === 'global') fetchGlobal();
    else fetchTribe();
  };

  return (
    <div className="min-h-dvh">
      {/* Ambient background */}
      <div
        className="fixed inset-x-0 top-0 h-80 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(245,197,66,0.06) 0%, transparent 60%),' +
            'radial-gradient(ellipse 40% 40% at 85% 30%, rgba(125,211,252,0.04) 0%, transparent 55%)',
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
        <div className="flex items-end gap-3 mb-6">
          <span className="text-4xl">🏆</span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight leading-tight">
              Leaderboards
            </h1>
            <p className="text-text-secondary text-sm font-body">Where does your score stand?</p>
          </div>
        </div>

        {/* Rank cards */}
        {loadingRank ? (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : (
          <RankCard
            globalRank={rankData?.global?.rank}
            tribeRank={rankData?.tribe?.rank}
            tribeName={tribeName}
            myScore={rankData?.global ? globalEntries.find(e => e.userId?.toString() === currentUserId?.toString())?.score : null}
          />
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-5">
          <Tab active={activeTab === 'global'} onClick={() => setActiveTab('global')}>
            🌍 Global
          </Tab>
          <Tab active={activeTab === 'tribe'} onClick={() => setActiveTab('tribe')}>
            🏕️ My Tribe
          </Tab>
        </div>

        {/* Toolbar: count + source + refresh */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-muted text-xs font-body">
            {activeTab === 'global'
              ? `${globalEntries.length} ranked users`
              : `${tribeEntries.length} tribe members`
            }
          </p>
          <div className="flex items-center gap-2">
            <SourceBadge source={activeTab === 'global' ? globalSource : tribeSource} />
            <RefreshButton
              onClick={handleRefresh}
              loading={activeTab === 'global' ? loadingGlobal : loadingTribe}
              lastUpdated={lastUpdated}
            />
          </div>
        </div>

        {/* Global leaderboard */}
        {activeTab === 'global' && (
          <div className="animate-fade-in" style={{ animationDuration: '0.25s' }}>
            <LeaderboardTable
              entries={globalEntries}
              currentUserId={currentUserId}
              loading={loadingGlobal}
              emptyMessage="No scores recorded yet. Complete your first quiz!"
              myRank={rankData?.global?.rank}
              myScore={globalEntries.find(e => e.userId?.toString() === currentUserId?.toString())?.score}
            />
          </div>
        )}

        {/* Tribe leaderboard */}
        {activeTab === 'tribe' && (
          <div className="animate-fade-in" style={{ animationDuration: '0.25s' }}>
            {!tribeId ? (
              <NoTribeState onNavigateToTribes={() => navigate('/tribes')} />
            ) : (
              <LeaderboardTable
                entries={tribeEntries}
                currentUserId={currentUserId}
                loading={loadingTribe}
                emptyMessage="No tribe scores yet — complete some quizzes!"
                myRank={rankData?.tribe?.rank}
                myScore={tribeEntries.find(e => e.userId?.toString() === currentUserId?.toString())?.score}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}