/**
 * pages/OnboardingPage.jsx
 * Orchestrates the 5-step onboarding flow.
 *
 * Steps:
 *   0 — Account (email + password)
 *   1 — Profile (age + income)
 *   2 — NPS Details (PRAN + balance + contribution)
 *   3 — Photo Upload ← NEW
 *   4 — Summary + Generate Future Self
 */
import { useState, useEffect } from 'react';
import { useNavigate }        from 'react-router-dom';
import { useAuth }            from '../context/AuthContext.jsx';
import { useUserData }        from '../context/UserDataContext.jsx';
import StepIndicator          from '../components/onboarding/StepIndicator.jsx';
import Step1Account           from '../components/onboarding/Step1Account.jsx';
import Step2Profile           from '../components/onboarding/Step2Profile.jsx';
import Step3NPS               from '../components/onboarding/Step3NPS.jsx';
import PhotoUploadStep        from '../components/onboarding/PhotoUploadStep.jsx';
import Step4Summary           from '../components/onboarding/Step4Summary.jsx';

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const { isAuthenticated, user } = useAuth();
  const { refresh }               = useUserData();
  const navigate                  = useNavigate();

  const [step,     setStep]     = useState(0);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isAuthenticated && user?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
    if (isAuthenticated && step === 0) {
      setStep(1);
    }
  }, [isAuthenticated]); // eslint-disable-line

  const handleNext = (data = {}) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleComplete = async () => {
    await refresh();
    navigate('/dashboard', { replace: true });
  };

  const stepProps = { onNext: handleNext, onBack: handleBack, initialData: formData };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-start px-5 py-10"
         style={{ background: '#F0F4FA' }}>

      {/* Logo */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <span className="font-display text-xl font-extrabold text-ink tracking-tight">
            FutureYou
          </span>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm card">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        <div key={step} className="animate-fade-up" style={{ animationDuration: '0.35s' }}>
          {step === 0 && <Step1Account {...stepProps} />}
          {step === 1 && <Step2Profile {...stepProps} />}
          {step === 2 && <Step3NPS     {...stepProps} />}
          {step === 3 && (
            <PhotoUploadStep
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 4 && (
            <Step4Summary
              onBack={handleBack}
              formData={formData}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>

      <p className="text-muted text-xs font-body text-center mt-6 max-w-xs leading-relaxed">
        FutureYou is for educational purposes only — not financial advice.
      </p>
    </div>
  );
}