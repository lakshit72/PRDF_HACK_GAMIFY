/**
 * pages/LoginPage.jsx — NPS institutional theme.
 * Matches eNPS portal design: navy header, white card, saffron CTA.
 */
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/ui/index.jsx';

const schema = yup.object({
  email:    yup.string().email('Enter a valid email address').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const { login, isAuthenticated, authLoading, authError } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-dvh flex flex-col" style={{ background: '#F0F4FA' }}>

      {/* NPS institutional header */}
      <header className="nps-header">
        <div className="tricolor-bar" />
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20
                          flex items-center justify-center text-xl">
            🔮
          </div>
          <div>
            <p className="text-white font-display font-bold text-lg leading-tight tracking-wide">
              FutureYou
            </p>
            <p className="text-white/60 text-[10px] font-body tracking-widest uppercase">
              NPS Companion App
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* Welcome banner */}
        <div className="w-full max-w-sm mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-ink mb-1">
            Subscriber Login
          </h1>
          <p className="text-text-secondary text-sm font-body">
            Access your National Pension System dashboard
          </p>
          <div className="tricolor-bar mt-3 mx-auto w-20" />
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm card">

          {authError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="text-red-500 text-sm shrink-0">⚠</span>
              <p className="text-red-700 text-sm font-body">{authError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-semibold text-ink mb-1.5 uppercase tracking-wide">
                Email / PRAN-linked Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="subscriber@example.com"
                autoComplete="email"
                className="input-base"
              />
              {errors.email && (
                <p className="mt-1 text-red-600 text-xs font-body">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-body font-semibold text-ink mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className="input-base"
              />
              {errors.password && (
                <p className="mt-1 text-red-600 text-xs font-body">{errors.password.message}</p>
              )}
            </div>

            <button type="submit" disabled={authLoading}
                    className="btn-primary flex items-center justify-center gap-2 mt-2">
              {authLoading && <Spinner size="sm" />}
              {authLoading ? 'Logging In...' : 'LOGIN'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-text-secondary text-sm font-body">
              New subscriber?{' '}
              <Link to="/onboarding"
                    className="font-semibold transition-colors"
                    style={{ color: '#F47920' }}>
                Register Now
              </Link>
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="info-banner w-full max-w-sm mt-4">
          <span className="text-blue-600 text-sm shrink-0">ℹ</span>
          <p className="text-blue-800 text-xs font-body leading-relaxed">
            FutureYou is an educational companion app. It is not affiliated with PFRDA or the official eNPS portal. For actual NPS transactions, visit{' '}
            <a href="https://enps.nsdl.com" className="underline font-medium" target="_blank" rel="noreferrer">
              enps.nsdl.com
            </a>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#001F4D', borderTop: '3px solid #F47920' }}>
        <div className="text-center py-3">
          <p className="text-white/40 text-[10px] font-body">
            © 2024 FutureYou · Built on NPS data and PFRDA guidelines · Not an official government portal
          </p>
        </div>
      </footer>
    </div>
  );
}