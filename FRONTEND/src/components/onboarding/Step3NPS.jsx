/**
 * components/onboarding/Step3NPS.jsx
 * PRAN (optional) + current NPS balance + monthly contribution.
 * NO API call here — data saved in Step4Summary alongside profile.
 */
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  pran: yup.string()
    .matches(/^[A-Z0-9]{12}$/i, 'PRAN must be 12 alphanumeric characters')
    .optional().transform((v) => v || undefined),
  currentNpsBalance: yup.number()
    .transform((v) => (isNaN(v) ? 0 : v)).min(0).default(0),
  monthlyContribution: yup.number()
    .transform((v) => (isNaN(v) ? 0 : v)).min(0).default(0),
});

export default function Step3NPS({ onNext, onBack, initialData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData,
  });

  // No API call — just advance with collected data
  const onSubmit = (data) => onNext(data);

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-ink mb-1">
        Your NPS details
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        All fields are optional — skip if you're just exploring.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            PRAN Number <span className="text-muted normal-case">(optional)</span>
          </label>
          <input
            {...register('pran')}
            type="text"
            placeholder="12-character alphanumeric"
            className="input-base font-mono tracking-widest"
            maxLength={12}
          />
          {errors.pran && <p className="mt-1.5 text-red-600 text-xs">{errors.pran.message}</p>}
        </div>

        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            Current NPS Balance (₹) <span className="text-muted normal-case">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
            <input
              {...register('currentNpsBalance')}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 50000"
              className="input-base pl-7"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            Monthly Contribution (₹) <span className="text-muted normal-case">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
            <input
              {...register('monthlyContribution')}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 2000"
              className="input-base pl-7"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="btn-ghost flex-1">← Back</button>
          <button type="submit" className="btn-primary flex-[2]">Continue →</button>
        </div>
      </form>
    </div>
  );
}