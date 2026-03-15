/**
 * context/AuthContext.jsx
 *
 * Caricature storage strategy (4 base64 PNGs ≈ 2MB total):
 *
 *  1. PRIMARY:   IndexedDB via idb-keyval-style inline implementation
 *                — no size limit, works offline, survives page refresh
 *  2. FALLBACK:  sessionStorage (5–10MB on most browsers)
 *  3. LAST:      in-memory only (lost on refresh, but always works)
 *
 * Profile fields (tiny, < 1KB) stay in localStorage as before.
 * caricatures are NEVER written to localStorage.
 *
 * On login: backend returns caricatures[] → stored in IndexedDB → merged into user state.
 * On refresh: caricatures loaded back from IndexedDB before React mounts.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, userApi } from '../services/api.js';

const AuthContext = createContext(null);

// ── Caricature storage: IndexedDB with sessionStorage fallback ────────────────

const DB_NAME    = 'futureyou';
const STORE_NAME = 'caricatures';
const IDB_KEY    = 'user_caricatures';

let _db = null;

const openDB = () => new Promise((resolve) => {
  if (_db) { resolve(_db); return; }
  try {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = ()  => resolve(null);
  } catch { resolve(null); }
});

const idbSet = async (value) => {
  try {
    const db = await openDB();
    if (!db) throw new Error('no idb');
    await new Promise((res, rej) => {
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(value, IDB_KEY);
      req.onsuccess = res; req.onerror = rej;
    });
    return true;
  } catch {
    // Fallback: sessionStorage
    try { sessionStorage.setItem('fy_caricatures', JSON.stringify(value)); return true; }
    catch { return false; }
  }
};

const idbGet = async () => {
  try {
    const db = await openDB();
    if (!db) throw new Error('no idb');
    return await new Promise((res, rej) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(IDB_KEY);
      req.onsuccess = (e) => res(e.target.result ?? []);
      req.onerror   = rej;
    });
  } catch {
    try { return JSON.parse(sessionStorage.getItem('fy_caricatures') ?? '[]'); }
    catch { return []; }
  }
};

const idbDel = async () => {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(IDB_KEY);
    }
  } catch {}
  sessionStorage.removeItem('fy_caricatures');
};

// ── localStorage helpers (profile only, never caricatures) ───────────────────

const safeLSSet = (key, value) => {
  try { localStorage.setItem(key, value); }
  catch (e) { console.warn(`[Auth] localStorage write failed for "${key}":`, e.message); }
};

const saveProfile = (userObj) => {
  if (!userObj) return;
  const { caricatures, defaultCaricature, ...profileOnly } = userObj;
  safeLSSet('fy_user', JSON.stringify(profileOnly));
};

// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('fy_token'));

  const [user, setUser] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('fy_user') ?? 'null') ?? {};
      return { ...profile, caricatures: [] }; // caricatures loaded async below
    } catch { return null; }
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState(null);

  // Load caricatures from IndexedDB async on mount (after first render)
  useEffect(() => {
    if (!token) return;
    idbGet().then(caricatures => {
      if (caricatures?.length) {
        setUser(prev => prev ? { ...prev, caricatures } : prev);
      }
    });
  }, [token]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data } = await authApi.login({ email, password });

      safeLSSet('fy_token', data.token);
      saveProfile(data.user);
      setToken(data.token);

      // Persist caricatures in IndexedDB (no size limit)
      const caricatures = data.user.caricatures ?? [];
      if (caricatures.length) {
        await idbSet(caricatures);
      } else {
        // Login returned no caricatures (e.g. old account) — try loading stored ones
        const stored = await idbGet();
        if (stored?.length) {
          setUser({ ...data.user, caricatures: stored });
          return { success: true, user: { ...data.user, caricatures: stored } };
        }
      }

      setUser({ ...data.user, caricatures });
      return { success: true, user: { ...data.user, caricatures } };
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
    idbDel(); // clear caricatures from IndexedDB + sessionStorage
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  // ── Update user (profile edits, photo upload, etc.) ───────────────────────
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      saveProfile(next); // only profile fields → localStorage
      // If caricatures updated → persist to IndexedDB
      if (updates.caricatures?.length) {
        idbSet(updates.caricatures);
      }
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