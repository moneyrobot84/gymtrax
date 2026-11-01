import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path: '/' during dev + preview, '/gymtrax/' for the production build
// (override with VITE_BASE for custom deployments).
export default defineConfig(({ command }) => {
  const base = command === 'build' ? (process.env.VITE_BASE || '/gymtrax/') : '/';
  return {
    base,
    server: { host: '0.0.0.0', port: 3000 },
    build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icons/apple-touch-icon.png',
          'icons/favicon-32.png',
          'icons/favicon-64.png',
          'icons/logo.svg',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/\/motion\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        manifest: {
          name: 'GymTrax',
          short_name: 'GymTrax',
          description: 'Firnas gym companion. Log sets fast, one-handed.',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#121314',
          theme_color: '#121314',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  };
});
