/**
 * context/AuthContext.jsx
 * Provides user auth state (token, user object) and login/logout actions.
 * Persists to localStorage for across-reload access.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('fy_token'));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('fy_user')); }
    catch { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState(null);

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
      const msg = err.response?.data?.error ?? 'Login failed';
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
      // Auto-login after registration
      return login({ email, password });
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
               ?? err.response?.data?.error
               ?? 'Registration failed';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('fy_token');
    localStorage.removeItem('fy_user');
    localStorage.removeItem('fy_future_self');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('fy_user', JSON.stringify(next));
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