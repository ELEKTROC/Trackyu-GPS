import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'backend/**',
      'android/**',
      'trackyu-mobile/**',
      'Archives/**',
      'monitoring/**',
      'mosquitto/**',
      'website/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      '*.js',
      'recovered_vps_2026-04-03/**',
      'trackyu-mobile-expo/**',
      'public/**',
      'tests/load/**',
      '*.cjs',
    ],
  },

  // Base recommended rules
  js.configs.recommended,

  // TypeScript recommended
  ...tseslint.configs.recommended,

  // React rules
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React hooks
      ...reactHooks.configs.recommended.rules,
      // Disable React Compiler / experimental rules generating false positives
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/no-direct-set-state-in-use-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/compilation-skipped': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // preserve-caught-error requires { cause } on all rethrows — too strict for existing code
      'preserve-caught-error': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript strict rules
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // TypeScript handles undefined references better than ESLint
      'no-undef': 'off',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'smart'],
      // Disabled: import type { X } + import { Y } from same module is valid TS
      'no-duplicate-imports': 'off',
    },
  },
);
