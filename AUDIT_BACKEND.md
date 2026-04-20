# Audit backend — Synthèse

**Date audit initial** : 2026-04-18
**Dernière mise à jour** : 2026-04-19
**Auteur** : audit automatisé via SSH read-only sur VPS prod `148.230.126.62`
**Rapports détaillés** :

- [AUDIT_BACKEND_SECURITE.md](AUDIT_BACKEND_SECURITE.md)
- [AUDIT_BACKEND_PERF.md](AUDIT_BACKEND_PERF.md)
- [AUDIT_BACKEND_ARCHITECTURE.md](AUDIT_BACKEND_ARCHITECTURE.md)
- [AUDIT_BACKEND_DETTE.md](AUDIT_BACKEND_DETTE.md)
- [AUDIT_BACKEND_INFRA.md](AUDIT_BACKEND_INFRA.md)

---

## Verdict mis à jour (2026-04-19)

Sprint intensif sur 2 jours — la plupart des urgences ont été traitées en prod. Reste le gros morceau de dette long-terme : remise au carré `src/`, migration majeure de dépendances et refactor pattern repository.

- ✅ **Backups** : pg_dump quotidien 3h15 UTC + snapshot Hostinger.
- ✅ **Secrets** : tous sortis des fichiers compose/repo, `chmod 600`, Redis password rotaté.
- ✅ **S11 mot de passe en clair** : AES-256-GCM en DB + endpoint contrôlé ré-auth + audit log + rate-limit Redis. Backend prod déployé, frontend déployé **staging** (à valider).
- ✅ **Healthchecks + swap + fail2ban + uptime cron** : infra ops remise à niveau.
- 🔄 **npm audit** : 45 → 34 CVE (--force bcrypt 6 pas encore passé).
- ⏳ **Dette `src/` abandonné** : non traitée, critique long-terme.
- ⏳ **Pattern repository** (257 `pool.query` dans routes) : non traité.
- ⏳ **Pagination liste** + `console.log` prod + cache Redis étendu : en cours/reste.

---

## État par item (à jour 2026-04-19)

### 🔐 Sécurité

| Item                                | Rapport                          | État                                                       |
| ----------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| S1 vehicleExtrasRoutes.js SQL cassé | [S1](AUDIT_BACKEND_SECURITE.md)  | ✅                                                         |
| S2 Secrets docker-compose           | [S2](AUDIT_BACKEND_SECURITE.md)  | ✅ (+ rotation Redis)                                      |
| S3 ACCESS_TOKEN_EXPIRY=15m          | [S3](AUDIT_BACKEND_SECURITE.md)  | ✅                                                         |
| S4 Math.random() → crypto           | [S4](AUDIT_BACKEND_SECURITE.md)  | ✅                                                         |
| S5 bcrypt 12 + rehash               | [S5](AUDIT_BACKEND_SECURITE.md)  | ✅ P1 + P2 déployés prod                                   |
| S6 Magic bytes uploads              | [S6](AUDIT_BACKEND_SECURITE.md)  | ✅                                                         |
| S7 chmod 600 .env\*                 | [S7](AUDIT_BACKEND_SECURITE.md)  | ✅                                                         |
| S8 console.log × 199 → logger       | [S8](AUDIT_BACKEND_SECURITE.md)  | ✅ re-scopé (0 fuite sensible runtime)                     |
| S9 CSP unsafe-inline                | [S9](AUDIT_BACKEND_SECURITE.md)  | 🟡 long-terme                                              |
| S10 Rate-limit geocode              | [S10](AUDIT_BACKEND_SECURITE.md) | ✅                                                         |
| S11 AES-GCM encrypted_password      | [S11](AUDIT_BACKEND_SECURITE.md) | 🔄 back prod ✅ · front staging ✅ · prod + DROP COLUMN ⏳ |

### 🗑️ Dette

| Item                    | Rapport                      | État                                                                               |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| D1 src/ abandonné       | [D1](AUDIT_BACKEND_DETTE.md) | 🔄 Phase 0 exécutée ([SRC_DIST_INVENTORY.md](SRC_DIST_INVENTORY.md)) · Phase 1+ ⏳ |
| D2 45 CVE npm           | [D2](AUDIT_BACKEND_DETTE.md) | 🔄 45→34 (bcrypt 6 reste)                                                          |
| D3 Versions majeures    | [D3](AUDIT_BACKEND_DETTE.md) | ⏳ cycle trim                                                                      |
| D4 fichiers .bak        | [D4](AUDIT_BACKEND_DETTE.md) | ✅                                                                                 |
| D5 70 scripts one-off   | [D5](AUDIT_BACKEND_DETTE.md) | ✅                                                                                 |
| D7 console.log (cf S8)  | [D7](AUDIT_BACKEND_DETTE.md) | ⏳                                                                                 |
| D8 DROP vehicles_legacy | [D8](AUDIT_BACKEND_DETTE.md) | ✅                                                                                 |
| D9 Node 20 → 22         | [D9](AUDIT_BACKEND_DETTE.md) | ⏳ Q3                                                                              |

### 🖥️ Infra

| Item                     | Rapport                       | État                         |
| ------------------------ | ----------------------------- | ---------------------------- |
| I1 pg_dump + Hostinger   | [I1](AUDIT_BACKEND_INFRA.md)  | ✅                           |
| I2 staging_backend crash | [I2](AUDIT_BACKEND_INFRA.md)  | ✅                           |
| I3 Healthchecks Docker   | [I3](AUDIT_BACKEND_INFRA.md)  | ✅                           |
| I4 Swap 4G               | [I4](AUDIT_BACKEND_INFRA.md)  | ✅                           |
| I5 fail2ban              | [I5](AUDIT_BACKEND_INFRA.md)  | ✅                           |
| I6 Uptime cron           | [I6](AUDIT_BACKEND_INFRA.md)  | 🔄 canal notify + Grafana ⏳ |
| I7 Séparer sms-app       | [I7](AUDIT_BACKEND_INFRA.md)  | ⏳ budget                    |
| I9 Log rotation          | [I9](AUDIT_BACKEND_INFRA.md)  | ✅ (déjà en place)           |
| I10 Blue/Green           | [I10](AUDIT_BACKEND_INFRA.md) | ⏳                           |

### ⚡ Performance

| Item                  | Rapport                     | État                                           |
| --------------------- | --------------------------- | ---------------------------------------------- |
| P1 Cache Redis        | [P1](AUDIT_BACKEND_PERF.md) | 🔄 dashboard ✅ · permissions/tiers/geocode ⏳ |
| P2 Slow query log     | [P2](AUDIT_BACKEND_PERF.md) | ✅                                             |
| P3 SELECT \*          | [P3](AUDIT_BACKEND_PERF.md) | 🔄 2/172 traités                               |
| P4 Pagination cursor  | [P4](AUDIT_BACKEND_PERF.md) | ⏳                                             |
| P5 Pool PG monitoring | [P5](AUDIT_BACKEND_PERF.md) | ✅                                             |
| P6 Socket.io throttle | [P6](AUDIT_BACKEND_PERF.md) | ⏳                                             |
| P7 Redis maxmemory    | [P7](AUDIT_BACKEND_PERF.md) | ✅                                             |
| P8 Indexes top slow   | [P8](AUDIT_BACKEND_PERF.md) | 🔄 devices ✅ · payments/journal ⏳            |
| P9 VACUUM zoho        | [P9](AUDIT_BACKEND_PERF.md) | ✅ (faux positif levé)                         |

### 🏗️ Architecture

| Item                          | Rapport                             | État         |
| ----------------------------- | ----------------------------------- | ------------ |
| A1 257 pool.query dans routes | [A1](AUDIT_BACKEND_ARCHITECTURE.md) | ⏳ **lourd** |
| A2 Couches incohérentes       | [A2](AUDIT_BACKEND_ARCHITECTURE.md) | ⏳           |
| A3 Scripts one-off (=D5)      | [A3](AUDIT_BACKEND_ARCHITECTURE.md) | ✅           |
| A4 .bak (=D4)                 | [A4](AUDIT_BACKEND_ARCHITECTURE.md) | ✅           |
| A5 Monolithes controllers     | [A5](AUDIT_BACKEND_ARCHITECTURE.md) | ⏳           |
| A7 Retrait alias /api         | [A7](AUDIT_BACKEND_ARCHITECTURE.md) | ⏳ trim      |

---

## Ce qui reste à faire (priorisé)

### 🔥 Immédiat (valider ce qui est déjà déployé)

1. **S11 — Valider reveal-password sur staging** : tester les 3 surfaces (SettingsView, StaffPanelV2, MyAccountView) + cas erreur + self-view toutes rôles. Puis go prod web + `DROP COLUMN plain_password` après 48 h.

### ⏰ Cette semaine (urgences restantes)

2. **D2 — bcrypt 6 (npm audit fix --force)** : tester en staging (hashs existants + rehash opportuniste cf. S5) puis prod.
3. **S5 — bcrypt rounds 10 → 12** + rehash opportuniste au login (couplé à D2).
4. **S8/D7 — `console.log` × 199 → logger** : 2 h, élimine fuite tokens/tenants en logs Docker.
5. **I6+ — Canal notify uptime** : choisir Healthchecks.io / Slack / Telegram, raccorder le stub.

### 🔥 Sprint (gros morceaux techniques)

6. **D1 — Remise au carré `src/`** : 2 j planning + 5 j exec. Bloc tout le reste de la dette code.
7. **A1 — Pattern repository** : ESLint `no-restricted-imports` + migrer top-5 routes (vehicle, fleet, invoice, user, auth). 8 h.
8. **P4 — Pagination cursor-based** sur routes liste non bornées (`/fleet/vehicles`, `/invoices`, `/audit-logs`). 6 h.
9. **P1 étendu — Cache Redis permissions + tiers + tenant settings**. 4 h. Gain P95 significatif.
10. **A5 — Splitter controllers > 800 lignes** (finance, intervention, vehicle). 6 h.

### 🟠 À cadencer (trimestre)

11. **P3 — Reste 170 `SELECT *`** à filtrer route par route.
12. **P6 — Throttle Socket.io** 1 Hz pour clients multi-véhicules.
13. **P8 — `payments` / `journal_entries` LIMIT + cursor** : décision produit (usage export).
14. **D3 — Cycle MAJ majeures** : express 5, multer 2, openai 6, stripe 22, dotenv 17.
15. **I7 — Séparer sms-app** sur VPS distinct (sur budget).
16. **I10 — Blue/Green deploy** via nginx upstream.
17. **A7 — Retrait alias `/api`** (301 vers `/api/v1` + délai client 6 mois).
18. **S9 — CSP nonces** (si migration Emotion SSR).
19. **D9 — Node 20 → 22** d'ici fin Q3 (LTS Node 20 jusqu'oct 2026).

---

## Score par axe (estimé après sprint)

| Axe          | Score audit | Score 2026-04-19 | Commentaire                                                                     |
| ------------ | ----------- | ---------------- | ------------------------------------------------------------------------------- |
| Sécurité     | 6/10        | **8/10**         | 8/11 items clos, reste S5/S8 + validation S11                                   |
| Performance  | 5/10        | **6.5/10**       | Slow log, cache dashboard, indexes hot, mais 170 SELECT \* + pagination restent |
| Architecture | 5/10        | **5.5/10**       | Scripts/bak nettoyés, mais A1/A5 non touchés                                    |
| Dette        | 3/10        | **5/10**         | .bak/scripts/vehicles_legacy ✅ · src/ + bcrypt 6 ⏳                            |
| Infra/Ops    | 4/10        | **8/10**         | Backup, swap, healthchecks, fail2ban, uptime : tous en place                    |
| **Global**   | **4.6/10**  | **~6.5/10**      | À remonter à 7.5+ avec la semaine en cours                                      |

---

## Ce qui est exclu de cet audit

- Code mobile (`trackyu-mobile-expo/`) — session parallèle, non touché.
- Frontend (`dist/` web) — audit séparé à faire.
- GPS TCP server (`gps-server/`) — audit spécifique protocole nécessaire.
- Qualité des tests (`tests/`) — à chiffrer coverage dans un run dédié.
