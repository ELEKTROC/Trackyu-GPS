import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// ─── import.meta.env defaults ───────────────────────────────────────────────
// Vitest already exposes import.meta.env; we just ensure sensible defaults
// so tests don't crash when components read VITE_* variables.
Object.assign(import.meta.env, {
  VITE_USE_MOCK: 'true',           // tests run against mock data by default
  VITE_API_URL: 'http://localhost:3001',
  MODE: 'test',
  DEV: true,
  PROD: false,
  SSR: false,
});

// ─── window.matchMedia ──────────────────────────────────────────────────────
// Used by responsive / dark-mode components and Tailwind media queries.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),       // deprecated but some libs still call it
    removeListener: vi.fn(),    // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── ResizeObserver ─────────────────────────────────────────────────────────
// Required by recharts <ResponsiveContainer>, react-window, and many
// components that observe element sizing.
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// ─── IntersectionObserver ───────────────────────────────────────────────────
// Used by lazy-loading images, infinite scroll (react-window-infinite-loader),
// and some virtualization helpers.
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// ─── URL.createObjectURL / revokeObjectURL ──────────────────────────────────
// Used by PDF/CSV export features (jsPDF, exceljs).
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
}

// ─── HTMLCanvasElement.getContext ────────────────────────────────────────────
// jsdom doesn't implement canvas; leaflet and jspdf may call getContext.
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// ─── Cleanup after every test ───────────────────────────────────────────────
afterEach(() => {
  cleanup();
});
