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
          description: 'Audio tools: classic and studio metronomes with tempo control.',
          theme_color: '#0f172a',
          background_color: '#020617',
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
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
