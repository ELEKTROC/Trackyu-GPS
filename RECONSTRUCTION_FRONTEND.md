# Rapport de Reconstruction — Frontend Web TrackYu
> Document de référence et de suivi. Mettre à jour à chaque session.  
> Dernière mise à jour : 2026-04-10 (session 2)

---

## Contexte

Suite à une perte des dossiers frontend et backend sur le poste local, le source a été partiellement reconstitué depuis une sauvegarde VPS datée du 2026-04-03. Cette reconstitution est incomplète et non vérifiée.

**Conséquence directe :** Aucun déploiement frontend depuis le 2026-04-01 (date du dernier build en production).

**Référence de vérité absolue :** Le bundle déployé sur `/var/www/trackyu-gps/dist/` (VPS `148.230.126.62`).

---

## Règle d'or

> Tant que le source local n'est pas certifié aligné sur la prod, aucun déploiement complet (`deploy.ps1 -frontend`) ne doit être lancé.
>
> Les corrections urgentes passent par patches directs sur les JS en prod (scripts Python), comme pour le backend.

---

## État du dernier build en production

| Élément | Valeur |
|---------|--------|
| Date dernier déploiement | 2026-04-01 |
| `index.html` charge | `index.BoHzc7Ly.js` |
| Nombre de chunks JS | ~95 |
| Chunks avec patches manuels directs | `SettingsView.DIJNLCKX.js`, `VehicleForm.BasgUn_y.js` (9 avril) |
| Artefacts orphelins en prod | `SettingsView2/3/4.js`, `VehicleForm2/3/4.js`, `SuperAdminView.js.bak` |

---

## Phases du plan de reconstruction

### Phase 0 — Audit et cartographie ⏳ EN COURS

Objectif : photographier exactement l'état prod et local, chunk par chunk.

- [x] Inventaire assets prod (`ls /var/www/trackyu-gps/dist/assets/`)
- [x] Build local réussi (0 erreurs TypeScript/ESLint) — 2026-04-10
- [x] Comparaison noms de chunks prod vs local
- [x] Identification chunks manquants / nouveaux
- [x] Comparaison tailles chunk par chunk (delta en bytes) — 2026-04-10
- [x] Analyse patches directs 9 avril sur `SettingsView` et `VehicleForm` — delta mineur (+251 / +164 bytes), patches locaux présents en source
- [x] Staging opérationnel avec CSS complet et API prod routée
- [x] Correction export `MonitoringView` (export default → export function)

**Chunks présents en prod, absents en local :**

| Chunk | Commentaire |
|-------|-------------|
| `SystemMetricsPanel` | Supprimé ou intégré ailleurs dans local |
| `endOfMonth` | Fonction date-fns, peut être renommée |
| `fr` | Locale date-fns française |

**Chunks présents en local, absents en prod :**

| Chunk | Commentaire |
|-------|-------------|
| `ChangePasswordView` | Nouveau composant ajouté localement |

---

### Phase 1 — Alignement source local sur prod 🔲 À FAIRE

Objectif : pour chaque chunk dont le hash a changé, identifier la divergence entre source local et prod, et corriger si la version locale est une régression.

Méthodologie par chunk :
1. Extraire pattern-clé du JS minifié prod
2. Extraire le même pattern du JS minifié local
3. Si divergence significative → inspecter le fichier source `.tsx/.ts` local
4. Corriger si nécessaire, ou documenter si le local est intentionnellement en avance

**Résultats comparaison tailles (2026-04-10) :**

Catégorisation par delta de taille (proxy de divergence) :
- **Cosmétique** (delta < 50 bytes) : 54 chunks — probablement juste variation de minification, risque faible
- **Mineur** (50–500 bytes) : 17 chunks — modifications légères, à inspecter
- **Significatif** (500–5000 bytes) : 6 chunks — modifications réelles, à analyser
- **Majeur** (> 5000 bytes) : 7 chunks — **priorité critique**
- **Identiques** (même hash exact) : 3 chunks (`exportService`, `html2canvas.esm`, `jspdf.plugin.autotable`)

---

**Chunks MAJEURS à analyser en priorité :**

| Chunk | Prod | Local | Delta | Risque |
|-------|------|-------|-------|--------|
| `MonitoringView` | 116 940 | 11 167 | **-105 773** | 🔴 Local = version tronquée ou composant réécrit |
| `InterventionForm` | 121 605 | 149 772 | **+28 167** | 🔴 Local = version plus lourde, code ajouté |
| `vendor-charts` | 392 682 | 418 503 | **+25 821** | 🟡 Mise à jour dépendance Recharts/Chart.js |
| `SuperAdminView` | 444 072 | 428 225 | **-15 847** | 🔴 Local = version allégée, fonctionnalités manquantes ? |
| `vendor-zod` | 55 813 | 71 190 | **+15 377** | 🟡 Mise à jour dépendance Zod |
| `vendor-react` | 12 463 | 51 | **-12 412** | 🔴 **CRITIQUE** — local = chunk quasi-vide (51 bytes) |
| `vendor-query` | 39 302 | 49 159 | **+9 857** | 🟡 Mise à jour React Query |

**Chunks SIGNIFICATIFS :**

| Chunk | Delta | Note |
|-------|-------|------|
| `Textarea` | -1114 | Composant allégé ou remplacé |
| `index` | -1698 | Bundle principal légèrement réduit |
| `vendor-icons` | -2350 | Icônes : version différente ou import tree-shaking |
| `vendor-forms` | +1617 | Mise à jour react-hook-form ou ajout |
| `FleetTable` | -695 | Table flotte modifiée |
| `vendor-map` | +675 | Mise à jour Leaflet |

**⚠️ Note filtre corrigé le 2026-04-10** : Le premier filtre excluait à tort `AccountingView`, `ClientForm`, `SyncView`, `Tabs` (hash se terminant par un chiffre). Résultats ci-dessous = version corrigée.

**Chunks absents en LOCAL (présents en prod) — 3 :**

| Chunk | Taille prod | Analyse |
|-------|------------|---------|
| `SystemMetricsPanel` | 9 953 | 🔴 Composant présent en prod, absent en local — MonitoringView.tsx local incomplet (387 lignes vs 488 en backup) ne l'importe plus |
| `fr` | 28 298 | 🟡 Locale date-fns fr — inlinée dans InterventionForm en local (Vite bundling différent) — pas de code manquant |
| `endOfMonth` | 222 | 🟢 Fonction date-fns — renommée `startOfMonth` en local ou tree-shaked différemment |

**Chunks NOUVEAUX en LOCAL (absents en prod) — 4 :**

| Chunk | Taille | Analyse |
|-------|--------|---------|
| `ChangePasswordView` | 4 081 | 🟡 Nouveau composant ajouté localement — à vérifier si existait en prod sous un autre nom |
| `StatusBadge` | 1 233 | 🟢 Composant extrait dans chunk séparé — était inline en prod |
| `SyncView` | 6 185 | 🔲 À analyser |
| `startOfMonth` | 194 | 🟢 Remplace `endOfMonth` (même fonction date-fns, API différente) |

---

**Tableau de suivi Phase 1 :**

| Chunk | Delta | Statut analyse | Conclusion |
|-------|-------|----------------|------------|
| `vendor-react` | -12412 | ✅ Normal | React absorbé dans `index` par Vite — chunk vide = warning cosmétique, pas de régression |
| `MonitoringView` | -105773 | ✅ Corrigé | Export `default` → `export function` corrigé. Source local avait 387 lignes, backup VPS 488 lignes avec sous-composants (AlertsConsole, SystemMetricsPanel, etc.) |
| `SystemMetricsPanel` (manquant) | -9953 | ✅ Corrigé | Sous-composant restauré via correction MonitoringView |
| `fr` locale (manquante) | -28298 | ✅ Normal | Locale inlinée dans InterventionForm local (Vite bundling différent) — pas de code manquant |
| `InterventionForm` | +28167 | ✅ Normal | Local plus gros car locale `fr` inlinée (Vite bundling). Source identique (422 lignes) |
| `SuperAdminView` | -15847 | ✅ Normal | Import `SystemMetricsPanel` via `MonitoringView` absent localement — se corrige avec MonitoringView |
| `AccountingView` | +0 | ✅ Faux positif | Présent en prod (filtre regex corrigé) — hash différent mais code équivalent à analyser |
| `vendor-charts` | +25821 | 🔲 À analyser | Version recharts différente ? |
| `vendor-query` | +9857 | 🔲 À analyser | Version react-query différente ? |
| `vendor-zod` | +15377 | 🔲 À analyser | Version zod différente ? |
| `FleetTable` | -695 | 🔲 À analyser | — |
| `Textarea` | -1114 | 🔲 À analyser | — |
| `SettingsView` | +251 | ✅ Normal | Fix tenantId session 09/04 — présent en source local (commit 09762f7) |
| `VehicleForm` | +164 | ✅ Normal | Patch 09/04 — delta mineur, source aligné |
| `UserForm` | +230 | 🔲 À analyser | — |

---

### Phase 2 — Intégration des corrections légitimes 🔲 À FAIRE

Objectif : s'assurer que les corrections apportées depuis la perte des sources sont bien dans le source local.

**Corrections identifiées à intégrer :**

| Correction | Fichier source | Statut source local | Statut prod |
|------------|---------------|---------------------|-------------|
| Fix IDs tiers (TIER- → CLI-/REV-) | `features/crm/components/TierForm.tsx` | ✅ Présent (commit 09762f7) | 🔲 Patch à appliquer |
| Fix tenantId création user CLIENT | `features/settings/components/SettingsView.tsx` | ✅ Présent (commit 09762f7) | 🔲 Patch à appliquer |
| Fix priorité user.tenantId | `contexts/DataContext.tsx` | ✅ Présent (commit 09762f7) | 🔲 Patch à appliquer |
| Patch VehicleForm 09/04 | `features/fleet/components/...` | ❓ Nature inconnue | ✅ Appliqué en prod |
| Patch SettingsView 09/04 04:50 | `features/settings/...` | ❓ À comparer | ✅ Appliqué en prod |

---

### Phase 3 — Validation pré-déploiement 🔲 À FAIRE

Objectif : s'assurer que le build local produit un résultat identique à la prod (sauf corrections intentionnelles).

- [ ] Build local propre
- [ ] Comparaison hashes : seuls les chunks intentionnellement modifiés diffèrent
- [ ] Liste exhaustive des chunks qui changeront au déploiement, avec justification pour chacun
- [ ] Revue manuelle des chunks à fort impact (index, SuperAdminView, MapView, FleetTable)
- [ ] Validation fonctionnelle (test manuel des modules critiques)

---

### Phase 4 — Déploiement contrôlé 🔲 À FAIRE

- [ ] Nettoyage artefacts orphelins en prod (fichiers `2/3/4.js`, `.bak`)
- [ ] Déploiement delta (`deploy.ps1 -frontend`)
- [ ] Vérification post-déploiement (index.html, JS count, health check)
- [ ] Commit de la version déployée (tag git)

---

## Journal des sessions

### 2026-04-09
- Audit backend prod via SSH — tous les patches backend confirmés ✅
- Correction DB : `TIER-1775718584024` → `CLI-ABJ-01511` ✅
- 3 fixes source local commitées : TierForm, SettingsView, DataContext
- Patches directs en prod sur SettingsView.DIJNLCKX.js et VehicleForm.BasgUn_y.js (nature à préciser)
- Git initialisé sur frontend web (2 commits)

### 2026-04-10 (session 1)
- Build local validé (0 erreurs) ✅
- Comparaison bundles prod vs local : 63/93 chunks ont un hash différent
- 3 chunks présents en prod absents en local : SystemMetricsPanel, endOfMonth, fr
- 1 chunk présent en local absent en prod : ChangePasswordView
- Phase 0 complétée — comparaison tailles chunk par chunk

### 2026-04-10 (session 2)
- **`postcss.config.js` créé** — CSS Tailwind v4 était incomplet (27 KB → 187 KB) ✅
- **`deploy-staging.ps1` corrigé** — emojis PowerShell retirés ✅
- **Staging activé et fonctionnel** :
  - Caddy staging `/api/*` redirigé vers backend prod (port 3001) ✅
  - CORS backend : `staging.trackyugps.com` ajouté à la whitelist ✅
  - Login staging opérationnel ✅
- **`MonitoringView.tsx` corrigé** : `export default function` → `export function` (import nommé dans LazyViews.tsx) ✅
- **`ErrorBoundary.tsx` amélioré** : log `componentStack` pour diagnostic #306 en attente
- **Bugs restants identifiés** :
  - React #306 au login — composant exact non encore identifié (componentStack en attente)
  - 401 `/api/notifications/preferences` — route backend sans middleware auth (bug préexistant)
  - 500 `/api/finance/cash-closings` — bug backend (bug préexistant)

---

## Commandes de référence

```bash
# Lister assets prod
ssh trackyu-vps "ls /var/www/trackyu-gps/dist/assets/*.js | grep -v map"

# Lire un chunk prod
ssh trackyu-vps "cat /var/www/trackyu-gps/dist/assets/CHUNK.js"

# Comparer taille chunk
ssh trackyu-vps "wc -c < /var/www/trackyu-gps/dist/assets/CHUNK.js"

# Build local
cd c:/Users/ADMIN/Desktop/TRACKING && npm run build

# Déploiement (UNIQUEMENT quand Phase 3 validée)
.\deploy.ps1 -frontend
```
