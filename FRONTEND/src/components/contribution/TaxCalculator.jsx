/**
 * components/contribution/TaxCalculator.jsx
 *
 * Tax savings calculator card.
 * Calls /api/tax/calculate on debounced input change.
 * Displays 80C / 80CCD(1B) breakdown, slabs, tax saved, effective rate.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { taxApi }   from '../../services/api.js';
import { useToast } from '../shared/Toast.jsx';
import { Spinner, Skeleton } from '../ui/index.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatINR = (v) => {
  if (!v && v !== 0) return '—';
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(2)} L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
};

const MAX_80C      = 150_000;
const MAX_80CCD1B  = 50_000;
const TOTAL_MAX    = MAX_80C + MAX_80CCD1B;

// ── Deduction bar ─────────────────────────────────────────────────────────────
function DeductionBar({ label, amount, cap, color, delay = 0 }) {
  const pct = Math.min(100, Math.round((amount / cap) * 100));
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-text-secondary text-xs font-body">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted text-[10px] font-mono">cap {formatINR(cap)}</span>
          <span className="font-mono font-bold text-sm" style={{ color }}>
            {formatINR(amount)}
          </span>
        </div>
      </div>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Slab row ─────────────────────────────────────────────────────────────────
function SlabRow({ slab }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-text-secondary text-xs font-body">{slab.slab}</span>
      <div className="flex items-center gap-3">
        <span className="text-muted text-xs font-mono">{slab.rate}</span>
        <span className="text-text-primary text-xs font-mono font-medium">
          {formatINR(slab.taxableAmount)}
        </span>
      </div>
    </div>
  );
}

// ── Tax comparison box ────────────────────────────────────────────────────────
function TaxComparison({ taxWithout, taxWith, totalTaxSaved }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3">
        <p className="text-red-400/60 text-[10px] font-body uppercase tracking-wide mb-1">Without NPS</p>
        <p className="font-mono font-bold text-red-300 text-lg">{formatINR(taxWithout?.totalTax)}</p>
        <p className="text-red-400/40 text-[10px] font-body">incl. 4% cess</p>
      </div>
      <div className="bg-sage/8 border border-sage/20 rounded-xl p-3">
        <p className="text-sage/60 text-[10px] font-body uppercase tracking-wide mb-1">With NPS</p>
        <p className="font-mono font-bold text-sage text-lg">{formatINR(taxWith?.totalTax)}</p>
        <p className="text-sage/40 text-[10px] font-body">incl. 4% cess</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TaxCalculator() {
  const { addToast }    = useToast();
  const [income,        setIncome]       = useState('');
  const [contribution,  setContribution] = useState('');
  const [result,        setResult]       = useState(null);
  const [loading,       setLoading]      = useState(false);
  const debounceRef     = useRef(null);

  const calculate = useCallback(async (inc, contrib) => {
    const i = parseFloat(inc);
    const c = parseFloat(contrib);
    if (!i || i <= 0 || !c || c < 0) { setResult(null); return; }
    if (c * 12 > i) { addToast('Annual NPS contribution cannot exceed annual income', 'warning'); return; }

    setLoading(true);
    try {
      const { data } = await taxApi.calculate({
        annualIncome:    i,
        npsContribution: c * 12,   // convert monthly → annual for API
      });
      setResult(data);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0]?.msg ?? 'Calculation failed', 'error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Debounced live calculation on input change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (income && contribution) {
      debounceRef.current = setTimeout(() => calculate(income, contribution), 700);
    } else {
      setResult(null);
    }
    return () => clearTimeout(debounceRef.current);
  }, [income, contribution, calculate]);

  const annualContrib = parseFloat(contribution || 0) * 12;

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sage/15 border border-sage/25 flex items-center justify-center text-base">
          🧾
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
            Tax Savings Calculator
          </h2>
          <p className="text-muted text-[10px] font-body">Old tax regime · 80C + 80CCD(1B)</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-1.5">
            Annual Income
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={income}
              onChange={e => setIncome(e.target.value)}
              placeholder="e.g. 1200000"
              className="input-base pl-6"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-secondary font-body uppercase tracking-wide mb-1.5">
            Monthly NPS Contribution
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={contribution}
              onChange={e => setContribution(e.target.value)}
              placeholder="e.g. 5000"
              className="input-base pl-6"
            />
          </div>
          {contribution && (
            <p className="text-muted text-[10px] font-body mt-1">
              Annual: {formatINR(annualContrib)} · Max deduction: {formatINR(Math.min(annualContrib, TOTAL_MAX))}
            </p>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <span className="text-muted text-xs font-body">Calculating…</span>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-4 animate-fade-up">

          {/* Big savings number */}
          <div
            className="rounded-2xl p-4 text-center border"
            style={{
              background: 'linear-gradient(135deg, #0a1f14 0%, #0f2015 100%)',
              borderColor: 'rgba(110,231,183,0.2)',
            }}
          >
            <p className="text-sage/60 text-xs font-body uppercase tracking-widest mb-1">Total Tax Saved</p>
            <p className="font-display font-extrabold text-4xl text-sage leading-none">
              {formatINR(result.totalTaxSaved)}
            </p>
            <p className="text-sage/40 text-[10px] font-body mt-1">
              Effective rate: {result.effectiveTaxRate}% · Marginal: {result.marginalRate}
            </p>
          </div>

          {/* Deduction bars */}
          <div className="space-y-3">
            <p className="text-text-secondary text-[10px] font-body uppercase tracking-wide">Deduction Breakdown</p>
            <DeductionBar
              label="Section 80C (NPS portion)"
              amount={result.deduction80C}
              cap={MAX_80C}
              color="#f5c542"
              delay={0}
            />
            <DeductionBar
              label="Section 80CCD(1B) — Exclusive NPS"
              amount={result.deduction80CCD1B}
              cap={MAX_80CCD1B}
              color="#7dd3fc"
              delay={60}
            />
            {/* Total deduction summary */}
            <div className="flex justify-between items-center pt-1 border-t border-border">
              <span className="text-text-secondary text-xs font-body">Total Deduction</span>
              <span className="font-mono font-bold text-gold text-sm">
                {formatINR(result.totalDeduction)}
              </span>
            </div>
          </div>

          {/* Tax comparison */}
          <div>
            <p className="text-text-secondary text-[10px] font-body uppercase tracking-wide mb-2">Tax Comparison</p>
            <TaxComparison
              taxWithout={result.taxWithout}
              taxWith={result.taxWith}
              totalTaxSaved={result.totalTaxSaved}
            />
          </div>

          {/* Slab breakdown */}
          {result.slabBreakdown?.length > 0 && (
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-xs text-muted font-body hover:text-text-secondary transition-colors list-none">
                <span>Slab breakdown</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="transition-transform duration-200 group-open:rotate-180">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </summary>
              <div className="mt-3 space-y-0">
                {result.slabBreakdown.map((s, i) => <SlabRow key={i} slab={s} />)}
              </div>
            </details>
          )}

          <p className="text-muted text-[10px] font-body leading-relaxed">
            {result.note}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && income && contribution && (
        <p className="text-muted text-xs font-body text-center py-3">
          Enter valid income and contribution to see savings
        </p>
      )}
    </div>
  );
}