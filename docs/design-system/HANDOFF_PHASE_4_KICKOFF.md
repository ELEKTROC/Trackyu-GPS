# HANDOFF — Phase 4 Kickoff (intégration code V2)

> 📌 **Document de passation entre sessions Claude Code**
> Créé : 2026-04-27 PM (fin session "Design Phase 2 ✅ + handoff reçu")
> Pour : prochaine session Claude qui démarre Phase 4
> Statut : à supprimer une fois Phase 4 bien lancée et `INTEGRATION_PLAYBOOK_V2.md` calibré

---

## 🎯 Pourquoi ce document

La conversation précédente a couvert beaucoup de terrain (mockups, classification forms, handoff Design, structure V2). Pour éviter perte de contexte au reboot, ce doc résume **où on en est exactement** et **quoi faire en premier**.

**À lire en complément** :

1. `CLAUDE.md` (auto-loaded) — règles permanentes
2. `STATE.md` — état temps réel
3. `CHANGELOG.md` entry **2026-04-27 PM** — détail factuel de la session précédente
4. **Ce fichier** — instructions actionnables pour Phase 4 kickoff

---

## ✅ Ce qui est ACQUIS (ne pas refaire)

- Bootstrap V2 OK : `trackyu-front-V2` créé (Vite + React 19 + TS + Tailwind 4 + React Router 7), build OK, copie sélective DLS/types/i18n/services/contexts faite, providers minimal en place (commit `91c86d8` côté V2 — **pas dans le repo TRACKING**, V2 a son propre git)
- Phase 0bis (suppression ocean) déployée prod 2026-04-27
- 15 modules + Site public (8 pages) + 5 produits + Templates UI (A-H) **tous mockés** côté Design
- Handoff Design reçu : 3 docs `.md` dans `trackyu-front-V2/_design-source/_handoff/` + 102 fichiers extraits dans `_raw/`
- Structure `_design-source/` créée avec README + convention read-only

## 🟢 Ce qui est PRÊT (peut démarrer)

- Phase 4 build module par module : **D24 satisfait** (tous les mockups produits)
- Tous les inputs nécessaires : tokens Design, file-tree annoté, guide d'intégration Design

## ⏳ Ce qui RESTE à décider/faire en début prochaine session

### 1. DÉCISION CRITIQUE — Pilote Phase 4

| Option | Description                            | Pour                                                        | Contre                                                   |
| ------ | -------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| **A**  | Pilote **Fleet** (D23 actuel)          | Module métier réel, validation utilisateur visible          | Re-développe primitives qui auraient pu être mutualisées |
| **B**  | Pilote **Templates UI A-H d'abord** ⭐ | Construit primitives une fois, accélère 14 modules suivants | 1-2 jours "tooling" avant écran métier visible           |

→ **Question à poser à l'utilisateur en première chose** : "On garde D23 (pilote Fleet) ou on bascule sur Templates UI d'abord (option B) ?"

### 2. Production des 3 livrables transverses (avant le pilote)

#### a) `docs/design-system/MAPPING_DLS.md` (~30 min)

Table de correspondance détaillée :

- Pour chaque token Design (cf `DESIGN-TOKENS.md`), donner le mapping exact vers notre DLS V2 (`var(--xxx)` ou nouvelle var à créer)
- Lister explicitement les nouveaux tokens à ajouter : `--font-heading` (Archivo Black), `--clr-success-light` etc., `--clr-purple`, `--shadow-glow-primary`, etc.
- Marquer pour chaque écart : source Design / valeur / mapping / action (ajouter/aligner/laisser)

#### b) `trackyu-front-V2/src/styles/design-tokens.css` (~30 min)

- Port direct des tokens Design en CSS vars
- Brancher dans `index.css` existant via `@import` puis `@theme inline` Tailwind 4
- **Attention** : V2 a déjà un `index.css` avec des tokens — il faut **fusionner** sans tout réécrire

#### c) `INTEGRATION_PLAYBOOK_V2.md` (~1h, après premier pilote)

- Workflow concret : "voici comment passer d'un fichier `<module>-views.jsx` Design au code V2"
- À écrire **après** avoir fait le premier module pilote (retour terrain)
- Doit couvrir : extraction styles JS → Tailwind, gestion mock data → React Query, conversion Babel inline → ES modules, gestion icônes (Lucide légacy vs SVG inline Design)

### 3. Réorganisation `_raw/` par module (~20 min)

Actuellement les 90+ fichiers sont à plat dans `_raw/`. À déplacer/copier en sous-dossiers par module pour clarté :

```
_design-source/
├── _shared/           ← tc-styles, tc-overview, tc-table, design-canvas, template-container
├── _site-public/      ← index, connexion, contact, essai-gratuit, solutions, tarifs, mentions-légales, politique-confidentialité
├── _templates-ui/     ← templates-ui, tpl-data, tpl-views, tpl-views2
├── dashboard/         ← tableau-de-bord
├── carte-en-direct/   ← carte-en-direct, map-data, map-views, map-main
├── fleet/             ← fleet, fleet-icons, fleet-mockup
├── stock/             ← materiels-stock, ms-data, ms-overview, ms-views, ms-main
├── prevente/          ← prevente, prevente-data, prevente-overview, prevente-views, prevente-main
├── vente/             ← vente.html, vente-data, vente-views, vente-main
│   ├── contrats/      ← vente-contrats, ventes-contrats-data
│   ├── contrats-detail/ ← ventes-contrats-detail, ventes-contrats-detail-views, ventes-contrats-detail-main
│   ├── facturation/   ← vente-facturation, vc-billing-data, vc-billing-views, vc-billing-main
│   └── recouvrement/  ← vente-recouvrement, vr-data, vr-views, vr-main
├── (vente racine + clients vente : vc-data, vc-views, vc-main)
├── clients/           ← clients
├── support/           ← support-tickets, support-data, support-views, support-tabs, support-main
├── tech/              ← tech-interventions, tech-data, tech-views, tech-main
├── settings/          ← parametres, settings-data, settings-views, settings-main, ops-data, ops-views, help-data, help-views, rules-data, rules-views
├── rapports/          ← rapports, rpt-data, rpt-views
├── compta/            ← comptabilite-module, compta-data, compta-views, compta-main
├── monitoring/        ← monitoring, mon-data, mon-views, mon-main
├── agenda/            ← agenda, agd-data, agd-views, agd-main
├── admin/             ← administration, adm-data, adm-views, adm-main
├── _assets/           ← contenu de assets/ (logos, hero images, login bg, brand-guide, nav.js, shared.css)
└── _produits/         ← contenu de produits/ (5 pages produit)
```

→ **Important** : conserver `_raw/` intact (read-only). Faire la réorganisation par **copie**, pas par déplacement, pour toujours pouvoir vérifier l'original.

→ **Alternative** : ne pas copier mais créer juste un fichier `_INDEX_BY_MODULE.md` qui liste quel fichier appartient à quel module. Plus léger.

---

## 🔧 Ce qu'il faut savoir techniquement avant d'attaquer

### Stack des mockups Design (lu dans handoff CLAUDE.md)

```
React 18.3.1 + ReactDOM (UMD via <script>)
Babel Standalone 7.29.0 (transpile JSX in-browser)
Pas de bundler — chaque .html charge ses .jsx en relatif
Pas de framework CSS — styles inline 100% via objets JS
```

→ **Conséquence pratique** : on **ne peut pas** copier-coller. **Traduction obligatoire**.

### Pattern Theme Design (récurrent dans tous les modules)

```js
// Dans CHAQUE *-views.jsx Design :
const T = {
  bg: '#0a0a0b',
  surface: '#141416',
  surfaceAlt: '#1a1a1d',
  border: 'rgba(255,255,255,.08)',
  text: 'rgba(255,255,255,.92)',
  textMuted: 'rgba(255,255,255,.55)',
};
```

→ Mapping V2 :

- `T.bg` → `var(--bg-primary)` (à confirmer DLS)
- `T.surface` → `var(--bg-elevated)`
- `T.surfaceAlt` → `var(--bg-surface)` (ou nouveau `--bg-elevated-alt`)
- `T.border` → `var(--border)`
- `T.text` → `var(--text-primary)`
- `T.textMuted` → `var(--text-secondary)` ou `var(--text-muted)`

### Composants partagés Design (à porter en premier dans V2)

Dans `_raw/` :

- `tc-styles.jsx` — **CLÉ** : injecte `<style>` scoped `.tc-root`, contient TOUS les styles globaux (sidebar, topbar, tabs, toolbar, tables, badges, KPIs, charts, pagination). À convertir en CSS Tailwind.
- `tc-overview.jsx` — icônes SVG (`TCI.search`, `TCI.bell`, etc.) + KPI cards + chart helpers. Icônes : remplacer par Lucide React (déjà dans bootstrap V2).
- `tc-table.jsx` — `TCToolbar`, `TCFooter`, table patterns. À porter comme primitive `<DataTable>` V2.
- `design-canvas.jsx` — canvas de présentation des artboards. **Pas pour la prod**, juste outil de visualisation Design. **À ignorer** pour le portage.

### Layout `tc-root` (universel à tous les modules)

```
Grid: 64px sidebar | 1fr main
├── tc-sb (sidebar mini 64px)
│   ├── logo (38×38, gradient accent, radius 10)
│   ├── nav items (42×42, radius 10, actif = barre 3px gauche + bg accent dim)
│   └── icons utilitaires
└── tc-main
    ├── tc-top (header, height 68px, padding 18×28)
    ├── tc-subhead (h2 + subtitle + period selector)
    ├── tc-tabs (onglets niveau 1)
    └── tc-body / tc-content (padding 24×28×60)
```

→ À implémenter comme `<AppShell>` dans `src/components/layout/` côté V2. **Réutilisable par tous les modules**.

### Polices à intégrer dans `index.css` V2

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

(Inter et JetBrains Mono déjà OK probablement, vérifier ; Archivo Black est nouveau.)

### Devise et locale (rappel)

- Devise : **FCFA (XOF)**, formattage `X XXX XXX` (espace = séparateur milliers)
- Locale : **français**, dates `DD mois AAAA` ou `DD mois · HH:MM`

---

## 📋 Inventaire 8 groupes Templates UI (déjà classifiés)

Voir `templates-ui.html` + `tpl-views.jsx` + `tpl-views2.jsx` dans `_raw/`.

| Groupe | Template                            | Forms legacy mappés                                                                                                                                      | À implémenter en V2                                       |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **A**  | Document commercial multi-lignes    | InvoiceForm, EntryModal, PaymentModal, ContractForm, SubscriptionForm                                                                                    | `<DocumentForm>` avec slots (lignes, totaux, footer)      |
| **B**  | Process avec workflow + assignation | TicketFormModal, InterventionForm, TaskForm, LeadFormModal                                                                                               | `<ProcessForm>` avec timeline + statut + assigné          |
| **C**  | Fiche entité simple                 | ClientForm×2, UserForm, SubUserForm, DriverForm, TechForm, ResellerForm×3, BranchForm, GroupForm, TierForm, CatalogForm, AddDeviceModal, EditDeviceModal | `<EntityForm>` avec layout 2-3 cartes + champs RO dérivés |
| **D**  | Règle SI/ALORS                      | AlertForm, MaintenanceForm, EcoDrivingForm, ScheduleForm, CommandForm                                                                                    | `<RuleForm>` avec conditions + actions                    |
| **E**  | Objet carto                         | GeofenceForm, PoiForm                                                                                                                                    | `<MapObjectForm>` avec carte side panel                   |
| **F**  | Asset multi-tabs                    | VehicleForm                                                                                                                                              | `<AssetTabForm>` (cas isolé Vehicle)                      |
| **G**  | Modale rapide                       | EntryModal+, PaymentModal+, AssignModal, TransferModal×2, ScheduleReportModal                                                                            | `<QuickModal>` ~400px                                     |
| **H**  | Wizard CSV import                   | BulkImportModal                                                                                                                                          | `<ImportWizard>` (template + upload + preview + import)   |

Si **option B** retenue (pilote Templates UI), c'est ce qu'on attaque dans l'ordre A → C → G → B → D → E → H → F (par fréquence d'usage estimée).

---

## 🚨 Points d'attention / pièges connus

1. **V2 a son propre git** (commit `91c86d8`). Ne pas confondre avec git du legacy `TRACKING/`.
2. **Site public + 5 pages produits** = scope futur `trackyugps.com` vitrine. **Ne pas l'inclure dans V2** sauf si l'utilisateur le redécide (cf `project_domain_migration_plan` memory).
3. **`design-canvas.jsx`** = outil de présentation Design, **pas pour la prod**.
4. **`shared.css` + `nav.js`** dans `assets/` = artefacts du site public (à isoler du scope V2 app).
5. **Recouvrement** est désormais sous `Vente > Factures` et **plus** sous Comptabilité (D25).
6. **Stack divergence assumée** (D26) : pas de regen Design, traduction à l'intégration.
7. **Mode light** non maquetté Design — sera ajouté en batch après vague sombre (D18).
8. **Pas de routing** dans Design — chaque .html est indépendant. À mapper sur React Router v7 V2.
9. **Pas de state management** dans Design — tous les composants stateless. À brancher sur React Query (data) + contexts (UI state) côté V2.
10. **Le user a annoncé "tous les mockup sont ok meme au dela"** = niveau de confiance Design = haut. Pas besoin de demander des corrections sauf bug évident.

---

## 🎬 Premiers pas concrets prochaine session

### Si Option A (pilote Fleet) :

```bash
# 1. Lire les 3 fichiers Fleet
Read trackyu-front-V2/_design-source/_raw/fleet.html
Read trackyu-front-V2/_design-source/_raw/fleet-icons.jsx
Read trackyu-front-V2/_design-source/_raw/fleet-mockup.jsx

# 2. Lire tc-styles + tc-overview + tc-table (composants partagés)
Read trackyu-front-V2/_design-source/_raw/tc-styles.jsx
Read trackyu-front-V2/_design-source/_raw/tc-overview.jsx
Read trackyu-front-V2/_design-source/_raw/tc-table.jsx

# 3. Produire MAPPING_DLS.md + design-tokens.css
# 4. Créer src/components/layout/AppShell.tsx (le tc-root)
# 5. Créer src/features/fleet/FleetPage.tsx
```

### Si Option B (pilote Templates UI A-H) :

```bash
# 1. Lire la galerie complète Templates UI
Read trackyu-front-V2/_design-source/_raw/templates-ui.html
Read trackyu-front-V2/_design-source/_raw/tpl-data.jsx
Read trackyu-front-V2/_design-source/_raw/tpl-views.jsx   # groupes A-D
Read trackyu-front-V2/_design-source/_raw/tpl-views2.jsx  # groupes E-H

# 2. Lire tc-styles + tc-overview + tc-table
# 3. Produire MAPPING_DLS.md + design-tokens.css
# 4. Créer primitives V2 dans src/components/forms/ :
#    DocumentForm.tsx (A) → EntityForm.tsx (C) → QuickModal.tsx (G) → ...
# 5. Documenter chaque primitive dans modules/_TEMPLATE_FORM.md (et duplicats par groupe)
```

---

## 📁 Architecture cible Phase 4 (rappel)

```
trackyu-front-V2/
├── src/
│   ├── components/
│   │   ├── layout/         ← AppShell (tc-root), Sidebar, Topbar
│   │   ├── forms/          ← DocumentForm, EntityForm, ProcessForm, ... (8 templates UI)
│   │   ├── data-display/   ← DataTable (tc-table), Badge, KPICard, Chart
│   │   └── ui/             ← Button, Input, Select, Modal, Tabs, ...
│   ├── features/
│   │   ├── fleet/
│   │   ├── stock/
│   │   ├── crm/
│   │   ├── sales/
│   │   ├── finance/        ← cf D25 (4 onglets N1)
│   │   ├── support/
│   │   ├── tech/
│   │   ├── settings/
│   │   ├── reports/
│   │   ├── monitoring/
│   │   ├── agenda/
│   │   ├── admin/
│   │   ├── dashboard/
│   │   └── map/
│   ├── styles/
│   │   ├── design-tokens.css   ← 🆕 port direct tokens Design
│   │   └── globals.css
│   ├── services/           ← copié de legacy
│   ├── types/              ← copié de legacy
│   ├── i18n/               ← copié de legacy
│   ├── lib/                ← copié de legacy
│   ├── hooks/              ← à créer (useAuth, useTheme, useTenant, ...)
│   └── App.tsx + main.tsx + router.tsx
├── _design-source/         ← read-only, source Design
└── docs/                   ← lien ou copie des docs umbrella
```

---

## 🧠 État mental à transmettre à la prochaine session

- **Phase 2 Design est BOUCLÉE** (au-delà de l'attendu — 17 modules livrés au lieu de 14)
- **Bootstrap V2 est SOLIDE** (build OK, providers en place, dependencies prêtes)
- **Les 3 docs handoff Design sont une mine d'or** — ils donnent stack, conventions, tokens prêts à porter
- **Templates UI A-H = découverte précieuse** — galerie complète des 8 templates qui couvrent les ~28 forms du legacy + extensions futures
- **D24 satisfait, D26 actée** — plus aucun bloqueur dur pour Phase 4
- **Le user attend qu'on bouge** — pas besoin de planifier 10 jours, juste démarrer le pilote choisi

---

## 🗑️ Suppression de ce doc

Une fois que :

1. La décision pilote A/B est prise
2. `MAPPING_DLS.md` est produit
3. `design-tokens.css` est en place dans V2
4. Le premier module pilote est intégré et validé visuellement
5. `INTEGRATION_PLAYBOOK_V2.md` est rédigé à partir du retour terrain pilote

→ Ce fichier `HANDOFF_PHASE_4_KICKOFF.md` peut être **supprimé** (son contenu est absorbé dans le PLAYBOOK + STATE).

---

_Document temporaire de handoff. À tuer une fois Phase 4 bien lancée._
