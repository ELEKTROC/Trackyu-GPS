# Chantier — Stack Monitoring (Prometheus + Grafana + Alertmanager)

**Démarré** : 2026-04-25 nuit
**Statut** : 🟡 en cours
**Pilote** : Smartrack CI / Elektro Com
**Branche** : `chore/phase-2-10-gps-server`

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
| 1 | Migration `system_alerts` table | 5 min | ⏳ |
| 2 | Backend `SystemAlertDispatcher` service (email Resend + Socket.IO + INSERT DB) | 45 min | ⏳ |
| 3 | Endpoint `POST /api/v1/system/alerts` (auth shared token) | 20 min | ⏳ |
| 4 | Alertmanager config webhook → backend | 10 min | ⏳ |
| 5 | Caddy add `monitoring.trackyugps.com` (basic auth + reverse proxy Grafana + Alertmanager) | 15 min | ⏳ |
| 6 | Deploy stack monitoring (compose up + .env.monitoring chmod 600) | 15 min | ⏳ |
| 7 | Dashboard Grafana custom « TrackYu Overview » | 30 min | ⏳ |
| 8 | Runbooks markdown 5 alertes critiques | 15 min | ⏳ |
| 9 | Enrichir `SystemPanel.tsx` (Admin > Système) avec section Monitoring & Alertes | 45 min | ⏳ |

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
- ⚠️ Secrets exposés (RESEND_API_KEY + Firebase service account) lors de l'inspection env backend → rotation user requise avant fin de session
- Doc créée (ce fichier)
- **Prochaine étape** : démarrer étape 1 (migration `system_alerts` table)

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

## 8. Runbooks (à compléter étape 8)

Placeholder — sera rempli avec :
- `runbooks/BackendDown.md`
- `runbooks/GpsNoData.md`
- `runbooks/GpsHighErrorRate.md`
- `runbooks/PositionBufferBacklog.md`
- `runbooks/SocketHighDisconnectRate.md`

Chaque runbook doit contenir : symptôme, impact métier, étapes de diagnostic (logs/SQL à exécuter), correctifs courants, escalade (qui contacter si pas résolu en 30 min).

---

*Dernière mise à jour : 2026-04-25 nuit*
