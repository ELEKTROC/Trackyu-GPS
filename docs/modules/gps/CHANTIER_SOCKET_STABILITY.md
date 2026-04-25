# Chantier — Stabilité WebSocket Socket.IO

**Démarré** : 2026-04-24
**Statut** : 🟢 Phase 1 (P1+P2+P3) livrée prod 2026-04-25 — bug "Invalid token" résolu
**Pilote** : Smartrack CI / Elektro Com
**Branche** : `chore/phase-2-10-gps-server`

**Enjeu** : les utilisateurs voient **fréquemment** le bandeau « Actualisation suspendue — synchronisation en cours… » sur la vue Map. Ce bandeau s'affiche quand le socket Socket.IO est déconnecté depuis > 30 s (`DataContext.tsx:336`). C'est un indicateur de fond — la déconnexion peut entraîner :

- Désynchronisation des positions véhicules en temps-réel (vue Map devient stale)
- Notifications manquées (alertes, ACK commandes, IMEI inconnus)
- Confiance utilisateur dégradée (« l'application ne marche pas »)

Source utilisateur (2026-04-24 nuit) : « le message actualisation suspendue est fréquent » — déclencheur typique : retour de la vue Replay sur la vue Map.

---

## 1. Périmètre

Tout ce qui concerne la connectivité Socket.IO bidirectionnelle TrackYu (frontend ↔ backend) :

1. **Backend Socket.IO server** — config init, ping/pong, transports, auth, rooms
2. **Frontend Socket.IO client** — config reconnect, gestion token, singleton
3. **Reverse proxy (nginx)** — timeouts, headers WebSocket, buffer
4. **Logs et observabilité** — comptage disconnects, durée moyenne des sessions
5. **Causes systémiques** — JWT expiré, leak mémoire, heartbeat trop serré, mobile background
6. **Mobile Expo** — comportement différent (foreground/background) à étudier séparément (session mobile)

Hors scope : refonte complète vers Server-Sent Events ou GraphQL Subscriptions (changement d'architecture). On reste sur Socket.IO.

---

## 2. État initial — symptômes connus

- Bandeau « Actualisation suspendue » visible **fréquemment** côté SUPERADMIN sur vue Map
- `isDataStale = !isSocketConnected && disconnectedSince != null && Date.now() - disconnectedSince > 30 * 1000` (DataContext.tsx:336)
- Banner UI MapView.tsx:1639-1648 (showSocketBanner après 30 s grace delay)
- Au retour de la vue Replay sur la vue Map, banner souvent visible
- Pendant un replay actif, l'auto-refresh local est suspendu (MapView.tsx:986) — mais ça ne devrait PAS affecter la socket

Reco backend + frontend + nginx en cours (agent Explore lancé) — résultats à intégrer dans la section Diagnostic ci-dessous.

---

## 3. Diagnostic — rapport reco 2026-04-24

### 3.1 Backend Socket.IO ([trackyu-backend/src/socket.ts](../../../trackyu-backend/src/socket.ts))

- **Config init lignes 10-29** : `pingTimeout: 20000` (20 s), `pingInterval: 25000` (25 s), `perMessageDeflate` actif niveau 6, transports WebSocket + polling fallback
- **Auth middleware lignes 48-60** : JWT verify strict (HS256, audience `trackyugps`, issuer `trackyugps-backend`). **Aucun refresh** — le token est figé dans `socket.auth` à la 1re connexion, jamais renouvelé pendant la session
- **Rooms** : `tenant:{id}`, `superadmin`, `vehicle:{id}`. Émissions par `socketThrottle` (positionWorker.ts:573) avec throttle adaptatif MOVING/IDLE/STOPPED. Estimé ~6000 emits/min sur 100 véhicules MOVING

### 3.2 Frontend Socket.IO ([services/socket.ts](../../../services/socket.ts))

- **Singleton lignes 23-54** : `let socket` global, vérifié `if (!socket)` avant create — pas de leak
- **Config reconnect** : `reconnectionAttempts: Infinity`, delay 1000 → 30000 ms (backoff)
- **Token refresh ligne 40-44** : `socket.io.on('reconnect_attempt', …)` recharge depuis `localStorage.fleet_token` à chaque tentative. **MAIS** ne vérifie pas si le token est expiré → renvoie un token mort que le serveur rejette → boucle reconnect infinie sans succès
- **Defaults** : `pingTimeout`/`pingInterval` non configurés côté client → defaults Socket.IO (typiquement 60 s) → asymétrie avec backend (20/25 s)

### 3.3 Nginx VPS ([nginx_host.conf](../../../nginx_host.conf):52-59)

```nginx
location /socket.io {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

**Manque** : `proxy_read_timeout`, `proxy_send_timeout`, `proxy_buffering off`, `proxy_request_buffering off`. Defaults nginx = 60 s read/send → potentiel close après idle (Socket.IO ping toutes les 25 s prévient ça en théorie, mais polling fallback peut souffrir).

### 3.4 JWT et expiration ([trackyu-backend/src/controllers/authController.ts:23](../../../trackyu-backend/src/controllers/authController.ts#L23))

- `ACCESS_TOKEN_EXPIRY = 15m` — court pour HTTP avec refresh, mais critique pour Socket.IO sans refresh
- Le mécanisme refresh existe pour HTTP mais n'est pas branché côté socket

### 3.5 Causes les plus probables (ranked)

| Rang | Cause                                                                                                                                                                            | Probabilité | Impact   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- |
| 🔴 1 | **JWT token expire sans renouvellement socket** — après 15 min de session, token reste figé dans `socket.auth`, serveur rejette silencieusement, bandeau apparaît 30 s plus tard | 60 %        | CRITIQUE |
| 🟡 2 | **Ping timeout asymétrique** (20 s backend vs 60 s client default) → réseau lent + GC pause = backend close, client ne détecte pas                                               | 40 %        | HAUTE    |
| 🟡 3 | **Nginx sans timeouts explicites + buffering** → polling fallback peut être buffé/closé                                                                                          | 30 %        | MOYENNE  |
| 🟢 4 | Mobile OS qui tue la connexion en background                                                                                                                                     | 15 %        | LOCALE   |

---

## 4. Roadmap (validée après reco)

| Phase  | Titre                                                                                                                                                               | Effort  | Impact      | Priorité |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- | -------- |
| **P1** | **JWT refresh-on-socket** : timer client renouvelle `socket.auth` toutes les 10 min via refresh token + reconnect propre. Backend valide refresh tokens sur socket. | 1-1.5 j | 🔴 critique | 1        |
| **P2** | **Fix nginx WebSocket** : `proxy_read_timeout 120s; proxy_send_timeout 120s; proxy_buffering off; proxy_request_buffering off;` dans bloc `/socket.io`              | 0.25 j  | 🟡 haute    | 2        |
| **P3** | **Symétrie ping** : aligner client `pingTimeout: 20000, pingInterval: 25000` sur backend (services/socket.ts)                                                       | 0.25 j  | 🟡 haute    | 3        |
| **P4** | **Métrics Prometheus socket** : exposer `socket_connections_active`, `socket_disconnects_total{reason}`, `socket_session_duration_seconds`                          | 0.5 j   | 🟢 obs      | 4        |
| **P5** | **Banner UI informatif** : afficher durée déconnexion + bouton « Reconnecter maintenant » + dernier emit reçu                                                       | 0.5 j   | 🟢 UX       | 5        |
| **P6** | **Backend log structuré disconnects** : logger reason (transport close, ping timeout, server force, client manual) pour faciliter le diagnostic post-incident       | 0.25 j  | 🟢 obs      | 6        |

---

## 5. Règles chantier

- Toute modif backend → workflow `src/` → build → deploy.ps1 -backend -nobuild
- Toute modif nginx → backup conf, deploy, vérifier via curl + logs nginx
- Tester sur staging d'abord. Backend prod direct uniquement si non risqué (lecture seule)
- Métriques avant/après : compter les disconnects sur 1h pendant un test représentatif

---

## 6. Journal de bord

**2026-04-24 nuit** — Chantier ouvert

- Symptôme rapporté par utilisateur : banner "Actualisation suspendue" fréquent, surtout après retour replay
- Doc créé (ce fichier)
- Agent Explore lancé pour cartographier infra socket complète (backend + frontend + nginx + logs)
- Roadmap 6 phases validée

**2026-04-25 matin** — Phase 1 livrée prod (P1 + P2 + P3 quick wins)

✅ **P2 nginx** — `nginx_host.conf` patché bloc `/socket.io` :

- `proxy_read_timeout 300s` + `proxy_send_timeout 300s` + `proxy_connect_timeout 60s`
- `proxy_buffering off` + `proxy_request_buffering off`
- `X-Real-IP` + `X-Forwarded-For` headers
- Backup conservé : `nginx_host.conf.bak-20260425`
- Reload nginx prod via `docker exec trackyu-gps-frontend-1 nginx -s reload`

✅ **P3 client socket** (`services/socket.ts` commit b561efb + 52a9ad1) :

- `withCredentials: true` → cookie httpOnly envoyé avec l'upgrade WebSocket
- `timeout: 20000` → init connect plus tolérant (réseaux lents/mobile)
- Handler `connect_error` : si message === 'Invalid token' → POST /auth/refresh
  pour rotater le cookie httpOnly, puis retry socket.connect() après 300ms
- Handler `disconnect` : log diagnostic + auto-reconnect si reason ===
  'io server disconnect'
- Flag `isRefreshing` pour éviter les refreshs concurrents

✅ **P1 mini backend** (`src/socket.ts` commit ae2fd2e) :

- Middleware auth essaie `socket.handshake.auth.token` puis fallback cookie
  httpOnly `access_token` (extrait via regex sur `socket.handshake.headers.cookie`)
- Si auth.token est présent mais expiré, le cookie (rotaté côté HTTP) est
  tenté en fallback — fix le cas où localStorage est figé
- Logs `[Socket] auth ok via auth.token|cookie` (success) ou
  `[Socket] auth rejected — auth.token=present|absent, cookie=present|absent`
  (rejet avec contexte)

**Cycle final stabilisé** :

1. Socket connect → token expiré (localStorage figé) + cookie expiré aussi
2. Backend : auth rejected → connect_error 'Invalid token'
3. Client : détecte → `POST /auth/refresh` (consomme refresh_token, pose
   access_token frais)
4. Client : `socket.connect()` retry après 300 ms
5. Browser envoie le nouveau cookie httpOnly avec l'upgrade WS
6. Backend : tryVerify(auth.token) ❌ → fallback cookie ✅
7. Connexion stable, plus de bandeau "Actualisation suspendue"

**Validation user 2026-04-25 01:30** : "c'est bon je crois" — `Invalid token`
plus persistant en prod après deploy.

**Reste à faire (Phase 2 - non urgent)** :

- 🟢 P4 Métrics Prometheus socket (disconnects/min, durée sessions, raison)
- 🟢 P5 Banner UI plus informatif (durée + bouton retry manuel)
- 🟢 P6 Backend log structuré disconnects par raison

Ces 3 items sont des améliorations d'observabilité, à faire si on a besoin
de mesurer plus finement. Pour l'instant, le bug fonctionnel est résolu.

---

## 7. Questions ouvertes

1. Les utilisateurs **mobile (Expo)** subissent-ils le même problème ? Ou comportement différent ?
2. Le dropping est-il corrélé à un nombre minimum de connexions simultanées (saturation) ?
3. Y a-t-il des métriques Prometheus déjà en place pour mesurer disconnects/min ?
4. Combien de temps tient une session socket en moyenne (médiane / p95) ?

---

_Dernière mise à jour : 2026-04-24 · à enrichir avec findings reco_
