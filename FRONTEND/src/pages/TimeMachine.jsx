/**
 * pages/TimeMachine.jsx
 *
 * The Time Machine Simulator — see how small daily choices compound into
 * massive retirement differences.
 *
 * Features:
 *  - Habit preset pills (coffee, eating out, streaming, etc.)
 *  - Dual spending sliders (current & reduced)
 *  - Real-time saving delta badge
 *  - Chart.js bar chart: baseline vs improved corpus
 *  - Fun contextual impact message
 *  - Toast error handling
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate }    from 'react-router-dom';
import { futureSelfApi }  from '../services/api.js';
import { useUserData }    from '../context/UserDataContext.jsx';
import { useToast }       from '../components/shared/Toast.jsx';
import RupeeSlider        from '../components/shared/RupeeSlider.jsx';
import HabitPresets       from '../components/timemachine/HabitPresets.jsx';
import CorpusChart        from '../components/timemachine/CorpusChart.jsx';
import ImpactMessage      from '../components/timemachine/ImpactMessage.jsx';
import { Spinner, Skeleton } from '../components/ui/index.jsx';

const formatINR = (v) => {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

// ── Result skeleton ───────────────────────────────────────────────────────────
function ResultSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-64 rounded-2xl w-full" />
      <Skeleton className="h-32 rounded-2xl w-full" />
    </div>
  );
}

export default function TimeMachine() {
  const navigate       = useNavigate();
  const { profile }    = useUserData();
  const { addToast }   = useToast();

  // ── Spending inputs ───────────────────────────────────────────────────────
  const [currentSpend,  setCurrentSpend]  = useState(500);
  const [reducedSpend,  setReducedSpend]  = useState(200);
  const [npsBalance,    setNpsBalance]    = useState(50000);
  const [monthlyContrib,setMonthlyContrib]= useState(2000);
  const [activePreset,  setActivePreset]  = useState('coffee');

  // ── Results ───────────────────────────────────────────────────────────────
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  const saving = Math.max(0, currentSpend - reducedSpend);

  // Auto-clamp reduced spend if current drops below it
  useEffect(() => {
    if (reducedSpend > currentSpend) setReducedSpend(currentSpend);
  }, [currentSpend, reducedSpend]);

  const handlePreset = (preset) => {
    setActivePreset(preset.id);
    setCurrentSpend(preset.current);
    setReducedSpend(preset.reduced);
    setResult(null); // Clear stale result on preset change
  };

  const handleCalculate = useCallback(async () => {
    if (saving === 0) {
      addToast('Reduce your spending to see an impact!', 'warning');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data } = await futureSelfApi.timeMachine({
        currentAge:                 profile?.age ?? 25,
        currentMonthlySpending:     currentSpend,
        newMonthlySpending:         reducedSpend,
        currentNpsBalance:          npsBalance,
        currentMonthlyContribution: monthlyContrib,
      });
      setResult(data);
    } catch (err) {
      addToast(
        err.response?.data?.errors?.[0]?.msg
          ?? err.response?.data?.error
          ?? 'Calculation failed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [saving, profile, currentSpend, reducedSpend, npsBalance, monthlyContrib, addToast]);

  return (
    <div className="min-h-dvh">
      {/* Hero gradient */}
      <div
        className="absolute inset-x-0 top-0 h-72 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 30% 0%, rgba(125,211,252,0.06) 0%, transparent 65%), ' +
                      'radial-gradient(ellipse 50% 40% at 80% 20%, rgba(110,231,183,0.05) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-lg mx-auto px-4 pt-10 pb-28">

        {/* ── Top bar ── */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-secondary text-sm font-body mb-8
                     hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </button>

        {/* ── Hero header ── */}
        <div className="mb-8">
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl">⏳</span>
            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight leading-none">
              Time Machine
            </h1>
          </div>
          <p className="text-text-secondary text-sm font-body leading-relaxed">
            See how your daily choices shape your retirement. Every rupee saved compounds into freedom.
          </p>
        </div>

        <div className="space-y-5">

          {/* ── Presets ── */}
          <div className="card animate-fade-up">
            <HabitPresets activeId={activePreset} onSelect={handlePreset} />
          </div>

          {/* ── Sliders card ── */}
          <div className="card space-y-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
              Monthly Spending
            </h2>

            {/* Current spend */}
            <RupeeSlider
              label="Current Monthly Spend"
              value={currentSpend}
              min={0}
              max={20000}
              step={100}
              onChange={(v) => { setCurrentSpend(v); setResult(null); }}
              accentColor="#64748b"
              sublabel="what you spend now"
            />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-xs font-body">reduce to</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Reduced spend */}
            <RupeeSlider
              label="New Monthly Spend"
              value={reducedSpend}
              min={0}
              max={currentSpend}
              step={50}
              onChange={(v) => { setReducedSpend(v); setResult(null); }}
              accentColor="#6ee7b7"
              sublabel="what you'll spend instead"
            />

            {/* Saving delta */}
            <div
              className={`
                rounded-xl p-3 flex items-center justify-between border transition-all duration-300
                ${saving > 0
                  ? 'border-sage/30 bg-sage/8'
                  : 'border-border bg-surface-2'
                }
              `}
            >
              <span className="text-xs text-text-secondary font-body">Monthly saving redirected to NPS</span>
              <span className={`font-mono font-bold text-base ${saving > 0 ? 'text-sage' : 'text-muted'}`}>
                {saving > 0 ? `+${formatINR(saving)}` : '₹0'}
              </span>
            </div>
          </div>

          {/* ── NPS context inputs (collapsible-ish) ── */}
          <details className="card group animate-fade-up" style={{ animationDelay: '160ms' }}>
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <span className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
                Your NPS Context
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                className="text-muted transition-transform duration-200 group-open:rotate-180"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <div className="mt-5 space-y-5">
              <RupeeSlider
                label="Current NPS Balance"
                value={npsBalance}
                min={0}
                max={2000000}
                step={10000}
                onChange={(v) => { setNpsBalance(v); setResult(null); }}
                accentColor="#f5c542"
              />
              <RupeeSlider
                label="Current Monthly Contribution"
                value={monthlyContrib}
                min={0}
                max={50000}
                step={500}
                onChange={(v) => { setMonthlyContrib(v); setResult(null); }}
                accentColor="#7dd3fc"
              />
            </div>
          </details>

          {/* ── Calculate button ── */}
          <button
            onClick={handleCalculate}
            disabled={loading || saving === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 animate-fade-up"
            style={{ animationDelay: '240ms' }}
          >
            {loading ? (
              <><Spinner size="sm" /> Calculating...</>
            ) : (
              <><span>⏳</span> Calculate My Impact</>
            )}
          </button>

          {/* ── Results ── */}
          {loading && <ResultSkeleton />}

          {!loading && result && (
            <div className="space-y-4 stagger">

              {/* Chart */}
              <div className="card animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
                    Corpus at 60
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] font-body text-muted">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-muted/50 inline-block" />
                      Without
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sage/70 inline-block" />
                      With Change
                    </span>
                  </div>
                </div>
                <CorpusChart
                  baseCorpus={result.baseCorpusAt60}
                  improvedCorpus={result.improvedCorpusAt60}
                />
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
                  <span className="text-muted font-body">
                    {result.meta?.yearsToRetirement} years · {result.meta?.assumedAnnualReturn} return
                  </span>
                  <span className="text-sage font-mono font-bold">
                    +{formatINR(result.extraCorpusAt60)} extra
                  </span>
                </div>
              </div>

              {/* Fun message */}
              <div className="animate-fade-up">
                <ImpactMessage
                  extraCorpus={result.extraCorpusAt60}
                  saving={result.monthlySavingRedirected}
                  message={result.message}
                />
              </div>

              {/* CTA to Future Self */}
              <div
                className="rounded-2xl p-4 border border-gold/20 text-center animate-fade-up"
                style={{ background: 'linear-gradient(135deg, #120f00 0%, #1a1500 100%)' }}
              >
                <p className="text-gold/60 text-xs font-body mb-2">
                  Want to see what this future looks like?
                </p>
                <button
                  onClick={() => navigate('/future-self')}
                  className="text-gold text-sm font-body font-medium hover:text-gold/80 transition-colors"
                >
                  🔮 Meet Your Future Self →
                </button>
              </div>

            </div>
          )}

          {/* ── Empty state hint ── */}
          {!loading && !result && (
            <div className="text-center py-4 animate-fade-in">
              <p className="text-muted text-xs font-body">
                Adjust the sliders above and hit "Calculate My Impact"
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}