/**
 * components/dashboard/Header.jsx
 * NPS-themed top bar — navy gradient with saffron accent stripe.
 * Matches eNPS/PFRDA official design language.
 */
import { useAuth }     from '../../context/AuthContext.jsx';
import { useUserData } from '../../context/UserDataContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const { score }        = useUserData();
  const navigate         = useNavigate();

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="nps-header rounded-xl mb-6 overflow-hidden">
      {/* Tricolor top stripe */}
      <div className="tricolor-bar" />

      <div className="flex items-center justify-between px-5 py-4">
        {/* Left: Logo + greeting */}
        <div className="flex items-center gap-3">
          {/* NPS-style emblem placeholder */}
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20
                          flex items-center justify-center text-xl shrink-0">
            🔮
          </div>
          <div>
            <p className="text-white/60 text-[10px] font-body uppercase tracking-[0.15em]">
              {greeting}
            </p>
            <h1 className="text-white font-display font-bold text-lg leading-tight tracking-wide">
              {user?.email?.split('@')[0]?.toUpperCase() ?? 'SUBSCRIBER'}
            </h1>
          </div>
        </div>

        {/* Right: Score badge + logout */}
        <div className="flex items-center gap-3">
          {/* NPS Readiness Score badge */}
          {score && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/20
                              rounded-lg px-3 py-1.5">
                <span className="text-white/60 text-[9px] font-body uppercase tracking-wider">Score</span>
                <span className="text-yellow-300 font-mono font-bold text-base leading-none">
                  {score.score}
                </span>
              </div>
              <span className="text-white/40 text-[9px] font-body mt-0.5 pr-1">{score.tier}</span>
            </div>
          )}

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gold border-2 border-white/30
                          flex items-center justify-center text-white font-display font-bold text-sm
                          cursor-pointer select-none shrink-0">
            {initial}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-white/60 hover:text-white transition-colors"
            title="Log out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}