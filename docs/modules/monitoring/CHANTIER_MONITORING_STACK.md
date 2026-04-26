# Chantier — Stack Monitoring (Prometheus + Grafana + Alertmanager)

**Démarré** : 2026-04-25 nuit
**Statut au 2026-04-26 23h UTC** : 🟢 Étapes 1-8 + 9 lot 1 livrées prod (stack live + 5 runbooks linkés + endpoint santé monitoring). Reste 9 lot 2 (UI SystemMetricsPanel — alertes firing + Socket listener + badges UP/DOWN).
**Pilote** : Smartrack CI / Elektro Com
**Branche** : `chore/phase-2-10-gps-server`
**URL prod** : https://monitoring.trackyugps.com (basic auth admin)
**Commits** : `20b073c` + `a45f7d5` (backend étapes 1-3 + rattrapage Bearer) · `da418d5` (étapes 4-6 stack) · `1b196dc` (étape 8 runbooks) · `0c9e74b` (étape 9 lot 1 backend monitoring-health)

**Enjeu** : déployer en prod la stack monitoring déjà entièrement préparée en code mais inactive (configs `docker-compose.monitoring.yml` + `prometheus.yml` + 25 alertes `rules.yml` + 3 dashboards Grafana). Active enfin l'observabilité réelle (mesurer les disconnects socket post chantier socket-stability, surveiller la queue position, alerter sur les pannes).

**Pourquoi** : sans cette stack, les bugs critiques (« Actualisation suspendue » fréquent) sont remontés par les utilisateurs, pas détectés proactivement. Une vraie app prod multi-tenant a besoin d'alertes push et d'un dashboard temps-réel.

---

## 1. Périmètre

1. **Stack monitoring containers** — Prometheus + Alertmanager + Grafana + node-exporter + redis-exporter + postgres-exporter sur le VPS prod (148.230.126.62)
2. **Sécurisation accès** — Caddy reverse proxy `monitoring.trackyugps.com` avec basic auth + HTTPS, ports backend bind 127.0.0.1 (pas d'exposition directe)
3. **Routing alertes** — webhook unique Alertmanager → backend → dispatch (email Resend + Socket.IO + DB audit)
4. **Dashboard métier custom** — « TrackYu Overview » avec 6-8 KPIs critiques GPS pipeline
5. **Runbooks** — markdown linkés via `runbook_url` dans annotations Prometheus pour les 5 alertes critiques

Hors scope :
- Loki (logs centralisés) — Phase 2
- OAuth SSO Grafana — Phase 2
- Status page publique — chantier séparé
- Backups volumes Docker — à intégrer dans le pg_dump quotidien existant (Phase 2)

---

## 2. Architecture cible

```
                                              ┌─────────────────────────────┐
                                              │  Backend (trackyu-backend)  │
                                              │                             │
Prometheus ─→ Alertmanager ─webhook─→ POST /api/v1/system/alerts            │
   │              │                            │                             │
   │              │                            ├─→ emailService (Resend)    │
   │              │                            │   → SUPERADMIN emails       │
   │              │                            │                             │
   │              │                            ├─→ Socket.IO emit            │
   │              │                            │   'admin:system-alert'      │
   │              │                            │   → toast staff connecté    │
   │              │                            │                             │
   │              │                            ├─→ INSERT system_alerts      │
   │              │                            │   → audit DB long terme     │
   │              │                            │                             │
   │              │                            └─→ FCM (futur, 0 token actuel)
   │              │                                                          │
   │              │                            └─────────────────────────────┘
   │              │
   │              └─→ UI Alertmanager :9093 (debug, silences temporaires)
   │
   └─→ Scrape /metrics backend toutes les 10s
       Scrape node + redis + postgres exporters

User → https://monitoring.trackyugps.com (Caddy basic auth)
       ├─→ Grafana :3030 (dashboards)
       └─→ /alertmanager → Alertmanager UI :9093
```

**Pourquoi un webhook unique** :
- 1 seul point de routing, modifiable sans restart Alertmanager
- Réutilise auth + rôles backend (SUPERADMIN seulement, multi-tenant aware)
- Audit log natif (table `system_alerts`)
- Cohérent avec le pattern `admin:unknown-imei` (Phase 4)
- Future : ajouter Telegram en 5 lignes côté backend sans toucher Alertmanager

---

## 3. État existant — vérifié 2026-04-25

| Composant | État | Détail |
|---|---|---|
| `docker-compose.monitoring.yml` | ✅ complet | Prometheus + Alertmanager + Grafana + 3 exporters, volumes, healthchecks, network external `trackyu-gps_default` |
| `monitoring/prometheus/prometheus.yml` | ✅ scrape configuré | backend:3001 toutes les 10s + node + redis + postgres |
| `monitoring/prometheus/rules.yml` | ✅ 25 alertes | dont 4 GPS pipeline + 2 ajoutées cette session (GpsUnknownImeiSpike, SocketHighDisconnectRate) |
| `monitoring/grafana/dashboards/` | ✅ 3 dashboards | api-performance, business-realtime, system-overview |
| `monitoring/alertmanager/alertmanager.yml` | ⚠️ TODO | receivers en TODO (logs only) — à brancher webhook backend |
| Backend metrics `/metrics` | ✅ exposé | prom-client : gpsActiveConnections, gpsMessagesReceived, gpsProcessingLatency, gpsPositionsSaved, gpsParsingErrors, dbPool, positionBufferSize, wsMessages + 2 nouveaux (cette session) |
| Resend API key | ✅ env backend | + `services/emailService.ts` existe |
| Firebase Admin SDK | ✅ env backend | project trackyu (FCM disponible) |
| Push tokens SUPERADMIN | ❌ 0 device | Aucun SUPERADMIN n'a installé l'app mobile → email Resend = canal principal v1, FCM en bonus quand un superadmin se connecte mobile |
| Table `alerts` (DB) | ✅ existe | Mais véhicule-scoped (vehicle_id, type, severity, message, tenant_id) — pas adaptée pour system alerts |
| Table `system_alerts` (DB) | ❌ à créer | Migration à écrire (id, alertname, severity, fingerprint, status, started_at, resolved_at, payload jsonb) |
| Endpoint `POST /api/v1/system/alerts` | ❌ à créer | Auth shared token (X-Webhook-Token vérifié contre env `ALERTMANAGER_WEBHOOK_TOKEN`) |
| Caddy `monitoring.trackyugps.com` | ❌ à ajouter | `/root/sms-app/Caddyfile` côté VPS — proxie déjà trackyugps.com / staging / live → 172.17.0.1:3001 |
| DNS `monitoring.trackyugps.com` | 🟡 créé en attente propagation | A record → 148.230.126.62 (par user 2026-04-25 nuit chez Hostinger) |
| Containers Prometheus / Grafana / Alertmanager | ❌ pas démarrés | docker-compose.monitoring.yml prêt, à `up -d` |

---

## 4. Roadmap exécutive

| # | Étape | Effort | État |
|---|---|---|---|
| 1 | Migration `system_alerts` table | 5 min | ✅ prod |
| 2 | Backend `SystemAlertDispatcher` service (email Resend + Socket.IO + INSERT DB) | 45 min | ✅ prod |
| 3 | Endpoint `POST /api/v1/system/alerts` (auth shared token) | 20 min | ✅ prod |
| 4 | Alertmanager config webhook → backend | 10 min | ✅ prod |
| 5 | Caddy add `monitoring.trackyugps.com` (basic auth + reverse proxy Grafana) | 15 min | ✅ prod |
| 6 | Deploy stack monitoring (compose up + .env.monitoring chmod 600) | 15 min | ✅ prod |
| 7 | Dashboard Grafana custom « TrackYu Overview » | 30 min | ⏳ |
| 8 | Runbooks markdown 5 alertes critiques | 15 min | ⏳ |
| 9 | Enrichir `SystemMetricsPanel.tsx` (UI alertes firing + statut services) | 45 min | ⏳ |

Total estimé : **~3h15**.

### Étape 9 — détail UI (2 vues réutilisent le même composant)

**Composant à enrichir** : `features/tech/components/monitoring/SystemMetricsPanel.tsx`

Pourquoi un seul fichier pour 2 vues : `SystemMetricsPanel` est déjà importé et rendu par :
- `features/tech/components/monitoring/MonitoringView.tsx` (Tech > Monitoring > onglet SYSTEM, ligne 460)
- `features/admin/components/panels/SystemPanel.tsx` (Administration > Système, ligne 47)

Donc tout enrichissement de `SystemMetricsPanel` apparaît automatiquement aux 2 endroits.

L'onglet **ALERTS** de MonitoringView est dédié aux **alertes véhicules** (`AlertsConsole.tsx` — speeding, fuel, geofence, etc.) — distinct des system alerts infra. Pas de fusion.

L'onglet **PIPELINE_GPS** de MonitoringView affiche les stats parsing (parsers actifs, success rate, queue, IMEI inconnus) — distinct aussi des alertes Prometheus.

Ajouts proposés à `SystemMetricsPanel` :

- **Section « Statut stack monitoring »** : Prometheus / Grafana / Alertmanager / Backend → badges up/down via `GET /api/v1/system/health/monitoring`
- **Section « Alertes firing actives »** : liste depuis `GET /api/v1/system/alerts/firing` (lit `system_alerts WHERE status='firing'`) — colonnes alertname / severity badge / summary / durée écoulée / bouton « Détails »
- **Lien externe** : bouton « Ouvrir Grafana » → `https://monitoring.trackyugps.com` (nouvel onglet)
- **Toast Socket.IO** : déjà géré côté `NotificationContext` quand le backend émet `admin:system-alert` (via SystemAlertDispatcher étape 2)

`SystemPanel.tsx` (Admin > Système) reste tel quel — il garde sa logique config (clé API Google Maps) + bénéficie automatiquement de l'enrichissement de `SystemMetricsPanel` qu'il rend.

Avantage : un seul composant à maintenir, 2 vues couvertes (Tech monitoring opérationnel + Admin SUPERADMIN config).

---

## 5. Décisions techniques + compromis

### 5.1 Webhook unique vs receivers Alertmanager natifs
- **Choisi** : webhook unique vers backend `/api/v1/system/alerts` qui dispatche
- **Pourquoi** : centralise la logique (rate limiting, dédoublonnage, multi-canal, audit) côté backend versionné. Alertmanager devient transport pur. Plus facile à étendre (Telegram/Slack futur = 1 méthode dans `SystemAlertDispatcher`)

### 5.2 Sécurisation accès
- **Choisi** : Caddy reverse proxy `monitoring.trackyugps.com` + basic auth, ports backend bind 127.0.0.1
- **Pourquoi** : Prometheus et Alertmanager n'ont **aucune auth native** — tout admin qui voit le port peut silence les alertes critiques sans trace. Caddy + basic auth = zéro risque + HTTPS auto via Let's Encrypt déjà en place
- **Phase 2** : OAuth GitHub/Google SSO Grafana

### 5.3 Push FCM SUPERADMIN
- **Choisi** : email Resend + Socket.IO seulement pour v1 (skip FCM)
- **Pourquoi** : 0 token FCM enregistré pour les 3 SUPERADMIN actuels (admin@demo, dg@trackyugps, superadmin@trackyugps). FCM = bonus futur quand un staff installe l'app mobile et reçoit son token
- **Code** : `SystemAlertDispatcher` reste extensible — méthode `dispatchFcm()` à implémenter quand utile

### 5.4 Table `system_alerts` séparée vs réutilisation `alerts`
- **Choisi** : créer `system_alerts` distinct
- **Pourquoi** : `alerts` est véhicule-scoped (FK vehicle_id, message client-friendly, multi-tenant strict). Les system alerts sont infra-scoped (alertname Prometheus, fingerprint, started_at/resolved_at, pas de tenant). Mélanger casse les indexes et la sémantique

---

## 6. Journal de bord

**2026-04-25 nuit** — Chantier ouvert
- Reco effectuée : tout le code monitoring est prêt depuis longtemps mais aucun container ne tourne (découvert 2026-04-25 lors du sweep état réel des phases)
- Validations utilisateur : approche Phase 1 (MVP solide) avec Caddy + email Resend + dashboard custom + runbooks
- Findings infra : Resend ✅ / Firebase ✅ / tables push existantes / 0 token SUPERADMIN / Caddy `/root/sms-app/Caddyfile` / DNS `monitoring.trackyugps.com` créé chez Hostinger en attente propagation
- ⚠️ Secrets exposés (RESEND_API_KEY + Firebase service account) lors de l'inspection env backend → rotation user requise avant fin de session (Resend + Firebase prioritaires)
- Doc créée (ce fichier)

**2026-04-26 — Étapes 1-3 livrées prod (commit 20b073c)**
- Migration `system_alerts` appliquée prod (table + 3 indexes)
- Service `SystemAlertDispatcher` : parser Alertmanager v4 + dispatch email Resend (firing + critical/warning seulement, via getSuperAdminEmails) + Socket.IO emit `admin:system-alert` room superadmin (firing OU resolved) + INSERT system_alerts (audit). Template HTML email avec badge severity + lien Grafana + lien runbook
- Helper `getSuperAdminEmails()` ajouté à emailService (variant restrictif vs `getAdminEmails` qui inclut ADMIN/SUPPORT)
- Endpoint `POST /api/v1/system/alerts` (auth shared token via header `X-Webhook-Token` ou `Authorization: Bearer`, validé constant-time via crypto.timingSafeEqual)
- Endpoints `GET /api/v1/system/alerts/firing` + `/history` (auth JWT, pour UI étape 9)
- Test live prod via curl validé : `{ok:true, processed:1, persisted:1, emailed:0, socketed:1}` pour info severity (correct — email réservé critical/warning)
- Token webhook stocké : env var `ALERTMANAGER_WEBHOOK_TOKEN` dans `/var/www/trackyu-gps/.env`

**2026-04-26 — Étapes 4-6 livrées prod (commit da418d5)**
- Étape 4 : `monitoring/alertmanager/alertmanager.yml` template avec receiver unique webhook → backend, http_config Bearer token, routes par severity (critical 1h repeat, warning 4h, info 12h), inhibit warning quand critical du même alertname
- Étape 5 : Caddy `monitoring.trackyugps.com` ajouté à `/root/sms-app/Caddyfile` avec basic auth bcrypt (user `admin`) + headers HSTS/X-Frame/X-Content-Type + reverse proxy `172.17.0.1:3030` (Grafana). Backup `Caddyfile.bak-20260425`. Reload Caddy validé (warning `basicauth` deprecated → `basic_auth`, fonctionnel)
- Étape 6 : `docker-compose.monitoring.yml` mis à jour pour bind ports `127.0.0.1` (Prometheus 9090, Alertmanager 9093, exporters 9100/9121/9187) sauf Grafana sur `172.17.0.1:3030` (accessible Caddy). Fix Grafana `GF_ALERTING_ENABLED=false` (cohabite avec `GF_UNIFIED_ALERTING_ENABLED=true` dans Grafana 10). Fichier `.env.monitoring` chmod 600 créé sur VPS avec `GRAFANA_ADMIN_PASSWORD`, `POSTGRES_USER/PASS/DB`, `ALERTMANAGER_WEBHOOK_TOKEN`, `BACKEND_WEBHOOK_URL`. Substitution `envsubst < alertmanager.yml.tpl > alertmanager.yml` côté VPS au boot (chmod 644 pour user `nobody` Alertmanager)
- Stack live : 5 targets Prometheus UP (trackyu-backend + node + redis + postgres + prometheus self), 3 dashboards Grafana auto-provisionnés
- Caddy basic auth validé : HTTP 401 sans creds, HTTP 200 avec
- E2E webhook validé prod : `curl POST /api/v2/alerts` → Alertmanager → backend → INSERT system_alerts (id=3, alertname=E2EFinal2, severity=warning) + email Resend SUPERADMIN envoyé (`emailed=t`) + Socket.IO emit (`socketed=t`)
- Limitation documentée (section 6.bis) : `BACKEND_WEBHOOK_URL=http://172.20.0.4:3001` (IP container backend hardcodée — bug DNS Docker spécifique image Alertmanager qui ne résout pas l'alias `backend-internal` malgré tous les autres containers du même réseau le résolvant)

**2026-04-26 nuit — Étapes 7-8 + 9 lot 1 livrées prod**
- Étape 7 : zéro doublon avec « Administration Système » et « Monitoring Pipeline GPS » existants → décision d'enrichir le dashboard Grafana `business-realtime.json` avec 3 panels (Socket Disconnects by Reason, Unknown IMEIs/h, Active System Alerts firing) plutôt que créer un dashboard parallèle. Bouton « Ouvrir Grafana » de SystemMetricsPanel pointé sur `https://monitoring.trackyugps.com`. Dashboard `gps-pipeline.json` récupéré du VPS pour versioning (était live mais absent du repo)
- Étape 8 (commit `1b196dc`) : 5 runbooks markdown créés pour les alertes critiques (BackendDown, GpsNoData, GpsHighErrorRate, PositionBufferBacklog, SocketHighDisconnectRate). Annotation `runbook_url` ajoutée dans `rules.yml` → passe de bout en bout (Prometheus → Alertmanager → backend → email). Validation E2E : test BackendDown synthétique → INSERT `system_alerts` avec runbook URL OK
- Étape 9 lot 1 (commit backend `0c9e74b` + frontend en cours) : nouveau handler `getMonitoringHealth` + route `GET /api/v1/system/monitoring-health` (JWT). Pingue Prometheus/Grafana/Alertmanager en parallèle (timeout 2s, fetch natif Node 18 + AbortController), retourne `{up, latencyMs, status|error}` par service. URLs overridables via env. Côté frontend, `api.system.alertsFiring()` et `api.system.monitoringHealth()` ajoutés dans `services/api/admin.ts` (avec mocks USE_MOCK). E2E prod validé : 3 services up latency ~28ms, 2 alertes GpsUnknownImeiSpike firing remontées
- Observation : la table `system_alerts` insère un nouveau row à chaque firing même fingerprint identique (pas d'UPSERT). Crée des doublons côté `/firing` endpoint. À fixer dans une itération future (UPSERT par fingerprint OU dedup côté listFiring via DISTINCT ON)

**Prochaine étape** : étape 9 lot 2 (UI SystemMetricsPanel — section alertes firing + Socket.IO listener `admin:system-alert` + 3 mini-badges UP/DOWN Prometheus/Grafana/Alertmanager dans la carte Grafana)

---

## 6.bis Limitations connues (à fixer plus tard)

### 6.bis.1 IP statique backend hardcodée dans alertmanager.yml

**Constat** : `BACKEND_WEBHOOK_URL=http://172.20.0.4:3001` (IP du container backend dans le réseau `trackyu-gps_default`).

**Pourquoi** : DNS Docker a un comportement étrange depuis l'image Alertmanager :
- Grafana, backend, postgres → résolvent bien `backend-internal` (network alias)
- Alertmanager → "Can't find backend-internal: No answer" (cache DNS muet)
- `host.docker.internal:host-gateway` mappe sur `172.17.0.1` (gateway docker0) inaccessible depuis 172.20.0.0/16

**Risque** : si l'ordre de démarrage des containers change ou si le backend est recreate après d'autres services, l'IP du backend peut changer. Dans ce cas → regen `alertmanager.yml` via envsubst + restart Alertmanager.

**Fix robuste futur** :
- Réserver une IP statique dans le compose backend : `networks: { default: { ipv4_address: 172.20.0.50 } }`
- Ou : enquêter sur le bug DNS Alertmanager (peut-être TTL cache, peut-être restart timing)

Pour l'instant, fonctionnel et documenté.

---

## 7. Questions ouvertes / TODO

1. **DNS propagation** — vérifier `dig monitoring.trackyugps.com` retourne bien `148.230.126.62` avant de configurer Caddy (sinon Let's Encrypt échoue le challenge)
2. **Basic auth credentials** — choix : génération random ou un user/password choisi par user ? Stocker dans `/var/www/trackyu-gps/.env.monitoring` chmod 600
3. **Liste destinataires email alertes** — env var `SYSTEM_ALERT_RECIPIENTS=...` (CSV) ou table `system_alert_recipients` ? Pour MVP env var suffit
4. **Rotation `repeat_interval`** — 4h pour warning, 1h pour critical (déjà dans alertmanager.yml). OK ou ajuster ?
5. **Inhibition** — déjà configurée (warning inhibé si critical du même alertname). OK
6. **Backup volumes Docker** — `prometheus_data`, `grafana_data`, `alertmanager_data` à intégrer dans le script `/usr/local/bin/trackyu-db-*` quotidien 3h15 ? Phase 2

---

## 8. Runbooks ✅ livrés (étape 8, commit `1b196dc`)

| Runbook | Severity | Condition Prometheus | Pattern correctifs |
|---|---|---|---|
| [`monitoring/runbooks/BackendDown.md`](../../../monitoring/runbooks/BackendDown.md) | critical | `up{job="trackyu-backend"} == 0` for 1m | container restart loop / OOM kill / port conflict / réseau Docker |
| [`monitoring/runbooks/GpsNoData.md`](../../../monitoring/runbooks/GpsNoData.md) | critical | `rate(gps_messages_received_total[5m]) == 0` for 10m | TCP entrant absent / parser silencieusement KO / port 5000 non bindé après crash |
| [`monitoring/runbooks/GpsHighErrorRate.md`](../../../monitoring/runbooks/GpsHighErrorRate.md) | warning | erreurs parsing > 20% for 5m | firmware tracker change / CRC GT06 spike / DB overload silencieux |
| [`monitoring/runbooks/PositionBufferBacklog.md`](../../../monitoring/runbooks/PositionBufferBacklog.md) | warning | `position_buffer_size > 500` for 2m | DB lente (compression/locks) / spike post-outage / pool DB saturé |
| [`monitoring/runbooks/SocketHighDisconnectRate.md`](../../../monitoring/runbooks/SocketHighDisconnectRate.md) | warning | `rate(socket_disconnects_total[5m]) > 0.5` for 10m | JWT auth boucle / ping timeout / Caddy reload / nginx WS timeouts |

Structure commune : Diagnostic 3-5 commandes prêtes à coller (SSH prod), Correctifs lettrés A/B/C/D selon hypothèse, Escalade si > 30min, Post-incident checklist.

L'annotation `runbook_url` est passée de bout en bout : Prometheus → Alertmanager → backend dispatcher → email Resend (footer du template HTML linke directement le runbook GitHub).

---

*Dernière mise à jour : 2026-04-26 nuit — étapes 7-8 + 9 lot 1 livrées prod*
