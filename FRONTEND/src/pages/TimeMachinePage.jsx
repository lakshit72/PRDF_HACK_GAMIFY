/**
 * pages/TimeMachinePage.jsx
 * Interactive habit-cost calculator. Shows extra corpus unlocked by saving on a habit.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { futureSelfApi } from '../services/api.js';
import { useUserData } from '../context/UserDataContext.jsx';
import { formatINR, Spinner, ErrorBanner } from '../components/ui/index.jsx';

const schema = yup.object({
  currentMonthlySpending: yup.number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .min(1, 'Must be at least ₹1').required('Required'),
  newMonthlySpending: yup.number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .min(0, 'Must be 0 or more').required('Required')
    .test('less-than-current', 'Must be less than current spending', function (val) {
      return val <= this.parent.currentMonthlySpending;
    }),
  currentNpsBalance: yup.number()
    .transform((v) => (isNaN(v) ? 0 : v)).min(0).default(0),
  currentMonthlyContribution: yup.number()
    .transform((v) => (isNaN(v) ? 0 : v)).min(0).default(0),
});

const HABIT_PRESETS = [
  { label: '☕ Coffee',       current: 500,  reduced: 200 },
  { label: '🍕 Dining out',   current: 2000, reduced: 800 },
  { label: '🎬 Streaming',    current: 800,  reduced: 200 },
  { label: '🛒 Impulse buys', current: 3000, reduced: 1000 },
];

export default function TimeMachinePage() {
  const { profile } = useUserData();
  const navigate    = useNavigate();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      currentNpsBalance:          0,
      currentMonthlyContribution: 0,
    },
  });

  const current = watch('currentMonthlySpending') ?? 0;
  const reduced = watch('newMonthlySpending') ?? 0;
  const saving  = Math.max(0, current - reduced);

  const applyPreset = (preset) => {
    setValue('currentMonthlySpending', preset.current);
    setValue('newMonthlySpending',     preset.reduced);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data: res } = await futureSelfApi.timeMachine({
        currentAge:                 profile?.age ?? 25,
        currentMonthlySpending:     data.currentMonthlySpending,
        newMonthlySpending:         data.newMonthlySpending,
        currentNpsBalance:          data.currentNpsBalance,
        currentMonthlyContribution: data.currentMonthlyContribution,
      });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-text-secondary text-sm font-body mb-8
                     hover:text-text-primary transition-colors"
        >
          ← Back
        </button>

        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold text-text-primary mb-1">
            ⏳ Time Machine
          </h1>
          <p className="text-text-secondary text-sm font-body">
            See how small daily choices compound into big retirement money.
          </p>
        </div>

        {/* Habit presets */}
        <div className="mb-5">
          <p className="text-xs text-muted font-body uppercase tracking-wide mb-2">Quick presets</p>
          <div className="flex gap-2 flex-wrap">
            {HABIT_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="text-xs bg-surface-2 border border-border rounded-full px-3 py-1.5
                           font-body text-text-secondary hover:border-gold/40 hover:text-gold
                           transition-all duration-200"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 card mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary font-body mb-1.5 uppercase tracking-wide">
                Current spend / mo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">₹</span>
                <input {...register('currentMonthlySpending')} type="number" inputMode="numeric"
                       placeholder="500" className="input-base pl-6 text-sm" />
              </div>
              {errors.currentMonthlySpending && (
                <p className="text-red-400 text-xs mt-1">{errors.currentMonthlySpending.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-text-secondary font-body mb-1.5 uppercase tracking-wide">
                Reduced spend / mo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">₹</span>
                <input {...register('newMonthlySpending')} type="number" inputMode="numeric"
                       placeholder="200" className="input-base pl-6 text-sm" />
              </div>
              {errors.newMonthlySpending && (
                <p className="text-red-400 text-xs mt-1">{errors.newMonthlySpending.message}</p>
              )}
            </div>
          </div>

          {/* Saving indicator */}
          {saving > 0 && (
            <div className="bg-sage/10 border border-sage/20 rounded-xl p-3 text-center">
              <p className="text-sage text-sm font-body">
                You'll redirect <span className="font-mono font-bold">{formatINR(saving)}</span>/month to NPS
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary font-body mb-1.5 uppercase tracking-wide">
                NPS Balance (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">₹</span>
                <input {...register('currentNpsBalance')} type="number" inputMode="numeric"
                       placeholder="0" className="input-base pl-6 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary font-body mb-1.5 uppercase tracking-wide">
                Monthly SIP (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">₹</span>
                <input {...register('currentMonthlyContribution')} type="number" inputMode="numeric"
                       placeholder="0" className="input-base pl-6 text-sm" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
            {loading ? <Spinner size="sm" /> : '⏳'}
            {loading ? 'Calculating...' : 'Show Me The Future'}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="card border-gold/30 glow-gold animate-fade-up">
            <p className="text-xs text-gold font-body uppercase tracking-widest mb-4">Result</p>

            <div className="text-center mb-6">
              <p className="text-muted text-sm font-body mb-1">Extra corpus at retirement</p>
              <p className="font-display text-4xl font-extrabold text-sage">
                +{formatINR(result.extraCorpusAt60)}
              </p>
            </div>

            <p className="text-text-secondary text-sm font-body text-center leading-relaxed mb-6 italic">
              "{result.message}"
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 rounded-xl p-3">
                <p className="text-muted text-[10px] uppercase tracking-wide font-body mb-1">Without change</p>
                <p className="font-mono text-text-primary font-bold">{formatINR(result.baseCorpusAt60)}</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-3">
                <p className="text-muted text-[10px] uppercase tracking-wide font-body mb-1">With change</p>
                <p className="font-mono text-sage font-bold">{formatINR(result.improvedCorpusAt60)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}