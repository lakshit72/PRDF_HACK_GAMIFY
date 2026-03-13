/**
 * context/UserDataContext.jsx
 * Fetches and caches: profile, streak, NPS score, quests, future self preview.
 * Exposes a `refresh()` to manually re-fetch all data.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userApi, gamificationApi } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const UserDataContext = createContext(null);

export const UserDataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [profile,    setProfile]    = useState(null);
  const [streak,     setStreak]     = useState(null);
  const [score,      setScore]      = useState(null);
  const [quests,     setQuests]     = useState([]);
  const [futureSelf, setFutureSelf] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fy_future_self')); }
    catch { return null; }
  });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    try {
      const [profileRes, streakRes, scoreRes, questsRes] = await Promise.allSettled([
        userApi.getProfile(),
        gamificationApi.getStreak(),
        gamificationApi.getScore(),
        gamificationApi.getQuests(),
      ]);

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data.user);
      if (streakRes.status  === 'fulfilled') setStreak(streakRes.value.data);
      if (scoreRes.status   === 'fulfilled') setScore(scoreRes.value.data);
      if (questsRes.status  === 'fulfilled') setQuests(questsRes.value.data.quests ?? []);

      // Log activity for streak (fire-and-forget)
      gamificationApi.logActivity('login').catch(() => {});
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch on mount and when auth state changes
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveFutureSelf = useCallback((data) => {
    setFutureSelf(data);
    localStorage.setItem('fy_future_self', JSON.stringify(data));
  }, []);

  return (
    <UserDataContext.Provider value={{
      profile, streak, score, quests, futureSelf,
      loading, error,
      refresh:        fetchAll,
      saveFutureSelf,
    }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used inside UserDataProvider');
  return ctx;
};

export default UserDataContext;