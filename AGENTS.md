# AGENTS.md — TrackYu GPS Frontend

Instructions permanentes pour Codex. Ces règles s'appliquent à chaque session, sans exception.

---

## 🟧 CHANTIER ACTIF — Refonte frontend V2 (depuis 2026-04-26)

**Pivot stratégique D12** : reconstruction complète du frontend dans `trackyu-front-V2/` à partir des mockups Codex.ai Design comme code source. Backend (`trackyu-backend/`) intact. Le legacy `TRACKING/` devient archive read-only après bascule (D17).

### Bootstrap protocol — toute nouvelle session Codex lit dans cet ordre

1. **AGENTS.md** (ce fichier — auto-loaded) — règles permanentes
2. **`docs/design-system/STATE.md`** — état temps réel (où on en est, ce qui se passe, ce qui vient)
3. **`docs/design-system/CHANGELOG.md`** — historique décisions (D1-D17+)
4. Si tâche sur un module précis : **`docs/design-system/modules/<MODULE>.md`** (spec auto-suffisante)
5. Procéder

### Documents de référence du chantier

| Document                                        | Rôle                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `docs/design-system/CHANTIER_REFONTE_DESIGN.md` | Charter umbrella v0.5 (vision, principes, décisions D1-D17)         |
| `docs/design-system/STATE.md`                   | **État temps réel** (à lire en premier après AGENTS.md)             |
| `docs/design-system/CHANGELOG.md`               | Journal versionné des décisions et livraisons                       |
| `docs/design-system/DLS.md`                     | Source canonique des tokens, composants, règles design              |
| `docs/design-system/BLUEPRINT.md`               | Brief Design des écrans (musts / libertés / nudges)                 |
| `docs/design-system/RBAC_MATRIX.md`             | Matrice 12 rôles × écrans × permissions (référence à l'intégration) |
| `docs/design-system/INTEGRATION_PLAYBOOK.md`    | Workflow build module par module                                    |
| `docs/design-system/SCREEN_MAP.md`              | Inventaire 141 écrans / panels / modales                            |
| `docs/design-system/AUDIT.md`                   | Audit du legacy (référence historique)                              |
| `docs/design-system/modules/<MODULE>.md`        | Spec auto-suffisante par module                                     |
| `docs/design-system/modules/_TEMPLATE.md`       | Gabarit pour créer un nouveau module spec                           |

### Règle d'or de préservation de contexte

À la fin de chaque session significative, **mettre à jour** :

- `STATE.md` (sections "Où on en est" / "En cours" / "Prochaine action")
- `CHANGELOG.md` (entrée datée)
- Si module touché : sa spec `modules/<MODULE>.md` (statut + checklist + changelog du module)

→ La prochaine session démarre **sans perte de contexte**.

---

## Skills de référence

Lire le fichier skill correspondant avant d'attaquer une tâche dans ces domaines :

| Domaine                                                          | Fichier                                   |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Diagnostic balise GPS / carburant                                | `.Codex/skills/gps-debug.md`              |
| Déploiements (staging / prod)                                    | `.Codex/skills/deploy.md`                 |
| Design system / charte graphique                                 | `.Codex/skills/frontend-design-system.md` |
| Modifications backend (src/ → build → deploy)                    | `.Codex/skills/backend-workflow.md`       |
| Métier TrackYu (rôles, modules, règles)                          | `.Codex/skills/metier-trackyu.md`         |
| Sécurité applicative (auth, rôles, patches)                      | `.Codex/skills/security.md`               |
| Ingestion GPS (parsers, pipeline carburant)                      | `.Codex/skills/data_ingestion.md`         |
| Base de données (schéma, requêtes, migrations)                   | `.Codex/skills/databases.md`              |
| Finance & facturation (abonnements, Zoho)                        | `.Codex/skills/finance_billing.md`        |
| App mobile (Expo, thèmes, navigation)                            | `.Codex/skills/mobile_frontend.md`        |
| API & intégration frontend (React Query, WS)                     | `.Codex/skills/api_integration.md`        |
| DevOps (Docker, CI/CD, backups VPS)                              | `.Codex/skills/devops.md`                 |
| Réseau & protocoles GPS (GT06, CONCOX, ADC)                      | `.Codex/skills/networking.md`             |
| Internationalisation (i18n FR→EN→ES)                             | `.Codex/skills/internationalization.md`   |
| Tests (Jest, supertest, isolation tenant)                        | `.Codex/skills/testing.md`                |
| Intégration IA (Codex API, AiAssistant)                          | `.Codex/skills/ai_integration.md`         |
| UX/UI (design system, patterns composants)                       | `.Codex/skills/ux_ui.md`                  |
| CRM & intégrations clients (Zoho, pipeline)                      | `.Codex/skills/crm_integration.md`        |
| Conformité & données personnelles (RGPD)                         | `.Codex/skills/compliance.md`             |
| Data science & analyses flotte (SQL, KPIs)                       | `.Codex/skills/data_science.md`           |
| Gestion de projet (sprints, priorités, workflow)                 | `.Codex/skills/project_management.md`     |
| Boîtiers GPS & analyse trames brutes (modèles, protocoles, fuel) | `.Codex/skills/device_management.md`      |

### Règle de mise à jour des skills

**Mettre à jour le fichier skill concerné dès qu'un workflow change.**

Cas déclencheurs obligatoires :

- Nouvelle commande de déploiement → mettre à jour `deploy.md`
- Changement de structure DB (nouvelle table, colonne) → mettre à jour `databases.md`
- Nouveau protocole GPS ou parser → mettre à jour `data_ingestion.md` et `networking.md`
- Changement de stack mobile (lib, thème, navigation) → mettre à jour `mobile_frontend.md`
- Nouveau module CRM / finance → mettre à jour le skill correspondant
- Règle métier modifiée (rôles, isolation, 1=1=1=1) → mettre à jour `metier-trackyu.md`
- Nouvelle clé i18n ou vague déployée → mettre à jour `internationalization.md`

Le skill doit refléter l'état **actuel** du projet, pas l'état initial. Un skill obsolète est pire qu'un skill absent.

---

---

## Workflow déploiement — OBLIGATOIRE

**Ne jamais déployer en prod sans validation staging préalable.**

```
1. deploy-staging.ps1        → build + staging uniquement
2. Valider sur staging.trackyugps.com (attendre accord explicite)
3. deploy.ps1 -frontend      → prod frontend seulement après validation
4. deploy.ps1 -backend -nobuild → prod backend si modifs backend
```

- `deploy-staging.ps1` = staging uniquement (jamais de prod)
- `deploy.ps1 -frontend` = prod frontend
- `deploy.ps1 -backend -nobuild` = prod backend (build fait en local au préalable)
- **Jamais** lancer backend et frontend en parallèle sans validation staging
- **Jamais** proposer un deploy prod sans que l'utilisateur ait explicitement validé le staging

---

## Architecture

- **Frontend web** : `c:/Users/ADMIN/Desktop/TRACKING/` (ce repo — React + Vite, app desktop/admin)
- **Backend** : `c:/Users/ADMIN/Desktop/trackyu-backend/` (repo séparé — Node.js + TypeScript)
- **App mobile** : `c:/Users/ADMIN/Desktop/TRACKING/trackyu-mobile-expo/` (Expo + React Native, NativeWind v4, 3 thèmes white label dark/ocean/light — alignement cible : 2 modes dark/light + accent tenant, voir `docs/design-system/CHANTIER_REFONTE_DESIGN.md`)
- **Build backend** : `cd trackyu-backend && npm run build` → compile TS → dist/
- **Staging** : staging.trackyugps.com → même backend prod (port 3001), pas de backend staging séparé

## VPS Production

- **IP** : `148.230.126.62` (Hostinger)
- **Accès** : `ssh root@148.230.126.62`
- **Domaines** : trackyugps.com · staging.trackyugps.com · live.trackyugps.com
- **Containers Docker** :
  - `trackyu-gps-backend-1` — backend Node.js (port 3001)
  - `trackyu-gps-postgres-1` — PostgreSQL (TimescaleDB, base `fleet_db`, user `fleet_user`)
  - `trackyu-gps-redis-1` — Redis
  - `trackyu-gps-frontend-1` — nginx prod frontend
  - `trackyu-staging-frontend` — nginx staging frontend
- **Connexion DB** : `postgres://fleet_user:fleet_password@localhost:5432/fleet_db` (depuis le container postgres)
- **Backend dist** : `/var/www/trackyu-gps/backend/dist/` — **NE PAS PATCHER DIRECTEMENT** (voir règles backend)
- **Backups** : pg_dump quotidien 3h15, rétention 14 jours

## Sessions Codex parallèles

Trois sessions peuvent tourner en parallèle sur TrackYu :

- **Session frontend web** : ce repo `TRACKING/` (hors `trackyu-mobile-expo/`)
- **Session backend** : `c:/Users/ADMIN/Desktop/trackyu-backend/`
- **Session mobile** : `TRACKING/trackyu-mobile-expo/`

Ne pas toucher aux fichiers hors périmètre de la session courante sans prévenir l'utilisateur.

---

## Règles backend

- Toute modification backend → modifier `src/` dans `trackyu-backend/` → `npm run build` → `deploy.ps1 -backend -nobuild`
- **Jamais** patcher `dist/` directement sur le VPS (le fichier `DO_NOT_PATCH.txt` est présent dans dist/)
- **Jamais** lancer `npm run build` sur le VPS
- Hotfix urgent (sécu/P1 crash) : patch dist/ temporairement autorisé + backport src/ dans les 48h

---

## Charte graphique — OBLIGATOIRE

- Utiliser **exclusivement les tokens CSS** définis dans `src/index.css` — jamais de classes Tailwind `slate-*` directes
- Tokens principaux : `var(--bg-primary)`, `var(--bg-elevated)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--border)`, `var(--border-strong)`, `var(--primary)`
- Classes utilitaires disponibles : `.filter-chip`, `.icon-btn`, `.toolbar`, `.page-title`, `.page-subtitle`, `.section-title`, `.th-base`, `.td-base`, `.tr-hover`, `.pagination-btn`
- Exceptions intentionnelles à ne PAS modifier : `SensorsBlock.tsx` bg-slate-900, `MapView.tsx` border-slate-700/50, bulles chat SMS, previews PDF, logos bg-white, badges statut "Annulé/Inactif"
- Avant de toucher un fichier, auditer rapidement : `grep -n "slate-" fichier.tsx`
- Couleurs statut véhicule fixes : moving=`#22c55e`, idle=`#f97316`, stopped=`#ef4444`, offline=`#6b7280`

---

## Règles commits

Workflow systématique avant chaque commit :

1. `git add <fichiers-specifiques>` — **jamais** `git add -A` ou `git add .`
2. `git diff --cached --name-only` — vérifier que seuls les fichiers de la tâche sont stagés
3. `git reset HEAD -- <fichier>` pour dé-stager tout fichier non lié
4. `git commit` seulement après vérification

Ne jamais committer sans accord explicite de l'utilisateur.

---

## Règles métier

- **1 véhicule = 1 tracker = 1 abonnement = 1 contrat** — règle stricte, jamais déroger
- **Rôles** : SUPERADMIN / staff TKY = cross-tenant (visibilité globale) · ADMIN / MANAGER = isolé dans leur tenant · RESELLER / RESELLER_ADMIN = équivalent ADMIN tenant (traiter ensemble dans les checks d'autorisation)
- **tenant_default** (code TKY, "TrackYu System") = tenant interne TrackYu — le staff a visibilité cross-tenant par défaut
- Compte test superadmin : superadmin@trackyugps.com

## Domaines

- `live.trackyugps.com` = app définitive (destination finale des utilisateurs)
- `staging.trackyugps.com` = validation avant prod
- `trackyugps.com` = futur vitrine SaaS (pas encore migré)

## i18n

- Langue source : **français**
- Priorité traduction : FR → **EN** (prioritaire) → ES (3e, IA first pass acceptable)
- Alertes frontend dans la langue de l'utilisateur (settings) avec fallback langue tenant

## Audit / Diagnostic

- Pour tout audit ou diagnostic backend, **partir de la prod VPS** (`ssh root@148.230.126.62`) — jamais se baser uniquement sur les fichiers locaux sans vérifier l'état réel en prod
- Mobile = session parallèle indépendante, ne pas toucher depuis cette session

## Qualité

- Objectif : app puissante, stable, haute qualité — pas de shortcut fragile
- Préférer robuste à rapide — filet de sécurité obligatoire sur tout changement risqué
- Calculs (trajets, arrêts, stats, niveaux carburant) = source serveur uniquement, jamais recalculé côté client

## Règles générales

- Toujours répondre en **français**
- Toujours attendre un accord explicite avant toute modification de code
- Numéroter les questions quand il y en a plusieurs dans un même message
- Ne jamais affirmer des chiffres ou faits non vérifiés — formuler générique ou dire "non vérifié"
- Listes admin : ne rien charger sans filtre/recherche posé (pattern `shouldLoadData + enabled`)
- **Jamais** d'upload manuel du dist/ — toujours passer par `deploy.ps1` (régression critique 2026-04-01)
