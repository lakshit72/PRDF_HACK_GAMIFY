/**
 * components/contribution/ContributeForm.jsx
 *
 * Three sections in one component:
 *   1. Make a Contribution (one-time or monthly)
 *   2. Set Up Auto-Debit
 *   3. Contribution History
 *
 * All backed by real API calls with optimistic UI.
 */
import { useState, useEffect, useCallback } from 'react';
import { contributeApi } from '../../services/api.js';
import { useToast }      from '../shared/Toast.jsx';
import { Spinner, Skeleton } from '../ui/index.jsx';

const formatINR = (v) => {
  if (!v && v !== 0) return '—';
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─────────────────────────────────────────────────────────────────────────────
// MAKE CONTRIBUTION
// ─────────────────────────────────────────────────────────────────────────────
function MakeContribution({ onSuccess }) {
  const { addToast }  = useToast();
  const [amount,      setAmount]    = useState('');
  const [frequency,   setFrequency] = useState('one-time');
  const [loading,     setLoading]   = useState(false);
  const [lastResult,  setLastResult]= useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 500) { addToast('Minimum contribution is ₹500', 'warning'); return; }

    setLoading(true);
    try {
      const { data } = await contributeApi.contribute({ amount: amt, frequency });
      setLastResult(data);
      addToast(`✅ ${formatINR(amt)} ${frequency === 'monthly' ? 'monthly SIP' : 'contribution'} recorded!`, 'success');
      setAmount('');
      onSuccess?.();
    } catch (err) {
      addToast(err.response?.data?.errors?.[0]?.msg ?? 'Contribution failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/25 flex items-center justify-center text-base">
          💰
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
            Make a Contribution
          </h2>
          <p className="text-muted text-[10px] font-body">Mock NPS gateway · Instant processing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Frequency toggle */}
        <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1">
          {['one-time', 'monthly'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`
                flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200
                ${frequency === f
                  ? 'bg-surface border border-border text-text-primary shadow-sm'
                  : 'text-muted hover:text-text-secondary'
                }
              `}
            >
              {f === 'one-time' ? '⚡ One-time' : '🔄 Monthly SIP'}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div>
          <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-1.5">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Min ₹500"
              min="500"
              className="input-base pl-6 text-lg font-mono"
            />
          </div>
          {/* Quick amount buttons */}
          <div className="flex gap-2 mt-2">
            {[500, 1000, 2000, 5000].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={`
                  flex-1 text-[11px] font-mono py-1.5 rounded-lg border transition-all duration-150
                  ${String(amount) === String(v)
                    ? 'border-gold/50 bg-gold/10 text-gold'
                    : 'border-border bg-surface-2 text-muted hover:border-gold/30 hover:text-gold/80'
                  }
                `}
              >
                ₹{v >= 1000 ? `${v/1000}K` : v}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !amount || parseFloat(amount) < 500}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner size="sm" /> Processing…</> : `💳 Contribute ${amount ? formatINR(parseFloat(amount)) : 'Now'}`}
        </button>
      </form>

      {/* Success receipt */}
      {lastResult && (
        <div className="bg-sage/8 border border-sage/20 rounded-xl p-3 animate-fade-up">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sage text-sm">✓</span>
            <p className="text-sage text-sm font-body font-medium">Contribution recorded</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-muted font-body">Ref: </span>
              <span className="text-text-secondary font-mono">{lastResult.referenceId}</span>
            </div>
            <div>
              <span className="text-muted font-body">Amount: </span>
              <span className="text-sage font-mono font-bold">{formatINR(lastResult.amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DEBIT SETUP
// ─────────────────────────────────────────────────────────────────────────────
function AutoDebitSetup() {
  const { addToast }  = useToast();
  const [amount,      setAmount]     = useState('');
  const [day,         setDay]        = useState('5');
  const [enabled,     setEnabled]    = useState(true);
  const [loading,     setLoading]    = useState(false);
  const [saved,       setSaved]      = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 500) { addToast('Minimum auto-debit amount is ₹500', 'warning'); return; }
    const d = parseInt(day);
    if (!d || d < 1 || d > 28) { addToast('Day must be between 1 and 28', 'warning'); return; }

    setLoading(true);
    try {
      await contributeApi.setAutodebit({ amount: amt, dayOfMonth: d, enabled });
      setSaved(true);
      addToast(
        enabled
          ? `✅ Auto-debit of ${formatINR(amt)} set for day ${d} of every month`
          : '⏸ Auto-debit disabled',
        'success'
      );
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0]?.msg ?? 'Could not save auto-debit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-frost/15 border border-frost/25 flex items-center justify-center text-base">
            🔁
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
              Auto-Debit
            </h2>
            <p className="text-muted text-[10px] font-body">Set and forget monthly SIP</p>
          </div>
        </div>
        {/* Enable/disable toggle */}
        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          className={`
            relative w-11 h-6 rounded-full border transition-all duration-300
            ${enabled ? 'bg-frost/20 border-frost/40' : 'bg-surface-2 border-border'}
          `}
        >
          <div
            className={`
              absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300
              ${enabled ? 'left-5 bg-frost' : 'left-0.5 bg-muted'}
            `}
          />
        </button>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-3 transition-opacity ${enabled ? '' : 'opacity-40 pointer-events-none'}`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-1.5">
              Amount / month
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="2000"
                className="input-base pl-6"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-1.5">
              Day of Month
            </label>
            <select
              value={day}
              onChange={e => setDay(e.target.value)}
              className="input-base appearance-none"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of every month</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !enabled}
          className="w-full py-3 rounded-xl border font-body font-medium text-sm transition-all duration-200
                     border-frost/30 bg-frost/8 text-frost hover:bg-frost/12 active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner size="sm" /> Saving…</> : saved ? '✓ Saved!' : '💾 Save Auto-Debit'}
        </button>
      </form>

      {!enabled && (
        <p className="text-center text-muted text-xs font-body">Auto-debit is currently disabled</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRIBUTION HISTORY
// ─────────────────────────────────────────────────────────────────────────────
function HistoryRow({ contrib }) {
  const isMonthly = contrib.type === 'monthly';
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <div
        className={`
          w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border
          ${isMonthly ? 'bg-frost/10 border-frost/20' : 'bg-gold/10 border-gold/20'}
        `}
      >
        {isMonthly ? '🔄' : '⚡'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-body font-medium capitalize">{contrib.type}</p>
        <p className="text-muted text-[11px] font-mono">{contrib.referenceId}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-sm text-text-primary">{formatINR(contrib.amount)}</p>
        <p className="text-muted text-[10px] font-body">{formatDate(contrib.date)}</p>
      </div>
      <div
        className={`
          text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0
          ${contrib.status === 'processed'
            ? 'text-sage border-sage/25 bg-sage/8'
            : 'text-muted border-border bg-surface-2'
          }
        `}
      >
        {contrib.status}
      </div>
    </div>
  );
}

export function ContributionHistory({ refreshTrigger }) {
  const [history,  setHistory]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);

  const load = useCallback(async (pg = 1, append = false) => {
    setLoading(true);
    try {
      const { data } = await contributeApi.getHistory();
      // Backend returns full history — handle client-side pagination
      const items = data.contributions ?? [];
      setHistory(append ? prev => [...prev, ...items] : items);
      setSummary(data.summary);
      setHasMore(pg < (data.pagination?.totalPages ?? 1));
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load, refreshTrigger]);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ember/15 border border-ember/25 flex items-center justify-center text-base">
            📜
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
              History
            </h2>
            {summary && (
              <p className="text-muted text-[10px] font-body">
                {summary.contributionCount} contributions · Total {formatINR(summary.totalContributed)}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => load(1)} disabled={loading} className="text-muted hover:text-text-secondary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={loading ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* Summary stats */}
      {summary && summary.contributionCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: formatINR(summary.totalContributed), color: 'text-gold' },
            { label: 'Count', value: summary.contributionCount, color: 'text-frost' },
            { label: 'Avg',   value: formatINR(summary.avgContribution), color: 'text-sage' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-2 rounded-xl p-2.5 text-center border border-border">
              <p className={`font-mono font-bold text-base ${color}`}>{value}</p>
              <p className="text-muted text-[10px] font-body uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading && history.length === 0 ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
              <Skeleton className="w-16 h-3.5" />
            </div>
          ))}
        </div>
      ) : history.length > 0 ? (
        <div>
          {history.map((c, i) => <HistoryRow key={c._id ?? i} contrib={c} />)}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-muted text-sm font-body">No contributions yet</p>
          <p className="text-muted text-xs font-body">Make your first contribution above!</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED EXPORT (default)
// ─────────────────────────────────────────────────────────────────────────────
export default function ContributeForm({ onHistoryRefresh }) {
  return (
    <div className="space-y-4">
      <MakeContribution onSuccess={onHistoryRefresh} />
      <AutoDebitSetup />
    </div>
  );
}