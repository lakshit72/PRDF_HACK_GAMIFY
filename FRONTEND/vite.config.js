import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FutureYou - NPS Companion',
        short_name: 'FutureYou',
        description: 'Your National Pension System companion app.',
        theme_color: '#001F4D',
        background_color: '#F0F4FA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: 'data:image/svg+xml,%3Csvg xmlns%3D%22http%3A//www.w3.org/2000/svg%22 viewBox%3D%220 0 100 100%22%3E%3Ctext y%3D%22.9em%22 font-size%3D%2290%22%3E%F0%9F%94%AE%3C/text%3E%3C/svg%3E',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },

      // ── IMPORTANT ────────────────────────────────────────────────────────
      // devOptions.enabled MUST be false (or omitted) in development.
      //
      // When enabled in dev, the PWA service worker intercepts ALL requests
      // including /api/* — handling them internally before they reach Vite's
      // proxy. This causes every API call to return HTML (the SW's offline
      // fallback page) instead of JSON, producing the
      // "Authorization header missing or malformed" 401 error.
      //
      // The service worker is only needed in production builds.
      // ─────────────────────────────────────────────────────────────────────
      devOptions: {
        enabled: false,
      },

      workbox: {
        // Exclude /api/* from the service worker cache so it never
        // intercepts backend requests, even in production.
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/user\/profile/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-profile',
              expiration: { maxEntries: 1, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/gamification/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-gamification',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 },
            },
          },
        ],
      },
    }),
  ],

  server: {
    proxy: {
      // Forward all /api/* requests to the Express backend.
      // This only works when devOptions.enabled is false — the SW
      // must not intercept these before they reach the proxy.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});