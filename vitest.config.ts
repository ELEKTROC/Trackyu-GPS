/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Environment
    globals: true,
    environment: 'jsdom',

    // Setup
    setupFiles: ['./setupTests.ts'],

    // Test file patterns
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'backend', 'android', 'trackyu-mobile', 'Archives'],

    // Clean state between tests
    mockReset: true,

    // CSS & asset handling — inline modules that choke on CSS/image imports
    css: false,
    deps: {
      optimizer: {
        web: {
          include: [
            'recharts',
            'react-leaflet',
            'leaflet',
            'leaflet.markercluster',
            'react-leaflet-cluster',
          ],
        },
      },
    },

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: [
        'components/**/*.{ts,tsx}',
        'features/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'contexts/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/index.ts',
        'types.ts',
        'LazyViews.tsx',
        'App.tsx',
      ],
    },

    // Timeouts
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
