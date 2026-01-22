import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'PeerToLearn',
        short_name: 'PeerToLearn',
        description: 'Your academic companion for peer learning.',
        theme_color: '#3F86F7',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          {
            src: '/logo-blue.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo-blue.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Force new service worker to activate immediately
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache JS chunks - let browser handle with normal HTTP caching
        // This prevents stale chunk issues after deployment
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/v1/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
            },
          },
          // Use NetworkFirst for API calls
          {
            urlPattern: /^https:\/\/peerscholar\.onrender\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
});
