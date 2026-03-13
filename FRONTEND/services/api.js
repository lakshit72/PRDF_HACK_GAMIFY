/**
 * services/api.js
 * Centralised Axios instance. Automatically attaches the JWT from localStorage
 * and redirects to /login on 401 responses.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach token ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: handle auth errors ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fy_token');
      localStorage.removeItem('fy_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth endpoints ─────────────────────────────────────────────────────────────
export const authApi = {
  register:   (data)   => api.post('/auth/register', data),
  login:      (data)   => api.post('/auth/login', data),
};

// ── User endpoints ─────────────────────────────────────────────────────────────
export const userApi = {
  getProfile:       ()     => api.get('/user/profile'),
  updateProfile:    (data) => api.put('/user/profile', data),
  changePassword:   (data) => api.post('/user/change-password', data),
};

// ── Future Self endpoints ──────────────────────────────────────────────────────
export const futureSelfApi = {
  generate:   (data) => api.post('/futureself/generate', data),
  timeMachine:(data) => api.post('/timemachine/calculate', data),
};

// ── Gamification endpoints ─────────────────────────────────────────────────────
export const gamificationApi = {
  getStreak:    ()     => api.get('/gamification/streak'),
  logActivity:  (type) => api.post('/gamification/activity', { activityType: type }),
  getScore:     ()     => api.get('/gamification/score'),
  getQuests:    ()     => api.get('/gamification/quests'),
  submitQuiz:   (data) => api.post('/gamification/quiz/submit', data),
};

// ── Social endpoints ───────────────────────────────────────────────────────────
export const socialApi = {
  createTribe:    (data) => api.post('/tribes/create', data),
  joinTribe:      (data) => api.post('/tribes/join', data),
  getMyTribe:     ()     => api.get('/tribes/my-tribe'),
  getLeaderboard: (params) => api.get('/leaderboard', { params }),
  getMyRank:      ()     => api.get('/leaderboard/rank'),
};

// ── Contribution endpoints ─────────────────────────────────────────────────────
export const contributeApi = {
  linkPran:      (data) => api.post('/contribute/link-pran', data),
  contribute:    (data) => api.post('/contribute/make', data),
  getHistory:    ()     => api.get('/contribute/history'),
  setAutodebit:  (data) => api.post('/contribute/set-autodebit', data),
};

// ── Tax endpoints ──────────────────────────────────────────────────────────────
export const taxApi = {
  calculate: (data) => api.post('/tax/calculate', data),
};

export default api;