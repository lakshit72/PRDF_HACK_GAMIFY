/**
 * components/onboarding/Step3NPS.jsx
 * PRAN (optional) + current NPS balance + monthly contribution.
 */
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { userApi } from '../../services/api.js';
import { contributeApi } from '../../services/api.js';
import { useState } from 'react';
import { ErrorBanner, Spinner } from '../ui/index.jsx';

const schema = yup.object({
  pran: yup.string()
    .matches(/^[A-Z0-9]{12}$/i, 'PRAN must be 12 alphanumeric characters')
    .optional().transform((v) => v || undefined),
  currentNpsBalance:   yup.number()
    .transform((v) => (isNaN(v) ? 0 : v))
    .min(0, 'Balance cannot be negative')
    .default(0),
  monthlyContribution: yup.number()
    .transform((v) => (isNaN(v) ? 0 : v))
    .min(0, 'Cannot be negative')
    .default(0),
});

export default function Step3NPS({ onNext, onBack, initialData }) {
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
      // Save PRAN if provided
      if (data.pran) {
        await contributeApi.linkPran({ pran: data.pran });
      }
      onNext(data);
    } catch (err) {
      setApiErr(err.response?.data?.error ?? 'Could not save NPS details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-1">
        Your NPS details
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        All fields are optional — skip if you're just exploring.
      </p>

      {apiErr && <div className="mb-4"><ErrorBanner message={apiErr} onDismiss={() => setApiErr(null)} /></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* PRAN */}
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
          {errors.pran && <p className="mt-1.5 text-red-400 text-xs font-body">{errors.pran.message}</p>}
          <p className="mt-1.5 text-muted text-xs font-body">Find your PRAN in your NPS account statement</p>
        </div>

        {/* Current balance */}
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
          {errors.currentNpsBalance && <p className="mt-1.5 text-red-400 text-xs">{errors.currentNpsBalance.message}</p>}
        </div>

        {/* Monthly contribution */}
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
          {errors.monthlyContribution && <p className="mt-1.5 text-red-400 text-xs">{errors.monthlyContribution.message}</p>}
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