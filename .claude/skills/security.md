# Skill — Sécurité TrackYu

## Principes généraux

- Jamais de secrets (clés API, mots de passe, tokens) dans le code source ou les commits
- Validation des entrées à la frontière système uniquement (API, formulaires) — faire confiance au code interne
- Jamais de `eval()`, injection SQL, XSS, command injection
- OWASP Top 10 à garder en tête sur tout endpoint public

## Authentification & Autorisation

- JWT Bearer token sur toutes les routes API protégées
- Middleware `authenticateToken` → vérifie le token + charge `req.user`
- Middleware `requireAdmin` / `requirePermission` pour les routes sensibles
- Isolation tenant obligatoire : toute query doit filtrer par `tenant_id` (sauf SUPERADMIN)
- RESELLER / RESELLER_ADMIN = niveau ADMIN tenant → mêmes droits
- SUPERADMIN (TKY) = cross-tenant, pas de filtre tenant

## Règles par rôle

| Rôle             | Peut voir                | Peut modifier |
| ---------------- | ------------------------ | ------------- |
| SUPERADMIN       | Tout (cross-tenant)      | Tout          |
| ADMIN / RESELLER | Son tenant uniquement    | Son tenant    |
| MANAGER          | Son tenant               | Limité        |
| USER             | Ses véhicules assignés   | Lecture seule |
| CLIENT           | Ses véhicules uniquement | Lecture seule |

## Patches sécurité déjà appliqués (ne pas réintroduire)

- bcrypt sur tous les mots de passe (jamais MD5/SHA1 plain)
- Rate limiting sur les endpoints auth (login, refresh token)
- Endpoint `reveal-password` protégé par `requireAdmin`
- GPS server : rate limiter IMEI (300 msg/min max, 5 paquets inconnus max)

## Variables d'environnement sensibles

Ne jamais logger ou exposer :

- `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`
- Clés FCM/push notifications
- Credentials SMTP

## CSP (Content Security Policy)

Dans `index.html` :

- `script-src 'self' 'unsafe-inline'` — requis pour Vite
- `worker-src 'self' blob:` — requis pour Web Workers
- Ne pas élargir sans raison explicite

## Audit sécurité backend (score 4.6/10 — 2026-04-18)

Actions prioritaires identifiées :

1. Rotation JWT secret en prod
2. HTTPS forcé sur toutes les routes
3. Headers sécurité (Helmet.js) sur toutes les réponses
4. Logs d'audit sur actions sensibles (immobilisation, suppression)
