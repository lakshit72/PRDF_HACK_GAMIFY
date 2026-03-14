/**
 * components/dashboard/QuickActions.jsx
 * 2×2 grid of action tiles navigating to key features.
 */
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  {
    id:    'time-machine',
    icon:  '⏳',
    label: 'Time Machine',
    sub:   'See the cost of habits',
    path:  '/time-machine',
    accent: '#f5c542',
  },
  {
    id:    'learn',
    icon:  '📚',
    label: 'Learn',
    sub:   'Quizzes & modules',
    path:  '/learn',
    accent: '#7dd3fc',
  },
  {
    id:    'tribes',
    icon:  '🏕️',
    label: 'Tribes',
    sub:   'Join your community',
    path:  '/tribes',
    accent: '#6ee7b7',
  },
  {
    id:    'contribute',
    icon:  '💰',
    label: 'Contribute',
    sub:   'Add to your NPS',
    path:  '/contribute',
    accent: '#fb923c',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div>
      <h3 className="font-display text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className="card-sm text-left active:scale-95 transition-all duration-150
                       hover:border-border/80 group relative overflow-hidden"
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
              style={{ background: `radial-gradient(circle at 20% 50%, ${action.accent}10 0%, transparent 70%)` }}
            />

            <span className="text-2xl block mb-2">{action.icon}</span>
            <p className="font-display text-sm font-bold text-text-primary leading-tight mb-0.5">
              {action.label}
            </p>
            <p className="text-muted text-xs font-body leading-tight">{action.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}