/**
 * components/onboarding/StepIndicator.jsx
 * Visual progress bar + step labels for the multi-step onboarding form.
 * Updated to support 5 steps (photo upload added as step 3).
 */
const STEP_LABELS = ['Account', 'Profile', 'NPS', 'Photo', 'Your Future'];

export default function StepIndicator({ currentStep, totalSteps }) {
  const labels = STEP_LABELS.slice(0, totalSteps);

  return (
    <div className="mb-8">
      {/* Progress track */}
      <div className="flex items-center gap-0 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold
              transition-all duration-400 shrink-0
              ${i < currentStep  ? 'bg-gold text-ink scale-90'      : ''}
              ${i === currentStep ? 'bg-gold text-ink ring-4 ring-gold/20 scale-110' : ''}
              ${i > currentStep  ? 'bg-surface-2 text-muted'        : ''}
            `}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div
                className="flex-1 h-px mx-1 transition-all duration-500"
                style={{ background: i < currentStep ? '#F47920' : '#C8D6E8' }}
              />
            )}
          </div>
        ))}
      </div>
      {/* Labels */}
      <div className="flex justify-between px-0">
        {labels.map((label, i) => (
          <span key={i} className={`
            text-[10px] font-body transition-colors duration-300
            ${i === currentStep ? 'text-gold font-medium' : 'text-muted'}
          `}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}