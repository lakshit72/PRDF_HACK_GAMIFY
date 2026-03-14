/**
 * components/dashboard/Header.jsx
 * Top bar with user avatar/initial, greeting, and logout button.
 */
import { useAuth } from '../../context/AuthContext.jsx';
import { useUserData } from '../../context/UserDataContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const { score }        = useUserData();
  const navigate         = useNavigate();

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="flex items-center justify-between mb-8">
      {/* Left: greeting */}
      <div>
        <p className="text-text-secondary text-xs font-body uppercase tracking-widest mb-0.5">
          {greeting}
        </p>
        <h1 className="font-display text-xl font-bold text-text-primary leading-tight">
          {user?.email?.split('@')[0] ?? 'Explorer'}
        </h1>
      </div>

      {/* Right: avatar + logout */}
      <div className="flex items-center gap-3">
        {/* Score badge */}
        {score && (
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-2 border border-border rounded-full px-3 py-1">
            <span className="text-gold text-xs font-mono font-bold">{score.score}</span>
            <span className="text-muted text-[10px] font-body">{score.tier}</span>
          </div>
        )}

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-ember
                        flex items-center justify-center text-ink font-display font-bold text-sm
                        ring-2 ring-gold/30 cursor-pointer select-none shrink-0">
          {initial}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-muted hover:text-text-primary transition-colors text-sm font-body"
          title="Log out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}