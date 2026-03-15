/**
 * components/dashboard/QuickActions.jsx
 * NPS-themed 2x2 service grid — matching official eNPS portal style.
 */
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  {
    id:     'contribute',
    icon:   '💳',
    label:  'Contribute',
    sub:    'Add to NPS corpus',
    path:   '/contribute',
    color:  '#001F4D',
    accent: '#F47920',
  },
  {
    id:     'learn',
    icon:   '📚',
    label:  'Learn NPS',
    sub:    'Modules & Quizzes',
    path:   '/learn',
    color:  '#1565C0',
    accent: '#1565C0',
  },
  {
    id:     'tribes',
    icon:   '👥',
    label:  'Tribes',
    sub:    'Join your community',
    path:   '/tribes',
    color:  '#2E7D32',
    accent: '#2E7D32',
  },
  {
    id:     'time-machine',
    icon:   '⏳',
    label:  'Time Machine',
    sub:    'Habit impact calculator',
    path:   '/time-machine',
    color:  '#6A1B9A',
    accent: '#6A1B9A',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div>
      <h3 className="font-display text-xs font-bold text-ink uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-gold rounded-full inline-block" />
        Quick Services
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className="text-left bg-white border border-border rounded-xl p-4
                       hover:shadow-card-hover active:scale-95
                       transition-all duration-200 group relative overflow-hidden"
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: action.accent }}
            />

            <span
              className="text-2xl block mb-2 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ background: `${action.accent}12`, border: `1px solid ${action.accent}25` }}
            >
              {action.icon}
            </span>
            <p
              className="font-display text-sm font-bold leading-tight mb-0.5"
              style={{ color: action.color }}
            >
              {action.label}
            </p>
            <p className="text-text-secondary text-[11px] font-body leading-tight">{action.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}