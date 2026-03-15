/**
 * context/AuthContext.jsx
 * Provides user auth state and login/logout actions.
 * Updated: caricatures[] and defaultCaricature added to user state and updateUser.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token,       setToken]       = useState(() => localStorage.getItem('fy_token'));
  const [user,        setUser]        = useState(() => {
    try { return JSON.parse(localStorage.getItem('fy_user')); }
    catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState(null);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('fy_token', data.token);
      localStorage.setItem('fy_user',  JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const msg =
        err.response?.data?.error ??
        err.response?.data?.errors?.[0]?.msg ??
        'Invalid email or password.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async ({ email, password }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await authApi.register({ email, password });
      setAuthLoading(false);
      return login({ email, password });
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.error ??
        'Registration failed. Please try again.';
      setAuthError(msg);
      setAuthLoading(false);
      return { success: false, error: msg };
    }
  }, [login]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('fy_token');
    localStorage.removeItem('fy_user');
    localStorage.removeItem('fy_future_self');
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  /**
   * updateUser
   * Merges partial updates into the cached user object.
   * Used by: profile edits, PRAN linking, photo upload (caricatures).
   *
   * After photo upload the backend returns:
   *   { caricatures: string[], defaultCaricature: string }
   * Call: updateUser({ caricatures, defaultCaricature })
   */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('fy_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      authLoading,
      authError,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;