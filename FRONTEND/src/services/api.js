/**
 * services/api.js
 * Centralised Axios instance with JWT auth.
 *
 * KEY FIXES:
 * 1. Request interceptor NEVER attaches Authorization header to public auth
 *    routes (/auth/register, /auth/login). A stale token in localStorage
 *    was being sent with register/login, hitting authMiddleware and returning
 *    401 "Authorization header missing or malformed" before the route ran.
 *
 * 2. Response interceptor only redirects to /login on 401s from protected
 *    routes — auth route 401s (wrong password etc.) must reach the form.
 */
import axios from 'axios';

// Routes that must NEVER have an Authorization header attached.
// These are public endpoints — sending a token causes authMiddleware to
// validate it and reject the request if it's expired or malformed.
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const url = config.url ?? '';

  // Skip token for public auth endpoints
  const isPublic = PUBLIC_ROUTES.some((p) => url.includes(p));
  if (isPublic) return config;

  // Attach token for all protected routes
  const token = localStorage.getItem('fy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url         = err.config?.url ?? '';
    const isPublic    = PUBLIC_ROUTES.some((p) => url.includes(p));
    const is401       = err.response?.status === 401;

    // Only redirect to /login when a PROTECTED route returns 401
    // (token expired / invalid). Never redirect on auth-route 401s.
    if (is401 && !isPublic) {
      localStorage.removeItem('fy_token');
      localStorage.removeItem('fy_user');
      window.location.replace('/login');
    }

    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
};

// ── User ──────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile:     ()     => api.get('/user/profile'),
  updateProfile:  (data) => api.put('/user/profile', data),
  changePassword: (data) => api.post('/user/change-password', data),
};

// ── Future Self & Time Machine ────────────────────────────────────────────────
export const futureSelfApi = {
  generate:    (data) => api.post('/futureself/generate', data),
  timeMachine: (data) => api.post('/timemachine/calculate', data),
};

// ── Gamification ──────────────────────────────────────────────────────────────
export const gamificationApi = {
  getStreak:   ()     => api.get('/gamification/streak'),
  logActivity: (type) => api.post('/gamification/activity', { activityType: type }),
  getScore:    ()     => api.get('/gamification/score'),
  getQuests:   ()     => api.get('/gamification/quests'),
  submitQuiz:  (data) => api.post('/gamification/quiz/submit', data),
};

// ── Social ────────────────────────────────────────────────────────────────────
export const socialApi = {
  createTribe:    (data)   => api.post('/tribes/create', data),
  joinTribe:      (data)   => api.post('/tribes/join', data),
  getMyTribe:     ()       => api.get('/tribes/my-tribe'),
  getLeaderboard: (params) => api.get('/leaderboard', { params }),
  getMyRank:      ()       => api.get('/leaderboard/rank'),
};

// ── Contributions ─────────────────────────────────────────────────────────────
export const contributeApi = {
  linkPran:     (data) => api.post('/contribute/link-pran', data),
  contribute:   (data) => api.post('/contribute/make', data),
  getHistory:   ()     => api.get('/contribute/history'),
  setAutodebit: (data) => api.post('/contribute/set-autodebit', data),
};

// ── Tax ───────────────────────────────────────────────────────────────────────
export const taxApi = {
  calculate: (data) => api.post('/tax/calculate', data),
};

export default api;