import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'FutureYou - NPS Companion',
        short_name: 'FutureYou',
        description: 'See your future self. Build it today.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache static assets aggressively
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime cache for API responses (network-first, fallback to cache)
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/user\/profile/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-profile', expiration: { maxEntries: 1, maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/gamification/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-gamification', expiration: { maxEntries: 10, maxAgeSeconds: 60 } },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});

