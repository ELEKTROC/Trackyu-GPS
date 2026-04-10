// services/apiLazy.ts
// Thin lazy-loading proxy for the api facade.
//
// WHY: Statically importing services/api.ts pulls ~260 kB of domain API code into
// the initial JS bundle (index.js), slowing down the first meaningful paint.
// This proxy is the only statically-imported file; the real api modules load lazily.
//
// HOW: Every call `api.domain.method(...args)` is intercepted by a Proxy:
//  - If the real api is already resolved  → calls it directly (zero overhead)
//  - If it's still loading               → returns a Promise that resolves first
// All api methods already return Promises, so call-sites are 100% transparent.
//
// USAGE: replace `import { api } from './api'`
//    with `import { api } from './apiLazy'`  — nothing else changes.

import type { api as ApiShape } from './api';

type Api = typeof ApiShape;

// Fire the dynamic import immediately at module evaluation time.
// By the time any React Query queryFn executes (after component mount),
// the chunk will already be fully resolved.
let _resolved: Api | null = null;
const _ready: Promise<Api> = import('./api').then(m => {
  _resolved = m.api;
  return m.api;
});

export const api: Api = new Proxy({} as Api, {
  get(_, domainKey: string) {
    // Fast-path: api chunk already loaded (all requests after initial load)
    if (_resolved) return (_resolved as any)[domainKey];

    // Slow-path: first load — return a method-level proxy that awaits the chunk
    return new Proxy({} as any, {
      get(_, methodKey: string) {
        return (...args: unknown[]) =>
          _ready.then(a => (a as any)[domainKey][methodKey](...args));
      },
    });
  },
});
