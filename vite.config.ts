import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages:
 * - Project site: https://<user>.github.io/<repo>/  → base `/<repo>/`
 * - User site repo `*.github.io` (root domain): base `/`
 *
 * Set `VITE_BASE_PATH=/your-repo/` when building locally for the deploy branch.
 * GitHub Actions sets `GITHUB_REPOSITORY` automatically.
 */
function resolveBase(): string {
  const explicit = process.env.VITE_BASE_PATH?.trim();
  if (explicit) {
    return explicit.endsWith('/') ? explicit : `${explicit}/`;
  }
  const full = process.env.GITHUB_REPOSITORY;
  if (!full) return '/';
  const repo = full.split('/')[1];
  if (!repo) return '/';
  if (repo.endsWith('.github.io')) return '/';
  return `/${repo}/`;
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  const base = resolveBase();

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: [
          'icons/icon-192x192.png',
          'icons/icon-512x512.png',
          'icons/icon-512-maskable.png',
        ],
        manifest: {
          name: 'Music Studio',
          short_name: 'MusicStudio',
          description:
            'Audio tools: studio metronome, Fourier spectrum lab, and Sonic Fingerprint visualizations.',
          theme_color: '#f2ebe1',
          background_color: '#ede4d6',
          display: 'standalone',
          orientation: 'portrait',
          // Relative to manifest URL so GitHub project pages (/repo/) work.
          scope: './',
          start_url: './',
          icons: [
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/],
        },
      }),
    ],
    server: {
      port: 5175,
      proxy: {
        // In dev, /api/* is proxied to the FastAPI backend on :8000.
        // In production builds VITE_API_BASE_URL points to the deployed server.
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
