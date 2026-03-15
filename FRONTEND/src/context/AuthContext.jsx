/**
 * context/AuthContext.jsx
 *
 * FIX: Caricatures (base64 PNGs ~2MB total) are stored in a SEPARATE
 * localStorage key 'fy_caricatures' — never inside 'fy_user'.
 * Storing them in fy_user caused QuotaExceededError → white screen crash.
 *
 * Storage layout:
 *   fy_token        — JWT string
 *   fy_user         — profile fields only (tiny, < 1KB)
 *   fy_caricatures  — base64 image array (large, stored separately)
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api.js';

const AuthContext      = createContext(null);
const CARICATURE_KEY   = 'fy_caricatures';

const safeLSSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Auth] localStorage write failed for "${key}":`, e.message);
  }
};

/** Strip caricatures before writing profile to localStorage */
const saveUserProfile = (userObj) => {
  if (!userObj) return;
  const { caricatures, defaultCaricature, ...profileOnly } = userObj;
  safeLSSet('fy_user', JSON.stringify(profileOnly));
  // Save caricatures separately if present
  if (caricatures !== undefined) {
    safeLSSet(CARICATURE_KEY, JSON.stringify(caricatures));
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('fy_token'));

  const [user, setUser] = useState(() => {
    try {
      const profile     = JSON.parse(localStorage.getItem('fy_user')       ?? 'null') ?? {};
      const caricatures = JSON.parse(localStorage.getItem(CARICATURE_KEY)  ?? '[]');
      return { ...profile, caricatures };
    } catch {
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState(null);

  const login = useCallback(async ({ email, password }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data } = await authApi.login({ email, password });
      safeLSSet('fy_token', data.token);
      saveUserProfile(data.user);
      setToken(data.token);
      // Re-attach any existing caricatures from local storage on login
      const caricatures = JSON.parse(localStorage.getItem(CARICATURE_KEY) ?? '[]');
      setUser({ ...data.user, caricatures });
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

  const logout = useCallback(() => {
    localStorage.removeItem('fy_token');
    localStorage.removeItem('fy_user');
    localStorage.removeItem(CARICATURE_KEY);
    localStorage.removeItem('fy_future_self');
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      // Always save caricatures separately, never in fy_user
      saveUserProfile(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, authLoading, authError,
      isAuthenticated: !!token,
      login, register, logout, updateUser,
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