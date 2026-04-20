# Plan — Remise au carré `backend/src/`

**Référence audit** : [AUDIT_BACKEND_DETTE.md § D1](AUDIT_BACKEND_DETTE.md)
**Date** : 2026-04-19
**Statut** : 📝 Plan — exécution à cadrer avec l'équipe
**Criticité** : 🚨 Critique (blocage de toute autre dette code tant que non fait)

---

## Diagnostic (2026-04-19)

| Métrique                                                   | Valeur                                           |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `dist/` fichiers runtime (hors migrations/scripts/archive) | **241**                                          |
| `src/` fichiers TS                                         | **234**                                          |
| `dist/` dernière modif                                     | 2026-04-19 (patches Python quotidiens)           |
| `src/` dernière modif typique                              | **2026-01-19** (3 mois d'écart)                  |
| `dist/controllers/` modifié                                | 2026-04-06 (source sur VPS, peut différer local) |
| `tsc --noEmit` sur `src/`                                  | ❌ cassé (non vérifié ce sprint)                 |
| CI                                                         | ❌ aucune                                        |
| Règles ESLint                                              | ⚠️ incomplètes                                   |

**Conséquence concrète** :

- Chaque correctif = un script Python qui patche `dist/*.js` sur le VPS
- Aucune revue de code, aucun diff lisible en Git, aucun type-check
- Les patches divergent progressivement de `src/` → re-build TS écraserait les corrections
- Risque récurrent de bugs type "placeholder SQL perdu" ([S1 vehicleExtrasRoutes](AUDIT_BACKEND_SECURITE.md))

**Patches déjà appliqués depuis l'audit (hors src/)** :
S1, S2, S3, S4, S6, S7, S10, S11 (sécurité) · P1, P2, P5, P7, P8 (perf) · D2 (partiel), D4, D5, D8 (dette) · S5 P1 bcrypt · endpoint reveal-password. **~15 patches**.

---

## Principe directeur

**Ne pas tenter un big-bang**. Faire une remise au carré **progressive** avec dist/ et src/ en parallèle pendant une fenêtre bornée, puis bascule.

Les patches Python continuent tant que src/ n'est pas prêt. Chaque patch important est **aussi appliqué à src/** (coût marginal faible) pour éviter de creuser l'écart pendant la migration.

---

## Phases

### Phase 0 — Inventaire + freeze léger (2 j)

**Goal** : savoir exactement où on en est.

1. **Diff dist/ ↔ src/** :
   - Pour chaque fichier `dist/X.js`, retrouver `src/X.ts` correspondant.
   - Cas 1 : paire existante, dist récent → fichier à reconstruire ou à transpiler depuis src.
   - Cas 2 : dist sans src (128 fichiers selon audit) → fichier ajouté post-abandon, à ré-introduire dans src.
   - Cas 3 : src sans dist → fichier mort à supprimer.

   Script : `scripts/inventory_src_dist_drift.js` — produit un CSV `{file, has_src, has_dist, last_src_mod, last_dist_mod, size_diff}`.

2. **tsc dry run** : `cd backend && npx tsc --noEmit 2>&1 | tee /tmp/tsc_errors.log`. Compter les erreurs par type.

3. **Freeze direct-dist** pour les **changements non urgents** : nouvelles features → passent par src. Bugs critiques et sécurité → patch direct-dist OK, **mais aussi appliqué à src** dans la même PR.

**Livrable** : rapport `SRC_DIST_INVENTORY.md` avec décompte des 3 cas + top 20 fichiers modifiés depuis jan 2026.

---

### Phase 1 — Outillage (2 j)

1. **CI minimale GitHub Actions** :
   - `ci.yml` : `npm ci && npx tsc --noEmit` sur PR touchant `backend/`.
   - Objectif : que chaque PR soit type-checked avant merge, même si src/ casse encore à cet instant.
   - Garde rails désactivables par label `type-check-skip` tant que la Phase 2 n'est pas finie.

2. **ESLint config** :
   - `no-restricted-imports` : interdire `import { pool } from 'pg'` dans `src/routes/**`.
   - `@typescript-eslint/no-explicit-any` en warn (préparation pour strict plus tard).
   - `no-console` en warn (cf. S8 : prépare le passage à `logger`).

3. **Watch script** :
   - `npm run build:watch` qui recompile TS → dist/ à la volée pendant dev.
   - Permet aux patches Python d'être testés localement avant SSH.

**Livrable** : `.github/workflows/ci.yml`, `.eslintrc.json` backend dédié, scripts package.json à jour.

---

### Phase 2 — Réconciliation src/ ↔ dist/ (5 j)

**Goal** : `npx tsc` passe sans erreur, `dist/` produit == `dist/` actuel en prod (iso-comportement).

Ordre suggéré (du moins risqué au plus risqué) :

1. **Utils purs** (`utils/`, `config/`) — 1 j.
   Pas de logique métier, dépendances faibles. `utils/bcryptConfig.js` (créé S5 Phase 1) = à créer en `src/utils/bcryptConfig.ts`.

2. **Repositories** (`repositories/`) — 1 j.
   SQL + mapping. `userRepository.js` a reçu les patches S11 → re-synchroniser sur src.

3. **Middleware + services** — 1 j.
   `rateLimiter.js` (S10 + S11 ajouts), `auditMiddleware.js`, `AuditService.js`.

4. **Controllers** (plus gros) — 2 j.
   `authController.js` (S3, S4, S5, S11), `userController.js` (S4, S11), `tierController.js` (S5), `ApiKeyController.js` (S5).

   Approche : pour chaque controller, ouvrir `dist/X.js` et `src/X.ts` côte-à-côte, porter les modifs depuis jan 2026 en TypeScript (avec types corrects).

5. **Routes** — 0.5 j (simple, mostly plumbing).

6. **Lancer `npx tsc --noEmit`** : boucler sur les erreurs résiduelles.

**Stratégie PR** : 1 PR par dossier top-level (`utils/`, `repositories/`, `middleware/`, etc.). Chaque PR :

- diff src/ visible
- `tsc` passe
- `node --check dist/X.js` identique à prod (ou diff documenté)

**Livrable** : `src/` à jour, `tsc --noEmit` vert en CI.

---

### Phase 3 — Bascule build → deploy (2 j)

1. **Build local + comparaison** : `npm run build`, diff `dist-new/` ↔ `dist-prod/`.
   Tolérer : espaces/ordre d'import. Ne pas tolérer : logique différente.

2. **Déploiement staging** (backend mis en place dédié si nécessaire) → smoke test 24 h.

3. **Bascule prod** : `rm -rf dist && npm run build && scp dist → VPS → docker restart`.
   Rollback prêt (backup full dist).

4. **Verrou direct-dist** : ajouter README dans `/var/www/trackyu-gps/backend/dist/` qui dit "⛔ ne pas patcher direct. Modifier src → build → deploy".

**Livrable** : prod tourne sur `dist/` issu d'un build CI reproductible.

---

### Phase 4 — Gouvernance (continu)

- **1 PR = 1 modification src** obligatoire (sauf hotfix)
- Hotfix direct-dist autorisé pour sécu/P1 uniquement, avec PR `backport-src` ouverte dans les 48 h
- `deploy.ps1` (ou équivalent CI/CD) : recompile src → upload dist, jamais de scp dist patché
- Cycle MAJ dépendances trimestriel (cf. D3)

---

## Estimation

| Phase                 | Jours     | Résultat                       |
| --------------------- | --------- | ------------------------------ |
| 0 Inventaire + freeze | 2         | Rapport de drift               |
| 1 Outillage           | 2         | CI + ESLint                    |
| 2 Réconciliation      | 5         | `tsc` vert, src iso-prod       |
| 3 Bascule             | 2         | Prod sur build, rollback ready |
| **Total**             | **~11 j** | **Dette tech éliminée**        |

---

## Risques

| Risque                                            | Mitigation                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Nouvelle urgence prod pendant migration           | Garder direct-dist ouvert pour sécu ; bloquer seulement les features     |
| Divergence src ↔ dist pendant Phase 2             | Backporter tout patch > 5 lignes vers src au fur et à mesure             |
| tsc casse sur dépendances majeures en retard (D3) | Freezer les MAJ majeures jusqu'après Phase 3                             |
| Régression au build-deploy                        | Backup dist complet + smoke test scripté (GPS ingest, login, /api/users) |

---

## Interdépendances avec autres items d'audit

| Item                       | Relation                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------- |
| **D2** bcrypt 6            | Doit être testé **après** Phase 3 (risque upgrade bcrypt + migration en parallèle) |
| **D3** MAJ majeures        | À cadencer après Phase 4                                                           |
| **A1** pattern repository  | Profitable à traiter pendant Phase 2 (refactor tant qu'on touche les controllers)  |
| **A5** splitter monolithes | Idem A1, opportuniste en Phase 2                                                   |
| **S8** console.log         | Nettoyage pendant Phase 2 (ESLint warn déjà activé Phase 1)                        |

---

## Prochaine étape immédiate

**Phase 0 à démarrer** : écrire `scripts/inventory_src_dist_drift.js` et produire le rapport CSV. Estime 2 h de travail.

Attendre validation utilisateur avant de lancer.
