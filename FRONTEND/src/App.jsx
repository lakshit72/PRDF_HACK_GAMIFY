/**
 * App.jsx — Root component: providers + routing.
 * AICoach floats globally over all authenticated pages.
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider }     from './context/AuthContext.jsx';
import { UserDataProvider } from './context/UserDataContext.jsx';
import { ToastProvider }    from './components/shared/Toast.jsx';
import ProtectedRoute       from './components/ui/ProtectedRoute.jsx';
import AICoach              from './components/coach/AICoach.jsx';
import { useAuth }          from './context/AuthContext.jsx';

import LoginPage          from './pages/LoginPage.jsx';
import OnboardingPage     from './pages/OnboardingPage.jsx';
import DashboardPage      from './pages/DashboardPage.jsx';
import FutureSelf         from './pages/FutureSelf.jsx';
import TimeMachine        from './pages/TimeMachine.jsx';
import Learning           from './pages/Learning.jsx';
import ModuleDetail       from './pages/ModuleDetail.jsx';
import GamificationPage   from './pages/GamificationPage.jsx';
import Tribes             from './pages/Tribes.jsx';
import Leaderboards       from './pages/Leaderboards.jsx';
import Contribute         from './pages/Contribute.jsx';
import NotFoundPage       from './pages/NotFoundPage.jsx';

// Only show AICoach on authenticated pages (not login/onboarding)
function CoachOverlay() {
  const { isAuthenticated } = useAuth();
  const { pathname }        = useLocation();
  const publicPaths         = ['/login', '/onboarding', '/register'];
  if (!isAuthenticated || publicPaths.some(p => pathname.startsWith(p))) return null;
  return <AICoach />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserDataProvider>
          <ToastProvider>
            <Routes>
              {/* Public */}
              <Route path="/login"      element={<LoginPage />} />
              <Route path="/register"   element={<Navigate to="/onboarding" replace />} />
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* Protected */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard"       element={<DashboardPage />} />
                <Route path="/future-self"     element={<FutureSelf />} />
                <Route path="/time-machine"    element={<TimeMachine />} />
                <Route path="/learn"           element={<Learning />} />
                <Route path="/learn/:moduleId" element={<ModuleDetail />} />
                <Route path="/progress"        element={<GamificationPage />} />
                <Route path="/tribes"          element={<Tribes />} />
                <Route path="/leaderboards"    element={<Leaderboards />} />
                <Route path="/contribute"      element={<Contribute />} />
              </Route>

              <Route path="/"  element={<Navigate to="/dashboard" replace />} />
              <Route path="*"  element={<NotFoundPage />} />
            </Routes>

            {/* Global AI Coach overlay — visible on all authenticated pages */}
            <CoachOverlay />
          </ToastProvider>
        </UserDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}