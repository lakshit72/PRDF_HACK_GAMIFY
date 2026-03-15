import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App.jsx';
import './index.css';

// ── One-time migration: remove caricatures from fy_user if they snuck in ──────
// Previous bug stored base64 images inside fy_user causing QuotaExceededError.
// This runs once on every page load and is a no-op after the first cleanup.
try {
  const raw = localStorage.getItem('fy_user');
  if (raw) {
    const obj = JSON.parse(raw);
    if (obj?.caricatures?.length) {
      // Move caricatures to their own key
      localStorage.setItem('fy_caricatures', JSON.stringify(obj.caricatures));
      const { caricatures, defaultCaricature, ...profileOnly } = obj;
      localStorage.setItem('fy_user', JSON.stringify(profileOnly));
      console.log('[Auth] Migrated caricatures out of fy_user');
    }
  }
} catch (e) {
  // fy_user is corrupt — clear it so the app can boot cleanly
  console.warn('[Auth] Cleared corrupt fy_user:', e.message);
  localStorage.removeItem('fy_user');
}

// ── Dev: unregister stale service workers ─────────────────────────────────────
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister()));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);