/**
 * components/onboarding/Step4Summary.jsx
 * Shows a summary of all collected data, then calls /api/futureself/generate.
 */
import { useState } from 'react';
import { futureSelfApi } from '../../services/api.js';
import { userApi } from '../../services/api.js';
import { useUserData } from '../../context/UserDataContext.jsx';
import { formatINR, Spinner, ErrorBanner } from '../ui/index.jsx';

const Row = ({ label, value }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
    <span className="text-text-secondary text-sm font-body">{label}</span>
    <span className="text-text-primary text-sm font-mono font-medium">{value}</span>
  </div>
);

export default function Step4Summary({ onBack, formData, onComplete }) {
  const { saveFutureSelf } = useUserData();
  const [loading,  setLoading]  = useState(false);
  const [apiErr,   setApiErr]   = useState(null);
  const [genState, setGenState] = useState('idle'); // 'idle' | 'saving' | 'generating' | 'done'

  const { email, age, income, pran, currentNpsBalance, monthlyContribution } = formData;

  const handleGenerate = async () => {
    setLoading(true);
    setApiErr(null);
    try {
      // Save onboarding complete flag
      setGenState('saving');
      await userApi.updateProfile({ onboardingCompleted: true });

      // Generate future self
      setGenState('generating');
      const { data } = await futureSelfApi.generate({
        age:                 age ?? 25,
        currentNpsBalance:   currentNpsBalance ?? 0,
        monthlyContribution: monthlyContribution ?? 0,
      });

      saveFutureSelf(data);
      setGenState('done');

      // Brief pause so user sees the "done" state
      setTimeout(() => onComplete(data), 800);
    } catch (err) {
      setApiErr(err.response?.data?.error ?? 'Generation failed. You can retry from the dashboard.');
      setGenState('idle');
    } finally {
      setLoading(false);
    }
  };

  const stateMessages = {
    saving:     'Saving your profile...',
    generating: 'Summoning your future self ✨',
    done:       'Welcome to your future! 🎉',
  };

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-1">
        You're all set.
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        Here's what we know about you. Ready to meet your future self?
      </p>

      {apiErr && <div className="mb-4"><ErrorBanner message={apiErr} onDismiss={() => setApiErr(null)} /></div>}

      {/* Summary card */}
      <div className="card mb-6">
        <Row label="Email"               value={email ?? '—'} />
        <Row label="Age"                 value={age ? `${age} years` : '—'} />
        <Row label="Monthly Income"      value={income ? formatINR(income) : '—'} />
        <Row label="PRAN"                value={pran ?? 'Not linked'} />
        <Row label="NPS Balance"         value={currentNpsBalance ? formatINR(currentNpsBalance) : '₹0'} />
        <Row label="Monthly Contribution" value={monthlyContribution ? formatINR(monthlyContribution) + '/mo' : '₹0'} />
      </div>

      {/* Loading state overlay within the button area */}
      {genState !== 'idle' && genState !== 'done' ? (
        <div className="card text-center py-8 mb-4 glow-gold">
          <div className="flex justify-center mb-3">
            <Spinner size="lg" />
          </div>
          <p className="text-gold font-display font-semibold animate-pulse-slow">
            {stateMessages[genState]}
          </p>
        </div>
      ) : genState === 'done' ? (
        <div className="card text-center py-8 mb-4 border-sage/40 glow-frost">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-sage font-display font-semibold">{stateMessages.done}</p>
        </div>
      ) : null}

      {/* Actions */}
      {genState === 'idle' && (
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="btn-ghost flex-1">← Back</button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary flex-[2] flex items-center justify-center gap-2 text-base"
          >
            ✨ Generate My Future Self
          </button>
        </div>
      )}
    </div>
  );
}