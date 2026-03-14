/**
 * components/onboarding/Step1Account.jsx
 * Email + password — register or login if existing user.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorBanner, Spinner } from '../ui/index.jsx';

const schema = yup.object({
  email:    yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function Step1Account({ onNext }) {
  const { register: registerUser, login, authLoading } = useAuth();
  const [mode,   setMode]  = useState('register'); // 'register' | 'login'
  const [apiErr, setApiErr] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setApiErr(null);
    const fn = mode === 'register' ? registerUser : login;
    const result = await fn(data);
    if (result.success) {
      onNext({ email: data.email });
    } else {
      setApiErr(result.error);
    }
  };

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-1">
        {mode === 'register' ? 'Create your account' : 'Welcome back'}
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6">
        {mode === 'register'
          ? 'Start building your future today.'
          : 'Log in to continue your journey.'}
      </p>

      {apiErr && <div className="mb-4"><ErrorBanner message={apiErr} onDismiss={() => setApiErr(null)} /></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            Email address
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="input-base"
          />
          {errors.email && <p className="mt-1.5 text-red-400 text-xs font-body">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
            Password
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="Min. 6 characters"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="input-base"
          />
          {errors.password && <p className="mt-1.5 text-red-400 text-xs font-body">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={authLoading} className="btn-primary mt-2 flex items-center justify-center gap-2">
          {authLoading ? <Spinner size="sm" /> : null}
          {mode === 'register' ? 'Create Account & Continue' : 'Log In & Continue'}
        </button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-text-secondary text-sm font-body mt-5">
        {mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
        <button
          type="button"
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setApiErr(null); }}
          className="text-gold hover:text-gold-dim font-medium transition-colors"
        >
          {mode === 'register' ? 'Log in' : 'Register'}
        </button>
      </p>
    </div>
  );
}