/**
 * pages/OnboardingPage.jsx
 *
 * Fixed: useEffect no longer resets step when user context updates mid-onboarding.
 * We track whether the user has intentionally started the flow with `hasStarted`
 * ref, and only allow the redirect guard to fire before the flow begins.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate }   from 'react-router-dom';
import { useAuth }       from '../context/AuthContext.jsx';
import { useUserData }   from '../context/UserDataContext.jsx';
import StepIndicator     from '../components/onboarding/StepIndicator.jsx';
import Step1Account      from '../components/onboarding/Step1Account.jsx';
import Step2Profile      from '../components/onboarding/Step2Profile.jsx';
import Step3NPS          from '../components/onboarding/Step3NPS.jsx';
import PhotoUploadStep   from '../components/onboarding/PhotoUploadStep.jsx';
import Step4Summary      from '../components/onboarding/Step4Summary.jsx';

const TOTAL_STEPS   = 5;
const STEP_STORAGE  = 'fy_onboarding_step';
const DATA_STORAGE  = 'fy_onboarding_data';

export default function OnboardingPage() {
  const { isAuthenticated, user } = useAuth();
  const { refresh }               = useUserData();
  const navigate                  = useNavigate();

  // Persist step in sessionStorage so refresh doesn't lose progress
  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem(STEP_STORAGE);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DATA_STORAGE);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Track whether redirect guard has already run so it doesn't fire
  // again when user context updates mid-flow (e.g. after photo upload)
  const redirectChecked = useRef(false);

  useEffect(() => {
    if (redirectChecked.current) return; // only run once

    if (isAuthenticated && user?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (isAuthenticated && step === 0) {
      const nextStep = 1;
      setStep(nextStep);
      sessionStorage.setItem(STEP_STORAGE, nextStep);
    }

    redirectChecked.current = true;
  }, [isAuthenticated, user?.onboardingCompleted]); // eslint-disable-line

  const handleNext = (data = {}) => {
    const nextStep   = Math.min(step + 1, TOTAL_STEPS - 1);
    const nextData   = { ...formData, ...data };
    setFormData(nextData);
    setStep(nextStep);
    sessionStorage.setItem(STEP_STORAGE, nextStep);
    sessionStorage.setItem(DATA_STORAGE, JSON.stringify(nextData));
  };

  const handleBack = () => {
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    sessionStorage.setItem(STEP_STORAGE, prevStep);
  };

  const handleComplete = async () => {
    // Clear saved onboarding state
    sessionStorage.removeItem(STEP_STORAGE);
    sessionStorage.removeItem(DATA_STORAGE);
    await refresh();
    navigate('/dashboard', { replace: true });
  };

  const stepProps = { onNext: handleNext, onBack: handleBack, initialData: formData };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-start px-5 py-10"
         style={{ background: '#F0F4FA' }}>

      <div className="w-full max-w-sm mb-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <span className="font-display text-xl font-extrabold text-ink tracking-tight">
            FutureYou
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm card">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        <div key={step} className="animate-fade-up" style={{ animationDuration: '0.3s' }}>
          {step === 0 && <Step1Account {...stepProps} />}
          {step === 1 && <Step2Profile {...stepProps} />}
          {step === 2 && <Step3NPS     {...stepProps} />}
          {step === 3 && <PhotoUploadStep onNext={handleNext} onBack={handleBack} />}
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