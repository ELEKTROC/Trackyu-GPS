# Cloudflare CDN Configuration — TrackYu GPS
# 
# This document describes how to configure Cloudflare for optimal
# static asset delivery and DDoS protection for trackyugps.com.

## 1. DNS Setup

Point your domain to Cloudflare nameservers:
- trackyugps.com → A record → 148.230.126.62 (Proxied ☁️)
- www.trackyugps.com → CNAME → trackyugps.com (Proxied ☁️)
- api.trackyugps.com → A record → 148.230.126.62 (DNS Only ☁️ — for WebSocket)

## 2. Page Rules (Free Plan)

### Rule 1: Cache static assets aggressively
- URL: `trackyugps.com/assets/*`
- Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year

### Rule 2: Bypass API cache
- URL: `trackyugps.com/api/*`
- Settings:
  - Cache Level: Bypass
  - Disable Performance

### Rule 3: Bypass WebSocket
- URL: `trackyugps.com/socket.io/*`
- Settings:
  - Cache Level: Bypass

## 3. SSL/TLS Settings

- Mode: **Full (Strict)** — Caddy provides valid cert
- Minimum TLS: **1.2**
- Always Use HTTPS: **On**
- Automatic HTTPS Rewrites: **On**

## 4. Speed / Optimization

- Auto Minify: JS, CSS, HTML → **On**
- Brotli: **On**
- Early Hints: **On**
- Rocket Loader: **Off** (conflicts with SPA)

## 5. Security

- WAF: **On** (Cloudflare Managed Ruleset)
- Bot Fight Mode: **On**
- Security Level: **Medium**
- Challenge Passage: **30 minutes**
- Browser Integrity Check: **On**

## 6. Caching

- Caching Level: **Standard**
- Browser Cache TTL: **Respect Existing Headers**
  (Caddy already sets proper Cache-Control headers)

## 7. Cache Headers (set by Caddy/Nginx)

Vite build output in `/assets/` has content-hashed filenames:
```
/assets/index-[hash].js      → Cache-Control: public, max-age=31536000, immutable
/assets/index-[hash].css     → Cache-Control: public, max-age=31536000, immutable
/assets/vendor-[hash].js     → Cache-Control: public, max-age=31536000, immutable
```

HTML entry point:
```
/index.html                  → Cache-Control: no-cache, no-store, must-revalidate
```

API responses:
```
/api/*                       → Cache-Control: no-store (set by Express)
```

## 8. Firewall Rules (Recommended)

### Block direct IP access (force domain usage):
- Expression: `(http.host eq "148.230.126.62")`
- Action: Block

### Rate limit API:
- Expression: `(http.request.uri.path contains "/api/auth")`
- Action: Rate limit (10 requests per minute per IP)

## 9. Performance Impact (Expected)

| Metric | Before | After Cloudflare |
|--------|--------|-----------------|
| TTFB (static) | ~200ms | ~50ms |
| JS/CSS load | ~150ms | ~30ms (edge cache) |
| DDoS protection | None | Cloudflare L3/L4/L7 |
| SSL termination | Caddy | Cloudflare edge + Caddy |
| Bandwidth | 100% origin | ~20% origin (80% cached) |

## 10. Verification

After setup, verify with:
```bash
# Check Cloudflare is proxying
curl -I https://trackyugps.com | grep -i cf-ray

# Verify cache status for assets
curl -I https://trackyugps.com/assets/index.js | grep -i cf-cache-status
# Expected: HIT (after first request)

# Verify API bypass
curl -I https://trackyugps.com/api/health | grep -i cf-cache-status
# Expected: DYNAMIC
```
