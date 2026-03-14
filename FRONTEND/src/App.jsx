/**
 * App.jsx
 * Root component: providers + routing.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }     from './context/AuthContext.jsx';
import { UserDataProvider } from './context/UserDataContext.jsx';
import ProtectedRoute       from './components/ui/ProtectedRoute.jsx';

// Pages
import LoginPage      from './pages/LoginPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage  from './pages/DashboardPage.jsx';
import FutureSelfPage from './pages/FutureSelfPage.jsx';
import TimeMachinePage from './pages/TimeMachinePage.jsx';
import NotFoundPage   from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserDataProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"      element={<LoginPage />} />
            <Route path="/register"   element={<Navigate to="/onboarding" replace />} />

            {/* Onboarding (requires auth from step 2 onward) */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"    element={<DashboardPage />} />
              <Route path="/future-self"  element={<FutureSelfPage />} />
              <Route path="/time-machine" element={<TimeMachinePage />} />
            </Route>

            {/* Fallbacks */}
            <Route path="/"   element={<Navigate to="/dashboard" replace />} />
            <Route path="*"   element={<NotFoundPage />} />
          </Routes>
        </UserDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}