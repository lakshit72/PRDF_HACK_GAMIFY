/**
 * components/onboarding/Step4Summary.jsx
 *
 * Final onboarding step — shows a summary of collected data, then:
 *  1. Saves profile (age, income, pran, onboardingCompleted) to backend
 *  2. Links PRAN if provided
 *  3. Calls /api/futureself/generate
 *
 * This is the ONLY step that makes API calls — all previous steps
 * collect data locally to avoid 401 errors before the token is ready.
 */
import { useState } from 'react';
import { futureSelfApi, userApi, contributeApi } from '../../services/api.js';
import { useUserData } from '../../context/UserDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatINR, Spinner } from '../ui/index.jsx';

const Row = ({ label, value }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
    <span className="text-text-secondary text-sm font-body">{label}</span>
    <span className="text-ink text-sm font-mono font-medium">{value}</span>
  </div>
);

export default function Step4Summary({ onBack, formData, onComplete }) {
  const { saveFutureSelf }    = useUserData();
  const { updateUser }        = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [stage,    setStage]    = useState('idle'); // idle | saving | generating | done
  const [error,    setError]    = useState(null);

  const { email, age, income, pran, currentNpsBalance, monthlyContribution } = formData;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      // ── 1. Save profile fields ──────────────────────────────────────────
      setStage('saving');
      const profileUpdates = {
        onboardingCompleted: true,
        ...(age    !== undefined && { age:    Number(age)    }),
        ...(income !== undefined && { income: Number(income) }),
        ...(pran                 && { pran:   pran.toUpperCase() }),
      };
      await userApi.updateProfile(profileUpdates);
      updateUser(profileUpdates);

      // ── 2. Link PRAN separately if provided ────────────────────────────
      if (pran) {
        try {
          await contributeApi.linkPran({ pran: pran.toUpperCase() });
        } catch {
          // Non-fatal — PRAN already saved via profile update
        }
      }

      // ── 3. Generate future self ────────────────────────────────────────
      setStage('generating');
      const { data } = await futureSelfApi.generate({
        age:                 Number(age)    || 25,
        currentNpsBalance:   Number(currentNpsBalance)   || 0,
        monthlyContribution: Number(monthlyContribution) || 0,
      });

      saveFutureSelf(data);
      setStage('done');
      setTimeout(() => onComplete(data), 700);

    } catch (err) {
      const msg = err.response?.data?.error ?? 'Something went wrong. Please try again.';
      setError(msg);
      setStage('idle');
    } finally {
      setLoading(false);
    }
  };

  const stageMsg = {
    saving:     'Saving your profile...',
    generating: 'Summoning your future self ✨',
    done:       'Welcome to your future! 🎉',
  };

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-ink mb-1">
        You're all set.
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        Here's what we know about you. Ready to meet your future self?
      </p>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <span className="text-red-500 shrink-0 text-sm">⚠</span>
          <p className="text-red-700 text-sm font-body">{error}</p>
        </div>
      )}

      {/* Summary */}
      <div className="card mb-6">
        <Row label="Email"                value={email ?? '—'} />
        <Row label="Age"                  value={age ? `${age} years` : '—'} />
        <Row label="Monthly Income"       value={income ? formatINR(Number(income)) : '—'} />
        <Row label="PRAN"                 value={pran ?? 'Not linked'} />
        <Row label="NPS Balance"          value={currentNpsBalance ? formatINR(Number(currentNpsBalance)) : '₹0'} />
        <Row label="Monthly Contribution" value={monthlyContribution ? `${formatINR(Number(monthlyContribution))}/mo` : '₹0'} />
      </div>

      {/* Loading progress */}
      {stage !== 'idle' && (
        <div className={`rounded-xl p-5 text-center mb-4 border ${
          stage === 'done'
            ? 'border-green-200 bg-green-50'
            : 'border-border bg-surface-2'
        }`}>
          {stage !== 'done' && (
            <div className="flex justify-center mb-2">
              <Spinner size="lg" />
            </div>
          )}
          {stage === 'done' && <p className="text-3xl mb-1">🎉</p>}
          <p className={`font-display font-bold text-sm ${
            stage === 'done' ? 'text-green-700' : 'text-ink'
          }`}>
            {stageMsg[stage]}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {stage === 'idle' && (
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="btn-ghost flex-1">← Back</button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary flex-[2] flex items-center justify-center gap-2"
          >
            ✨ Generate My Future Self
          </button>
        </div>
      )}
    </div>
  );
}