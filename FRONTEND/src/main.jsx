import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ── Dev-only cleanup ──────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  // Unregister any stale PWA service workers (these intercept /api/* requests)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }

  // Clear any expired/malformed token that might be stuck in localStorage.
  // A bad token sent on register/login requests triggers authMiddleware
  // before the route handler runs, returning 401.
  const token = localStorage.getItem('fy_token');
  if (token) {
    try {
      // JWT has 3 parts separated by dots. If malformed or expired, clear it.
      const parts   = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      const expiredMs = payload.exp * 1000;
      if (Date.now() > expiredMs) {
        console.warn('[Auth] Cleared expired token from localStorage');
        localStorage.removeItem('fy_token');
        localStorage.removeItem('fy_user');
      }
    } catch {
      console.warn('[Auth] Cleared malformed token from localStorage');
      localStorage.removeItem('fy_token');
      localStorage.removeItem('fy_user');
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);