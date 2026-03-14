/**
 * components/onboarding/Step2Profile.jsx
 * Age + monthly income.
 */
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { userApi } from '../../services/api.js';
import { useState } from 'react';
import { ErrorBanner, Spinner } from '../ui/index.jsx';

const schema = yup.object({
  age:    yup.number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .min(18, 'Must be at least 18').max(59, 'Must be under 60')
    .required('Age is required'),
  income: yup.number()
    .transform((v) => (isNaN(v) ? undefined : v))
    .min(1, 'Enter your monthly income')
    .required('Monthly income is required'),
});

export default function Step2Profile({ onNext, onBack, initialData }) {
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData,
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setApiErr(null);
    try {
      await userApi.updateProfile({ age: data.age, income: data.income });
      onNext(data);
    } catch (err) {
      setApiErr(err.response?.data?.error ?? 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-1">
        Tell us about yourself
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        This helps us project your retirement corpus accurately.
      </p>

      {apiErr && <div className="mb-4"><ErrorBanner message={apiErr} onDismiss={() => setApiErr(null)} /></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Age */}
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
          {errors.age && <p className="mt-1.5 text-red-400 text-xs font-body">{errors.age.message}</p>}
        </div>

        {/* Income */}
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
          {errors.income && <p className="mt-1.5 text-red-400 text-xs font-body">{errors.income.message}</p>}
          <p className="mt-1.5 text-muted text-xs font-body">Enter your take-home monthly salary</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="btn-ghost flex-1">← Back</button>
          <button type="submit" disabled={loading} className="btn-primary flex-[2] flex items-center justify-center gap-2">
            {loading ? <Spinner size="sm" /> : null}
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}