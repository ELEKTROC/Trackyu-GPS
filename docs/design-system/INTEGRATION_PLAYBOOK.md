# INTEGRATION PLAYBOOK — Design → Code

> Mode d'emploi reproductible pour intégrer un mockup claude.ai Design dans le repo TrackYu sans casser la logique existante.
> Référencé par [CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md) section 6.
>
> **Lecture obligatoire avant chaque intégration**, peu importe l'écran.
>
> Dernière mise à jour : 2026-04-26 (v1.0)

---

## 0. Vue d'ensemble en 60 secondes

```
[Design mockup HTML/JSX]    [DLS.md]               [Composant cible repo]
      │                        │                        │
      └──── confronter ────────┴──── identifier ────────┘
                       │
                       ▼
                 ÉCART VS DLS ?
                       │
              ┌────────┴────────┐
              ▼                 ▼
          OUI : escalader    NON : intégrer
                              │
                              ▼
                    Adapter classes / structure
                    (préserver props, hooks, i18n, guards)
                              │
                              ▼
                     Test local → Staging
                              │
                              ▼
                  Validation utilisateur
                              │
                              ▼
                            Prod
                              │
                              ▼
                  Update SCREEN_MAP.md + CHANGELOG.md
```

---

## 1. Pré-requis avant toute intégration

### 1.1 Vérifier que le mockup est aligné sur la palette TrackYu

**Refuser** d'intégrer un mockup qui :

- Utilise un brand orange autre que `#d96d4c` (voir [`DLS.md`](DLS.md) §2.1)
- Utilise une couleur idle autre que `#FBBF24` (voir [`DLS.md`](DLS.md) §10) — sauf si l'idle propagation Phase 4 n'est pas encore faite
- Introduit des tokens Design v1 obsolètes (`--orange #F97316`, `--ink #0A0A0B`, etc.)
- Utilise un statut véhicule en couleur générique (rouge = stopped uniquement, pas erreur fonctionnelle)

→ **Action** : retourner le mockup à l'utilisateur avec les écarts listés. **Ne pas absorber en silence.**

### 1.2 Vérifier que la décision charter D1-D4 est respectée

| Décision                       | Vérification                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| D1 — Brand `#d96d4c`           | Aucun `#F97316` ni `#FF5C00` dans le mockup                                                     |
| D2 — Charter umbrella en place | DLS.md à jour, références correctes                                                             |
| D3 — `New/` suspendu           | Ne pas piocher dans le dossier `New/` pour cette intégration                                    |
| D4 — 2 modes (clair/sombre)    | Le mockup peut être présenté en sombre OU en clair, mais le code doit fonctionner dans les deux |

### 1.3 Lire SCREEN_MAP.md

Vérifier :

- Le statut actuel de l'écran (audit fait ? mockup attendu ? déjà intégré ?)
- La difficulté estimée
- Les dépendances métier critiques (auth, data, ws, i18n, react-query, leaflet, etc.)
- Les patterns DLS qu'il devrait consommer

### 1.4 Lire RBAC_MATRIX.md pour les guards rôles

Avant de poser un seul `hasPermission()` ou un guard de visibilité, consulter [`RBAC_MATRIX.md`](RBAC_MATRIX.md) :

- §2 — qui voit cet écran (CLIENT / TECH / ADMIN / etc.)
- §3 — quelles permissions par rôle (`VIEW_FINANCE`, `MANAGE_INVOICES`, etc.)
- §5 — règles d'isolation tenant (CLIENT voit sa flotte, SUPERADMIN cross-tenant)
- §6 — champs sensibles (à masquer pour rôles non autorisés)
- §9 — exemple de wrapping `{hasPermission(...) && <Component />}`

Évite de rouvrir 922 lignes de `permissionStructure.ts` à chaque intégration.

---

## 2. Réception du mockup

L'utilisateur transmet le code Design (HTML / CSS / JSX). Trois cas :

| Cas                                                           | Action                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Code complet d'un écran** (HTML + style inline ou Tailwind) | Lire intégralement, identifier les sections, cataloguer les composants utilisés             |
| **JSX React** (déjà partiellement structuré)                  | Plus facile à intégrer, mais vérifier que les composants Design n'écrasent pas ceux du repo |
| **Capture + description** (pas de code)                       | Demander le code à Design avant de continuer (ne pas reconstruire à la main)                |

---

## 3. Confrontation au DLS

### 3.1 Tokens couleur

| Dans le mockup                     | Mapping DLS                                                |
| ---------------------------------- | ---------------------------------------------------------- |
| `var(--orange)` ou `#F97316`       | → Refuser, demander regénération avec `#d96d4c`            |
| `var(--ink)` `var(--paper)`        | → Mapping vers `var(--bg-app)` selon mode                  |
| `bg-slate-900` `bg-slate-800` etc. | → `bg-bg-card` ou `bg-bg-elevated`                         |
| `text-white` `text-slate-100`      | → `text-text-main` ou `text-text-primary`                  |
| `text-slate-400` `text-gray-400`   | → `text-text-muted`                                        |
| `border-slate-700`                 | → `border-border-ui` (couche 1) ou `border-border` (alias) |
| Hex direct (`#d96d4c`, `#0d0d0f`)  | → Tokens canoniques (couche 1) ou sémantiques (couche 2)   |

### 3.2 Patterns visuels

Pour chaque section du mockup, demander : **est-ce un pattern DLS connu ?**

| Pattern observé               | Si oui (existe en DLS)                              | Si non (nouveau pattern)                |
| ----------------------------- | --------------------------------------------------- | --------------------------------------- |
| Bouton CTA orange             | Réutiliser `.btn .btn-primary .btn-md`              | (ne devrait jamais arriver)             |
| Carte avec border + radius    | Réutiliser `.card` ou `.card-elevated`              | Vérifier si extension nécessaire au DLS |
| Filter chip                   | `.filter-chip` / `.filter-chip.active`              | —                                       |
| Badge statut véhicule         | `.badge-moving` / `-idle` / `-stopped` / `-offline` | —                                       |
| Toolbar (search + filtres)    | `.toolbar` + `.toolbar-section`                     | —                                       |
| Titre de page                 | `.page-title` + `.page-subtitle`                    | —                                       |
| Section uppercase             | `.section-title`                                    | —                                       |
| Table                         | `.th-base` / `.td-base` / `.tr-hover`               | —                                       |
| Skeleton                      | `.skeleton`                                         | —                                       |
| KPI card avec sparkline       | (nouveau pattern, à figer dans DLS)                 | Documenter dans DLS.md                  |
| Radial gauge                  | (nouveau pattern, mockup dashboard v1)              | À ajouter au DLS                        |
| Hero auth split visual + form | (nouveau pattern auth)                              | À ajouter au DLS                        |

### 3.3 Typographie

- **Inter** : déjà chargée — OK
- **Archivo Black** (titres display) : ⚠ à charger — vérifier `index.html` et CSP. Ajouter preload si pas encore fait.
- **JetBrains Mono** (mono-labels, valeurs numériques techniques) : ⚠ à charger — idem.
- Tailles atypiques (`text-[9px]`, `text-[10px]`) : OK selon DLS §5.2-5.3.

### 3.4bis — Le code Design est MUTABLE (D19)

**Principe acté D19 (2026-04-26)** : le code produit par claude.ai Design n'est **pas un livrable figé**. C'est le **starting point V2** — on l'adapte au moment de l'intégration code pour matcher backend / RBAC / i18n / data structure réels.

#### Distinction des divergences

| Type de divergence                                                                                                 | Action                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Mineure** : libellé, label, terminologie, ordre, tinte couleur                                                   | On **édite directement le code Design** au moment de l'intégration. Pas de régénération nécessaire.                            |
| **Impactante** : nouveau champ data, nouveau stage enum, nouveau type backend, structure architecturale différente | On **évalue avec l'utilisateur** : (a) évolution backend à faire / (b) on adapte le code Design pour matcher le backend actuel |

#### Exemples concrets

| Divergence                                                      | Mineure ou Impactante ?      | Action                                                      |
| --------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| Design utilise "Pistes" au lieu de "Leads" dans un titre        | Mineure                      | Éditer le code au moment de l'intégration                   |
| Design ajoute une colonne "Score IA" non présente backend       | Impactante (data + endpoint) | Décider avec user : ajouter au backend OU retirer du Design |
| Design propose une 6e colonne Kanban "Négociation"              | Impactante (enum stage)      | Décider : évoluer enum ou édition code Design               |
| Design utilise un orange légèrement différent de `#d96d4c`      | Mineure (charte)             | Éditer pour aligner sur DLS                                 |
| Design propose un layout drawer pleine largeur au lieu de 480px | Mineure (LIBERTÉ)            | Garder si convaincant, sinon adapter                        |

#### Conséquences sur le rythme

- Plus besoin d'aller-retours Design pour les divergences mineures (gain × beaucoup)
- L'intégration code devient la phase d'**adaptation finale** (terminologie + RBAC + i18n + hooks)
- Les MUSTS du BLUEPRINT restent stricts pour **palette / typo / identité TrackYu** (non négociables)
- Les MUSTS data (champs, colonnes, enums) deviennent **indicatifs** — adaptation possible

### 3.4 Si écart vs DLS détecté — distinguer 2 cas

#### Cas A : écart sur un MUST (palette, polices, statut véhicule, labels FR, identité)

```
1. STOP. Ne pas intégrer.
2. Lister les écarts précisément (numéro, type, valeur trouvée vs valeur DLS).
3. Remonter à l'utilisateur.
4. L'utilisateur tranche :
   (a) Adapter le mockup au DLS (claude.ai Design regénère)
   (b) Cas justifié exception (documenter dans DLS.md §12.3)
5. Après arbitrage, reprendre l'intégration.
```

#### Cas B : écart sur une LIBERTÉ ou un NUDGE — Design a proposé mieux

Si Design a proposé un **pattern nouveau** ou une **variation** qui n'existe pas dans le DLS mais qui est convaincant (ex: nouvelle KPI card avec sparkline plus malin, drawer pleine-largeur sur tablette, viz inattendue mais lisible) :

```
1. NE PAS rejeter par principe. Évaluer.
2. Critères d'évaluation :
   - Cohérent avec l'identité TrackYu (palette, polices, statuts) ?
   - Pas de régression d'accessibilité (contraste, focus, touch targets) ?
   - Maintenable (Tailwind v4 natif possible, pas de CSS custom exotique) ?
   - Crée de la valeur visuelle ou UX ?
3. Si oui aux 4 critères :
   (a) Intégrer le pattern dans cet écran
   (b) Proposer son ajout au DLS (DLS.md + CHANGELOG.md)
   (c) Disponible pour les écrans suivants
4. Si non : remonter à l'utilisateur pour arbitrage.
```

→ Le DLS **vit** : chaque écran intégré peut enrichir le langage. La règle "pas de pattern hors DLS" se transforme en "tout pattern intégré doit être dans le DLS au moment du commit final".

Cf. [BLUEPRINT.md §0bis](BLUEPRINT.md) — convention musts / libertés / nudges (D10).

---

## 4. Localiser le composant cible

### 4.1 Trouver le fichier

- Consulter `SCREEN_MAP.md` colonne "Composant principal"
- Vérifier l'existence du fichier
- Lire intégralement avant de toucher (props, hooks, état, effets)

### 4.2 Identifier la logique métier à préserver

Lister explicitement avant de modifier :

| Catégorie          | Quoi préserver                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Props**          | Signature exacte, valeurs par défaut, types                                                                                 |
| **Hooks**          | `useAuth`, `useDataContext`, `useTheme`, `useAppearance`, `useTranslation`, `useQuery`, `useMutation`, hooks custom         |
| **État local**     | `useState`, `useReducer`                                                                                                    |
| **Effets**         | `useEffect` — ne pas casser les dépendances                                                                                 |
| **Callbacks**      | `onClick`, `onSelect`, `onChange`, etc. — passer les bons params                                                            |
| **i18n**           | Toutes les `t('key')` doivent rester. Si le mockup a du texte en dur, le remplacer par `t('...')` (créer la clé si absente) |
| **Guards rôles**   | `hasPermission('...')`, conditions sur `user.role`                                                                          |
| **WS**             | `socket.on(...)` listeners                                                                                                  |
| **Refs**           | `useRef` pour DOM ou valeurs stables                                                                                        |
| **Memoization**    | `useMemo`, `useCallback` — ne pas casser                                                                                    |
| **Lazy**           | `React.lazy(...)` `Suspense` — préserver si présent                                                                         |
| **Virtualization** | `react-window` configurations                                                                                               |

### 4.3 Backup mental (ou physique) avant modif

Pour les composants critiques (Dashboard, FleetTable, MapView, etc.), faire un commit **avant** intégration sur une branche dédiée, ou au minimum noter le hash courant. Si l'intégration tourne mal, revert simple.

---

## 5. Appliquer le styling Design

### 5.1 Workflow d'adaptation

```
Composant existant (logique OK, styling à remplacer)
    │
    ▼
Lire le markup Design correspondant
    │
    ▼
Pour chaque élément JSX :
  1. Identifier le rôle (carte / bouton / titre / etc.)
  2. Si pattern DLS connu → utiliser la classe utilitaire
  3. Sinon → adapter classes Tailwind v4 natives (`bg-bg-primary`)
  4. Préserver les props/handlers/i18n existants
  5. Pas de var(--orange), pas de hex, pas de slate-*
    │
    ▼
Vérifier visuellement en local
```

### 5.2 Règles de mapping

#### Mapping `var(--*)` Design → tokens TrackYu

```
var(--orange)        → var(--brand-primary) ou class text-primary
var(--orange-light)  → var(--brand-primary-light)
var(--orange-600)    → (utiliser brand-primary-strong si défini, sinon couleur sombre custom)
var(--orange-50)     → fond clair tinté : utiliser var(--brand-primary-dim)
var(--ink)           → var(--bg-app) (mode dark)
var(--ink-2)         → var(--bg-card)
var(--ink-3)         → var(--bg-elevated)
var(--paper)         → var(--bg-app) (mode light)
var(--paper-2)       → var(--bg-elevated)
var(--line)          → var(--border-ui)
var(--text)          → var(--text-main)
var(--muted)         → var(--text-muted) ou var(--text-secondary)
var(--green)         → var(--status-moving) si statut véhicule, sinon var(--clr-success)
```

#### Mapping classes Tailwind brutes → tokens

```
bg-white                 → bg-bg-card (sauf exceptions documentées)
bg-slate-{50,100}        → bg-bg-elevated
bg-slate-{700,800,900}   → bg-bg-card ou bg-bg-elevated selon contexte
bg-slate-950             → bg-bg-app
text-white               → text-text-main
text-slate-100           → text-text-main
text-slate-400           → text-text-muted
text-slate-500           → text-text-secondary
text-slate-700           → text-text-primary
border-slate-{200,700}   → border-border-ui
```

#### Inline style `style={{ ... }}` → tokens

```jsx
// AVANT (mockup Design)
<div style={{ backgroundColor: '#16161a', color: '#f9fafb' }}>

// APRÈS (TrackYu)
<div className="bg-bg-card text-text-main">
```

### 5.3 Classes utilitaires en priorité

Si tu vois un bouton dans le mockup, ne pas écrire :

```jsx
<button className="px-4 py-3 bg-orange-500 text-white rounded-lg font-bold">Action</button>
```

Mais utiliser le composant React partagé :

```jsx
import { Button } from '@/components/Button';
<Button variant="primary" size="md">
  Action
</Button>;
```

Ou la classe utilitaire si Button.tsx ne couvre pas le cas :

```jsx
<button className="btn btn-primary btn-md">Action</button>
```

### 5.4 Préserver i18n

Si Design a du texte en dur :

```jsx
// AVANT (mockup Design)
<h1>Bonjour Sékou — vue d'ensemble.</h1>;

// APRÈS (TrackYu)
import { useTranslation } from '@/i18n';
const { t } = useTranslation();
<h1>{t('dashboard.welcome', { name: user.name })}</h1>;
```

→ Si la clé n'existe pas, créer dans `i18n/locales/fr.json` (FR source) puis traduire `en.json` et `es.json` (Q2 charter — IA first pass acceptable pour ES).

### 5.5 Préserver guards rôles

Si l'écran a une logique de permissions :

```jsx
{
  hasPermission('VIEW_FINANCE') && <FinanceSection />;
}
```

Ne **jamais** retirer ce guard parce que le mockup n'a pas la nuance. Le mockup montre un état idéal, pas la réalité par rôle.

---

## 6. Tests locaux

### 6.1 Lancer le dev server

```bash
npm run dev
```

### 6.2 Checklist visuelle

- [ ] Mode **clair** : passer le toggle Sun, balayer l'écran refondu, vérifier contraste, lisibilité, espacements
- [ ] Mode **sombre** : idem en Moon
- [ ] **3 langues** : changer la locale (settings ou flag URL), vérifier que tous les labels s'affichent (rien d'écrasé, pas de débordement)
- [ ] **Au moins 2 rôles** : ex. ADMIN + CLIENT, vérifier que les guards préservent l'affichage attendu

### 6.3 Checklist comportementale

- [ ] Tous les **clics** déclenchent les bons handlers (test manuel des CTA principaux)
- [ ] Les **inputs** acceptent la saisie, validation HTML5 / zod fonctionne
- [ ] Les **données** sont bien chargées (pas de "loading" infini, pas d'erreur 401/403/500)
- [ ] Les **WS temps réel** mettent à jour l'écran si applicable (positions, alertes)
- [ ] Les **animations** sont fluides (pas de jank), respect `prefers-reduced-motion`
- [ ] La **scroll** fonctionne sans saccade, virtualization OK si liste longue
- [ ] **Mobile** : tester avec devtools en viewport iPhone / Android (ou Capacitor)

### 6.4 Checklist régression

- [ ] Aucune **erreur console** TypeScript ou runtime
- [ ] `npm run lint` passe (ou warnings limités)
- [ ] `npm run format:check` passe
- [ ] Tests existants : `npm run test` (au moins ceux du module touché)

### 6.5 Checklist DLS

- [ ] Aucun `slate-*` / `gray-*` / `zinc-*` ajouté (sauf exceptions documentées)
- [ ] Aucun hex hardcodé ajouté
- [ ] Aucun `var(--orange)` ou `var(--ink)` ajouté
- [ ] Aucune classe `dark:` ajoutée (préférer tokens sémantiques)
- [ ] Toutes les couleurs viennent de tokens (couche 1 ou 2)
- [ ] Tous les statuts véhicule via `--status-*` ou `VEHICLE_STATUS_COLORS`
- [ ] Toutes les nuances sémantiques via `--clr-*`

---

## 7. Commit

### 7.1 Convention

Format suggéré (cohérent avec git log existant) :

```
{type}({scope}): {description courte}

{description longue facultative}

Référence : {écran SCREEN_MAP / charter / sous-chantier}
```

Types : `feat`, `fix`, `style`, `refactor`, `chore`, `docs`.
Scopes : `dashboard`, `fleet`, `map`, `auth`, etc. (par module).

Exemples :

```
style(dashboard): integrate Design v1 mockup (KPI + radial + charts)

- Adapt KPICard to new visual language (Design v1 dashboard mockup)
- Replace hardcoded chart colors with tokenized chart-colors lib
- Preserve role-based KPI rendering (CLIENT/TECH/COMMERCIAL/FINANCE/SUPPORT/ADMIN)

Cf. docs/design-system/SCREEN_MAP.md (vague 2 — Operations, écran 2.1)
Cf. docs/design-system/CHANTIER_REFONTE_DESIGN.md Phase 2 pilote
```

### 7.2 Discipline git (CLAUDE.md)

- `git add <fichiers-specifiques>` — **jamais** `git add .` ou `git add -A`
- `git diff --cached --name-only` avant commit
- Vérifier que seuls les fichiers liés à l'intégration sont stagés
- Pas de fichier `.env`, lock files inattendus, secrets

### 7.3 Mettre à jour les docs

À chaque commit d'intégration, mettre à jour :

- [`SCREEN_MAP.md`](SCREEN_MAP.md) : statut écran change vers 🧪 (en validation staging)
- [`CHANGELOG.md`](CHANGELOG.md) : entrée datée

---

## 8. Staging

```bash
.\deploy-staging.ps1
```

### 8.1 Vérification staging

- [ ] Ouvrir https://staging.trackyugps.com
- [ ] Login avec un compte de test (cf. `superadmin@trackyugps.com`)
- [ ] Naviguer vers l'écran refondu
- [ ] Refaire la **checklist § 6.2** (mode clair / mode sombre / 3 langues / 2 rôles)
- [ ] Vérifier les **données réelles** (pas de mock — staging consomme la prod backend)
- [ ] Vérifier les **temps de chargement** (pas de régression performance)
- [ ] Vérifier le **mobile** depuis un vrai device si possible

### 8.2 Validation utilisateur

L'utilisateur doit explicitement valider le staging avant prod.

→ **Ne jamais déployer prod sans accord explicite** (CLAUDE.md règle absolue).

---

## 9. Production

```bash
.\deploy.ps1 -frontend
```

### 9.1 Post-déploiement prod

- [ ] Ouvrir https://live.trackyugps.com
- [ ] Vérifier que l'écran refondu s'affiche (cache busting OK)
- [ ] Logs Sentry / monitoring : pas de spike d'erreurs
- [ ] Mettre à jour [`SCREEN_MAP.md`](SCREEN_MAP.md) : statut → ✅
- [ ] Mettre à jour [`CHANGELOG.md`](CHANGELOG.md) avec la mention prod

---

## 10. Cas particuliers

### 10.1 Composant utilisé par plusieurs écrans

Si tu refonds un composant partagé (`components/Modal.tsx`, `components/Button.tsx`, etc.), **balayer tous ses consommateurs** avant validation :

```bash
# Recherche des consommateurs (lecture seule)
grep -r "import { Modal }" features/ components/
```

→ Si l'intégration change la signature des props, mettre à jour TOUS les consommateurs dans le même commit ou marquer comme breaking change.

### 10.2 Composant lazy-loaded

Si l'écran est dans `LazyViews.tsx` :

- Vérifier que l'export par défaut existe et fonctionne
- Le `Suspense` parent doit toujours afficher un fallback acceptable (Skeleton, pas de blank screen)

### 10.3 Composant avec WS

Si l'écran consomme `socket.io-client` :

- Tester la **reconnexion** (couper réseau, reconnecter)
- Vérifier que les événements WS continuent à mettre à jour l'écran
- Pas de fuite mémoire (cleanup `socket.off(...)` dans `useEffect`)

### 10.4 Composant avec graphes Recharts

Recharts ne lit pas les CSS variables nativement.

**Solution prévue Phase 4** : `lib/chart-colors.ts` qui lit `getComputedStyle(document.documentElement).getPropertyValue('--brand-primary')` au runtime + écoute le changement de thème.

**En attendant** : tolérer les hex hardcodés dans les graphes Recharts (avec un commentaire `// TODO: tokenize when chart-colors.ts ready`).

### 10.5 Composant avec carte Leaflet

`MapView.tsx` est une **exception charte** documentée. Conserver `border-slate-700/50` autour des contrôles carte. Les markers et popups peuvent être tokenisés via inline style avec `var(--*)`.

### 10.6 Document preview (PDF / Email)

Exception charte : `bg-white` est intentionnel (preview imprimable). Ne pas tokeniser.

---

## 11. Que faire si...

### 11.1 ...le mockup propose un layout que TrackYu ne peut pas faire (route inexistante, donnée manquante)

→ Ne pas inventer la donnée. Soit :

- (a) Demander backend : créer endpoint manquant
- (b) Réduire le mockup à ce qui existe
- (c) Mocker temporairement (déconseillé sauf pour pilote)

### 11.2 ...je détecte un bug existant pendant l'intégration

→ **Ne pas le corriger dans le même commit**. Créer une issue / TODO séparée. La règle CLAUDE.md est claire : ne modifier que ce que la tâche exige.

### 11.3 ...le mockup utilise une nouvelle police non chargée

→ Ajouter le preload dans `index.html` + commit dédié `chore(fonts): add Archivo Black + JetBrains Mono`. **Pas dans le commit d'intégration écran.**

### 11.4 ...le mockup propose un nouveau composant atomique (pas dans DLS)

→ Documenter le pattern dans `DLS.md` section 7 + l'extraire en classe utilitaire dans `src/index.css` `@layer components` + entrée `CHANGELOG.md`. **Avant** de l'utiliser dans un écran.

### 11.5 ...j'ai un doute sur le rendu visuel

→ Comparer avec le mockup screenshot. Si écart subtil, demander à l'utilisateur. Ne pas absorber un écart "par défaut".

### 11.6 ...l'intégration casse un test existant

→ Lire le test, comprendre ce qu'il vérifie. Si le comportement métier est inchangé et le test casse à cause d'une classe CSS testée, mettre à jour le test. Si le comportement métier change, **STOP** et remonter.

### 11.7 ...staging ne match pas le mockup

→ Cache busting (`Ctrl+Shift+R`). Si toujours pas, vérifier le build (`vite build`), les CDN, le service worker PWA. Investiguer avant de modifier le code.

### 11.8 ...je dois revert après prod

→ `deploy.ps1 -frontend` redéploie un build. Pour revert : `git revert <commit>` puis nouveau `deploy.ps1 -frontend`. **Jamais** de modif directe sur le VPS dist/.

---

## 12. Ressources

| Document                                                                                     | Rôle                                     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [`CHANTIER_REFONTE_DESIGN.md`](CHANTIER_REFONTE_DESIGN.md)                                   | Charter umbrella, décisions stratégiques |
| [`AUDIT.md`](AUDIT.md)                                                                       | État du repo au démarrage du chantier    |
| [`DLS.md`](DLS.md)                                                                           | Référence tokens / composants / règles   |
| [`SCREEN_MAP.md`](SCREEN_MAP.md)                                                             | Inventaire écrans + état d'avancement    |
| [`CHANGELOG.md`](CHANGELOG.md)                                                               | Journal versionné                        |
| [`CLAUDE.md`](../../CLAUDE.md)                                                               | Règles permanentes du projet             |
| [`.claude/skills/frontend-design-system.md`](../../.claude/skills/frontend-design-system.md) | Skill design system                      |
| [`.claude/skills/deploy.md`](../../.claude/skills/deploy.md)                                 | Skill déploiement                        |

---

## 13. Checklist condensée (à coller en début de chaque PR d'intégration)

```
[ ] 1. Mockup reçu et palette TrackYu confirmée (#d96d4c, pas #F97316)
[ ] 2. Confronté à DLS.md, écarts escaladés s'il y en a
[ ] 3. Composant cible localisé, props/hooks/i18n/guards documentés
[ ] 4. Styling adapté avec tokens (couche 1 ou 2), pas de hex hardcodé
[ ] 5. Test local : 2 modes × 3 langues × 2 rôles
[ ] 6. Aucune classe slate-*, gray-*, zinc-* ajoutée
[ ] 7. Aucune classe dark: nouvellement introduite
[ ] 8. Aucune erreur console / TS / lint
[ ] 9. SCREEN_MAP.md mis à jour
[ ] 10. CHANGELOG.md complété
[ ] 11. Commit conventionné, fichiers spécifiques stagés
[ ] 12. Staging déployé, validé visuellement
[ ] 13. Validation utilisateur reçue
[ ] 14. Prod déployée
[ ] 15. SCREEN_MAP.md statut → ✅
```

---

_Mode d'emploi vivant. À enrichir au fur et à mesure que les intégrations révèlent de nouveaux cas._
