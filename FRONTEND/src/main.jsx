import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App.jsx';
import './index.css';

// ── Dev: unregister stale service workers ─────────────────────────────────────
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister()));
}

// ── Startup: clear expired/malformed JWT ─────────────────────────────────────
try {
  const token = localStorage.getItem('fy_token');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('fy_token');
      localStorage.removeItem('fy_user');
    }
  }
} catch {
  localStorage.removeItem('fy_token');
  localStorage.removeItem('fy_user');
}

// ── Legacy: remove caricatures from localStorage if they snuck in ────────────
// Old bug stored base64 images in fy_user causing QuotaExceededError.
// They now live in IndexedDB. Remove any remnants.
try {
  const raw = localStorage.getItem('fy_user');
  if (raw) {
    const obj = JSON.parse(raw);
    if (obj?.caricatures?.length) {
      const { caricatures, defaultCaricature, ...profileOnly } = obj;
      localStorage.setItem('fy_user', JSON.stringify(profileOnly));
    }
  }
} catch {
  localStorage.removeItem('fy_user');
}
try { localStorage.removeItem('fy_caricatures'); } catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);