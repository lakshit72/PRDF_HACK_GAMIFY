import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 text-center">
      <p className="text-6xl mb-4">🌌</p>
      <h1 className="font-display text-3xl font-extrabold text-text-primary mb-2">404</h1>
      <p className="text-text-secondary font-body text-sm mb-8">
        This page doesn't exist — even in your future.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary w-auto px-8">
        Back to Dashboard
      </button>
    </div>
  );
}