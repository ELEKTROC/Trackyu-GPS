import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Let Vite/Rollup handle code splitting automatically
// Manual chunking was causing initialization order issues in production

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        strictPort: true,
        host: true, // Listen on all addresses
        proxy: {
          '/api': {
            target: 'https://trackyugps.com',
            changeOrigin: true,
            secure: true,
            headers: { origin: 'https://trackyugps.com' },
          },
          '/socket.io': {
            target: 'https://trackyugps.com',
            ws: true,
            changeOrigin: true,
            headers: { origin: 'https://trackyugps.com' },
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './setupTests.ts',
      },
      build: {
        // Target modern browsers for smaller bundle
        target: 'es2020',
        // Enable sourcemaps for debugging in staging
        sourcemap: true,
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 500,
        rollupOptions: {
          output: {
            // Manual chunks for better caching and smaller initial bundle
            manualChunks: {
              // React core - cached separately (small, rarely changes)
              'vendor-react': ['react', 'react-dom'],
              // Icons - large but stable
              'vendor-icons': ['lucide-react'],
              // Charts - only needed for dashboard/reports (lazy load candidate)
              'vendor-charts': ['recharts'],
              // Forms
              'vendor-forms': ['react-hook-form'],
              // Map libraries - only loaded when needed
              'vendor-map': ['leaflet', 'react-leaflet', 'react-leaflet-cluster', 'leaflet.markercluster'],
              // Data & State
              'vendor-query': ['@tanstack/react-query'],
              // Socket for real-time
              'vendor-socket': ['socket.io-client'],
              // Validation
              'vendor-zod': ['zod'],
              // NOTE: jspdf and html2canvas are now dynamically imported via pdfLoader.ts
              // They will be code-split automatically and only loaded when user exports to PDF
            },
            entryFileNames: `assets/[name].[hash].js`,
            chunkFileNames: `assets/[name].[hash].js`,
            assetFileNames: `assets/[name].[hash].[ext]`
          }
        },
        // Minification settings
        minify: 'esbuild',
      }
    };
});
