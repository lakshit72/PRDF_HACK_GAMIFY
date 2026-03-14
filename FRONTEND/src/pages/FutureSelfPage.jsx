/**
 * pages/FutureSelfPage.jsx
 * Full-page view of the AI-generated future self letter and projections.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '../context/UserDataContext.jsx';
import { futureSelfApi } from '../services/api.js';
import { formatINR, Spinner, ErrorBanner } from '../components/ui/index.jsx';

const StatPill = ({ label, value, color = 'text-gold' }) => (
  <div className="bg-surface-2 rounded-xl p-4 text-center">
    <p className="text-muted text-[10px] uppercase tracking-widest font-body mb-1">{label}</p>
    <p className={`font-mono font-bold text-lg ${color}`}>{value}</p>
  </div>
);

export default function FutureSelfPage() {
  const { futureSelf, profile, saveFutureSelf } = useUserData();
  const navigate = useNavigate();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const { data } = await futureSelfApi.generate({
        age:                 profile?.age ?? 25,
        currentNpsBalance:   0,
        monthlyContribution: 0,
      });
      saveFutureSelf(data);
    } catch (err) {
      setError('Could not regenerate. Please try again.');
    } finally {
      setRegenerating(false);
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
          ← Back to Dashboard
        </button>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔮</div>
          <h1 className="font-display text-3xl font-extrabold text-text-primary mb-2">
            Your Future Self
          </h1>
          <p className="text-text-secondary text-sm font-body">
            At age 60, based on your current NPS journey
          </p>
        </div>

        {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

        {futureSelf ? (
          <>
            {/* Corpus stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatPill
                label="Projected Corpus"
                value={formatINR(futureSelf.projectedCorpus)}
                color="text-gold"
              />
              <StatPill
                label="Today's Value"
                value={formatINR(futureSelf.inflationAdjustedCorpus)}
                color="text-frost"
              />
            </div>

            {/* Avatar description */}
            <div className="card mb-4 border-gold/20"
                 style={{ background: 'linear-gradient(135deg, #161d2e 0%, #1e2339 100%)' }}>
              <p className="text-xs text-gold font-body uppercase tracking-widest mb-2">Portrait</p>
              <p className="text-text-primary font-body text-base leading-relaxed italic">
                "{futureSelf.avatarDescription}"
              </p>
            </div>

            {/* Letter */}
            <div className="card mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gold/40 rounded-l-2xl" />
              <p className="text-xs text-muted font-body uppercase tracking-widest mb-3 pl-3">
                A letter from your 60-year-old self
              </p>
              <p className="text-text-secondary font-body text-sm leading-relaxed pl-3 whitespace-pre-line">
                {futureSelf.futureLetter}
              </p>
              <p className="text-right text-gold text-sm font-body font-medium mt-4 pr-1">
                — Future You
              </p>
            </div>

            {/* Meta */}
            {futureSelf.meta && (
              <div className="text-center mb-6">
                <p className="text-muted text-xs font-body">
                  Based on {futureSelf.meta.assumedAnnualReturn} annual return ·{' '}
                  {futureSelf.meta.assumedInflation} inflation ·{' '}
                  {futureSelf.meta.yearsToRetirement} years to retirement
                </p>
              </div>
            )}

            {/* Regenerate */}
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-ghost w-full flex items-center justify-center gap-2"
            >
              {regenerating ? <Spinner size="sm" /> : '✨'}
              {regenerating ? 'Regenerating...' : 'Regenerate Letter'}
            </button>
          </>
        ) : (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-text-secondary font-body text-sm mb-4">
              Complete onboarding to meet your future self.
            </p>
            <button onClick={() => navigate('/onboarding')} className="btn-primary w-auto px-8">
              Start Onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}