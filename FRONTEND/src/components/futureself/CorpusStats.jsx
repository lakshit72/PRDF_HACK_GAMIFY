/**
 * components/futureself/CorpusStats.jsx
 * Large animated number display for projected and inflation-adjusted corpus.
 */
import { useEffect, useState } from 'react';

const formatINR = (amount) => {
  if (amount >= 1_00_00_000) return { value: (amount / 1_00_00_000).toFixed(2), suffix: 'Cr' };
  if (amount >= 1_00_000)    return { value: (amount / 1_00_000).toFixed(2),    suffix: 'L'  };
  return { value: amount.toLocaleString('en-IN'), suffix: '' };
};

function AnimatedNumber({ target, duration = 1200 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  const { value, suffix } = formatINR(current);
  return (
    <span>
      <span className="font-mono font-extrabold tabular-nums">₹{value}</span>
      {suffix && <span className="font-display font-bold ml-1 text-[0.7em] opacity-80">{suffix}</span>}
    </span>
  );
}

export default function CorpusStats({ projectedCorpus, inflationAdjustedCorpus, meta }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Projected nominal */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden border border-gold/20"
        style={{ background: 'linear-gradient(135deg, #1a1500 0%, #1e1a00 100%)' }}
      >
        <div className="absolute inset-0 bg-gradient-radial from-gold/8 to-transparent pointer-events-none" />
        <p className="text-gold/60 text-[10px] uppercase tracking-widest font-body mb-2">
          At Retirement
        </p>
        <div className="text-gold text-3xl leading-tight">
          <AnimatedNumber target={projectedCorpus} />
        </div>
        <p className="text-gold/40 text-xs font-body mt-1">Nominal future value</p>

        {meta && (
          <div className="mt-3 pt-3 border-t border-gold/10">
            <p className="text-gold/50 text-[10px] font-body">
              {meta.yearsToRetirement} yrs · {meta.assumedAnnualReturn} return
            </p>
          </div>
        )}
      </div>

      {/* Inflation adjusted */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden border border-frost/20"
        style={{ background: 'linear-gradient(135deg, #001520 0%, #001a27 100%)' }}
      >
        <div className="absolute inset-0 bg-gradient-radial from-frost/6 to-transparent pointer-events-none" />
        <p className="text-frost/60 text-[10px] uppercase tracking-widest font-body mb-2">
          Today's Purchasing Power
        </p>
        <div className="text-frost text-3xl leading-tight">
          <AnimatedNumber target={inflationAdjustedCorpus} />
        </div>
        <p className="text-frost/40 text-xs font-body mt-1">After {meta?.assumedInflation ?? '6%'} inflation</p>

        {meta && (
          <div className="mt-3 pt-3 border-t border-frost/10">
            <p className="text-frost/50 text-[10px] font-body">
              Real value in today's rupees
            </p>
          </div>
        )}
      </div>
    </div>
  );
}