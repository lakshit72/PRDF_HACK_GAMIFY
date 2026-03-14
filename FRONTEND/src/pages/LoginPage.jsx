/**
 * pages/LoginPage.jsx
 * Standalone login page for returning users.
 * Redirects to /dashboard if already authenticated.
 */
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner, Spinner } from '../components/ui/index.jsx';

const schema = yup.object({
  email:    yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const { login, isAuthenticated, authLoading, authError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      navigate(result.user.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-3xl">🔮</span>
          <span className="font-display text-2xl font-extrabold text-text-primary tracking-tight">
            FutureYou
          </span>
        </div>
        <p className="text-text-secondary text-sm font-body">
          See your future self. Build it today.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm card">
        <h2 className="font-display text-xl font-bold text-text-primary mb-1">Welcome back</h2>
        <p className="text-text-secondary text-sm font-body mb-6">Log in to continue your journey.</p>

        {authError && (
          <div className="mb-4">
            <ErrorBanner message={authError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="input-base"
            />
            {errors.email && <p className="mt-1.5 text-red-400 text-xs">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5 tracking-wide uppercase">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="input-base"
            />
            {errors.password && <p className="mt-1.5 text-red-400 text-xs">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={authLoading} className="btn-primary flex items-center justify-center gap-2 mt-2">
            {authLoading && <Spinner size="sm" />}
            Log In
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm font-body mt-5">
          New here?{' '}
          <Link to="/onboarding" className="text-gold hover:text-gold-dim font-medium transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}