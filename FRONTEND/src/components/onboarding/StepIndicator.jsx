/**
 * components/onboarding/StepIndicator.jsx
 * Visual progress bar + step labels for the multi-step onboarding form.
 */
const STEP_LABELS = ['Account', 'Profile', 'NPS Details', 'Your Future'];

export default function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="mb-8">
      {/* Progress track */}
      <div className="flex items-center gap-0 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            {/* Dot */}
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold
              transition-all duration-400 shrink-0
              ${i < currentStep  ? 'bg-gold text-ink scale-90'      : ''}
              ${i === currentStep ? 'bg-gold text-ink ring-4 ring-gold/20 scale-110' : ''}
              ${i > currentStep  ? 'bg-surface-2 text-muted'        : ''}
            `}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {/* Connector line */}
            {i < totalSteps - 1 && (
              <div className="flex-1 h-px mx-1 transition-all duration-500"
                style={{ background: i < currentStep ? '#f5c542' : '#2a3452' }} />
            )}
          </div>
        ))}
      </div>
      {/* Labels */}
      <div className="flex justify-between px-0">
        {STEP_LABELS.map((label, i) => (
          <span key={i} className={`
            text-[10px] font-body transition-colors duration-300
            ${i === currentStep ? 'text-gold font-medium' : 'text-muted'}
          `} style={{ width: i === STEP_LABELS.length - 1 ? 'auto' : undefined }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}