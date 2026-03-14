/**
 * pages/Contribute.jsx
 *
 * Full contribution page combining:
 *   1. Tax Savings Calculator
 *   2. Make a Contribution (one-time / monthly)
 *   3. Auto-Debit Setup
 *   4. Contribution History
 *
 * Plus: PRAN link shortcut if not yet linked.
 */
import { useState, useCallback } from 'react';
import { useNavigate }        from 'react-router-dom';
import { useAuth }            from '../context/AuthContext.jsx';
import { useToast }           from '../components/shared/Toast.jsx';
import { contributeApi }      from '../services/api.js';
import TaxCalculator          from '../components/contribution/TaxCalculator.jsx';
import ContributeForm, { ContributionHistory } from '../components/contribution/ContributeForm.jsx';
import { Spinner }            from '../components/ui/index.jsx';

// ── PRAN link banner ──────────────────────────────────────────────────────────
function PranBanner({ onLinked }) {
  const { addToast }     = useToast();
  const { user, updateUser } = useAuth();
  const [pran,   setPran]   = useState('');
  const [loading,setLoading]= useState(false);
  const [show,   setShow]   = useState(!user?.pran);

  if (!show) return null;

  const handleLink = async () => {
    const trimmed = pran.trim().toUpperCase();
    if (!/^[A-Z0-9]{12}$/i.test(trimmed)) {
      addToast('PRAN must be exactly 12 alphanumeric characters', 'warning');
      return;
    }
    setLoading(true);
    try {
      await contributeApi.linkPran({ pran: trimmed });
      updateUser({ pran: trimmed });
      addToast('🪪 PRAN linked successfully!', 'success');
      setShow(false);
      onLinked?.();
    } catch (err) {
      addToast(err.response?.data?.error ?? 'Could not link PRAN', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-4 border mb-4 animate-fade-up relative overflow-hidden"
      style={{
        background:  'linear-gradient(135deg, #1a1500 0%, #161200 100%)',
        borderColor: 'rgba(245,197,66,0.25)',
      }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(245,197,66,0.08) 0%, transparent 70%)' }} />
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🪪</span>
        <div className="flex-1 min-w-0">
          <p className="text-gold font-display font-bold text-sm mb-0.5">Link your PRAN</p>
          <p className="text-muted text-xs font-body mb-3">
            Linking your PRAN boosts your NPS Readiness Score and enables full tracking.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pran}
              onChange={e => setPran(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
              placeholder="12-char PRAN"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2
                         text-text-primary text-sm font-mono placeholder-muted
                         focus:outline-none focus:border-gold/50 transition-all"
              maxLength={12}
            />
            <button
              onClick={handleLink}
              disabled={loading || pran.length !== 12}
              className="px-3 py-2 rounded-xl font-body text-xs font-medium border transition-all duration-200
                         border-gold/40 bg-gold/10 text-gold hover:bg-gold/15 active:scale-95
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {loading ? <Spinner size="sm" /> : '→ Link'}
            </button>
          </div>
        </div>
        <button onClick={() => setShow(false)} className="text-muted hover:text-text-secondary text-lg leading-none shrink-0">×</button>
      </div>
    </div>
  );
}

// ── Section tab navigation ────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'tax',        label: '🧾 Tax',        icon: '🧾' },
  { id: 'contribute', label: '💰 Contribute',  icon: '💰' },
  { id: 'history',    label: '📜 History',     icon: '📜' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Contribute() {
  const navigate              = useNavigate();
  const [activeSection, setActiveSection] = useState('tax');
  const [historyKey,    setHistoryKey]    = useState(0);

  const triggerHistoryRefresh = useCallback(() => {
    setHistoryKey(k => k + 1);
  }, []);

  return (
    <div className="min-h-dvh">
      {/* Ambient */}
      <div
        className="fixed inset-x-0 top-0 h-80 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(110,231,183,0.06) 0%, transparent 60%),' +
            'radial-gradient(ellipse 45% 40% at 85% 25%, rgba(245,197,66,0.04) 0%, transparent 55%)',
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
          <span className="text-4xl">💳</span>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight leading-tight">
              Contribute
            </h1>
            <p className="text-text-secondary text-sm font-body">Calculate, contribute, and automate your NPS</p>
          </div>
        </div>

        {/* PRAN banner */}
        <PranBanner />

        {/* Section tabs */}
        <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1 mb-5">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`
                flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all duration-200
                ${activeSection === s.id
                  ? 'bg-surface border border-border text-text-primary shadow-sm'
                  : 'text-muted hover:text-text-secondary'
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="animate-fade-in" style={{ animationDuration: '0.2s' }} key={activeSection}>
          {activeSection === 'tax' && (
            <TaxCalculator />
          )}

          {activeSection === 'contribute' && (
            <ContributeForm onHistoryRefresh={triggerHistoryRefresh} />
          )}

          {activeSection === 'history' && (
            <ContributionHistory refreshTrigger={historyKey} />
          )}
        </div>

        {/* Bottom tips */}
        {activeSection === 'tax' && (
          <div className="mt-4 bg-frost/5 border border-frost/15 rounded-xl p-3 animate-fade-up">
            <p className="text-frost/70 text-xs font-body leading-relaxed">
              💡 <strong className="text-frost/90">Tip:</strong> Contribute at least ₹6,000/year (₹500/month) to keep your NPS Tier I account active. Contributions up to ₹2L/year give you the maximum tax benefit.
            </p>
          </div>
        )}

        {activeSection === 'contribute' && (
          <div className="mt-4 bg-gold/5 border border-gold/15 rounded-xl p-3 animate-fade-up">
            <p className="text-gold/70 text-xs font-body leading-relaxed">
              🔒 <strong className="text-gold/90">Mock Gateway:</strong> This is a demo NPS gateway. No real money is transferred. Your contribution is logged for demonstration purposes.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}