/**
 * components/onboarding/Step2Profile.jsx
 * Age + monthly income — stored in local form state only.
 * NO API call here. Data is saved to the backend in Step4Summary.
 */
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  age: yup.number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .min(18, 'Must be at least 18').max(59, 'Must be under 60')
    .required('Age is required'),
  income: yup.number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .min(1, 'Enter your monthly income')
    .required('Monthly income is required'),
});

export default function Step2Profile({ onNext, onBack, initialData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData,
  });

  // No API call — just advance with the collected data
  const onSubmit = (data) => onNext(data);

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-ink mb-1">
        Tell us about yourself
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        This helps us project your retirement corpus accurately.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            Current Age
          </label>
          <input
            {...register('age')}
            type="number"
            inputMode="numeric"
            placeholder="e.g. 28"
            className="input-base"
          />
          {errors.age && <p className="mt-1.5 text-red-600 text-xs">{errors.age.message}</p>}
        </div>

        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            Monthly Income (₹)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">₹</span>
            <input
              {...register('income')}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 75000"
              className="input-base pl-7"
            />
          </div>
          {errors.income && <p className="mt-1.5 text-red-600 text-xs">{errors.income.message}</p>}
          <p className="mt-1.5 text-muted text-xs font-body">Enter your take-home monthly salary</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="btn-ghost flex-1">← Back</button>
          <button type="submit" className="btn-primary flex-[2]">Continue →</button>
        </div>
      </form>
    </div>
  );
}