# POLISH PLAYBOOK — Revue finale V2 module par module

> Document de référence pour la phase de polish de l'application TrackYu V2.
> Lire avant chaque session de revue.
> Mis à jour : 2026-05-03

---

## 1. OBJECTIF

Amener chaque module V2 à **parité fonctionnelle avec le legacy** sur les cas d'usage quotidiens, tout en **conservant le design V2** (tokens CSS, font-display/mono, composants primitifs).

Critères de validation d'un module :

1. Les données sont réelles (pas de mocks, pas de `notImplemented()` sur les actions critiques)
2. Les KPIs et tableaux affichent les vraies valeurs backend
3. Les actions CRUD principales fonctionnent (créer, modifier, supprimer si applicable)
4. Le module est cohérent avec le reste de l'app (terminologie, couleurs statut, carburant)
5. Aucun crash runtime visible en navigation normale

---

## 2. MODE OPÉRATOIRE — revue d'un module

### Étape 1 — Bootstrap (avant de toucher le code)

```
1. Lire CLAUDE.md → STATE.md → CHANGELOG.md
2. Lire le fichier spec du module si existant : docs/design-system/modules/<MODULE>.md
3. Lire le composant V2 principal : trackyu-front-V2/src/features/<module>/
4. Lire le composant legacy équivalent : TRACKING/features/<module>/
5. Identifier les écarts (données mockées, actions manquantes, colonnes absentes)
```

### Étape 2 — Audit

Passer en revue :

- **Données** : est-ce que les tableaux/KPIs chargent depuis l'API ou depuis des mocks ?
- **Actions** : quels boutons appelent `notImplemented()` ou ne font rien ?
- **Colonnes** : quelles colonnes sont présentes vs legacy ?
- **Terminologie** : "Plein" → "Recharge", "Vol" → "Baisse anormale", etc.
- **Cohérence design** : tokens CSS respectés, pas de `60` codé en dur, pas de couleurs hardcodées hors charte

### Étape 3 — Vérification backend

Avant de coder, toujours vérifier :

```bash
# Endpoints disponibles
grep -rn "router\.\(get\|post\|put\|delete\)" trackyu-backend/src/routes/<moduleRoutes>.ts
# Schéma DB si pertinent
ssh root@148.230.126.62 "docker exec trackyu-gps-postgres-1 psql -U fleet_user -d fleet_db -c '\d <table>'"
```

### Étape 4 — Implémentation

- Lot par lot, build vert entre chaque lot
- TS check avant chaque deploy : `npx tsc --noEmit`
- Deploy staging : `deploy-v2.ps1 -nobuild`
- Valider en prod : HTTP 200 + bundle servi

### Étape 5 — Clôture module

- Mettre à jour `STATE.md` + `CHANGELOG.md`
- Si spec module : mettre à jour `docs/design-system/modules/<MODULE>.md`
- Déclarer le module "bouclé" avec les limites connues documentées

---

## 3. ERREURS À NE PAS FAIRE

| ❌ Ne pas faire                                             | ✅ Faire à la place                                    |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| Modifier les données directement en prod DB                 | Passer par l'API ou le backend src                     |
| Déployer sans `npx tsc --noEmit` vert                       | Toujours vérifier le TS avant build                    |
| Utiliser `deploy.ps1 -backend` sans `-force`                | Toujours `-force` pour le backend (incident 502)       |
| Coder en supposant le schéma d'une table                    | Vérifier la DB prod ou le backend src                  |
| Afficher des données mockées sans le signaler               | Mettre un commentaire `// TODO: connecter API` visible |
| Inventer des valeurs de KPIs                                | Afficher `—` si la donnée n'est pas disponible         |
| Changer "Recharge" en "Plein" ou "Baisse anormale" en "Vol" | Terminologie fixée, ne pas réintroduire                |
| Introduire des classes Tailwind `slate-*`                   | Utiliser uniquement les tokens CSS `var(--xxx)`        |
| Hardcoder une capacité réservoir (ex: `* 60`)               | Utiliser `tankCapacity` avec fallback conditionnel     |
| `git add -A` ou `git add .`                                 | Stager fichier par fichier                             |
| Committer sans accord explicite                             | Attendre le go utilisateur                             |

---

## 4. RESSOURCES

| Ressource                                  | Utilité                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `docs/design-system/DLS.md`                | Tokens CSS, composants primitifs V2                |
| `docs/design-system/BLUEPRINT.md`          | Brief design de chaque écran                       |
| `docs/design-system/RBAC_MATRIX.md`        | Qui peut voir/faire quoi par rôle                  |
| `trackyu-front-V2/src/index.css`           | Tokens CSS en vigueur                              |
| `trackyu-front-V2/src/components/ui/`      | Primitifs (Button, Badge, Dialog, DataTable, etc.) |
| `.claude/skills/metier-trackyu.md`         | Règles métier (1=1=1=1, rôles, isolation tenant)   |
| `.claude/skills/frontend-design-system.md` | Design system frontend                             |
| `trackyu-backend/src/routes/`              | Endpoints disponibles par domaine                  |
| `ssh root@148.230.126.62` + psql           | Vérification DB prod                               |

---

## 5. LISTE DES MODULES — état au 2026-05-04

### ✅ Bouclés (parité fonctionnelle atteinte)

| Module                  | Route       | Notes                                                                                                     |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| **Fleet / VehicleList** | `/fleet`    | Session 15. 15 colonnes, 4 presets, 6 tabs drawer CRUD, Replay.                                           |
| **Vente**               | `/vente`    | Session 11. 7 onglets, Finance CRUD, Recouvrement, PDF.                                                   |
| **Rapports**            | `/reports`  | Session 12. 78/78 rapports portés.                                                                        |
| **Prévente/CRM**        | `/prevente` | Session 20. Leads D&D, Devis 4 onglets, Tâches CRUD, Catalogue, Automatisations, Inscriptions. 319 tests. |
| **Support**             | `/support`  | Session 18. 4 onglets complets.                                                                           |

### 🟡 En cours / Partiellement connectés

| Module         | Route         | État Session 20                                                                                              |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| **Tech**       | `/tech`       | 🟡 Blocs 1-4 livrés (kanban, filtres, historique, form 4 onglets). **Reste : Bloc 5 signatures, Bloc 6 PDF** |
| **Agenda**     | `/agenda`     | Navigation mois ✅ · Date/heure corrigés ✅ · Actions boutons non câblées                                    |
| **Carte**      | `/map`        | Live ✅ · Replay ✅ · Géofences ✅ · 3 chantiers ouverts (odomètre, replay trajet, modale ticket)            |
| **Dashboard**  | `/`           | KPIs live ✅ · Charts à auditer                                                                              |
| **Monitoring** | `/monitoring` | À auditer                                                                                                    |
| **Settings**   | `/settings`   | POI CRUD ✅ · Users CRUD ? · Alertes config ?                                                                |
| **Admin**      | `/admin`      | Corbeille ✅ · Revendeurs detail ?                                                                           |
| **Stock**      | `/stock`      | SAV/RMA ✅ · Boîtiers/SIM live ?                                                                             |
| **Compta**     | `/compta`     | À auditer                                                                                                    |

### ⬜ Non commencé (placeholders)

| Module          | Route      | Notes                             |
| --------------- | ---------- | --------------------------------- |
| **Site public** | `/landing` | Marketing — hors scope polish app |

---

## 6. CHECKLIST PAR MODULE

Pour chaque module en 🟡, passer en revue ces points :

```
□ Les listes chargent depuis l'API (pas de données mockées statiques)
□ La pagination est branchée (server-side ou client avec données réelles)
□ Les filtres fonctionnent
□ Les actions principales (créer/modifier/supprimer) sont connectées
□ Les KPIs affichent des vraies valeurs
□ Les graphiques / sparklines utilisent de vraies données
□ Les colonnes manquantes vs legacy sont identifiées et acceptées ou ajoutées
□ Le design est fidèle V2 (tokens, pas de hardcode couleurs/valeurs)
□ La terminologie est correcte (Recharge, Baisse anormale, etc.)
□ Les rôles RBAC sont respectés (SUPERADMIN vs ADMIN vs CLIENT)
□ Aucun `notImplemented()` sur une action critique métier
□ Build vert + deploy staging + valider prod
```

---

## 7. RÈGLES DE POLISH V2

### Données

- Si la donnée n'existe pas : afficher `—`, pas `0` ni `null` ni texte vide
- Si l'API n'est pas câblée : le dire clairement dans un commentaire `// TODO`
- Jamais de chiffres inventés dans des KPIs (même pour le "look")

### Design

- Jauge carburant : toujours `tank_capacity` réel + fallback 350L si capteur actif
- Couleurs statut fixes : moving `#22c55e` · idle `#f97316` · stopped `#ef4444` · offline `#6b7280`
- Header drawer Fleet : gradient selon statut (pas orange fixe)
- Terminologie carburant : **Recharge** (jamais Plein) · **Baisse anormale** (jamais Vol)

### Performance

- Pas de chargement sans filtre sur les listes admin (pattern `shouldLoadData + enabled`)
- React Query staleTime cohérent : live = 30s · statique = 5min+
- Lazy load sur toutes les routes (déjà en place)

---

## 8. ORDRE DE PRIORITÉ SUGGÉRÉ

1. ~~**Carte**~~ — Sessions 16-17 (3 chantiers mineurs ouverts — voir mémoire)
2. **Dashboard** — première page, KPIs = crédibilité ← PROCHAIN
3. **Support/Tickets** — opérationnel
4. **Settings** — configuration essentielle
5. **Admin** — gestion tenants/revendeurs
6. **Monitoring** — alertes pipeline
7. **Stock** — inventaire
8. **Tech/Interventions** — terrain
9. **Agenda** — planning
10. **Prévente** — CRM
11. **Compta** — finance avancée

---

_Document créé Session 15 — 2026-05-03. Mis à jour à chaque module bouclé._
