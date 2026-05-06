# BLUEPRINT — Brief Design écrans principaux TrackYu

> **Brief à transmettre à claude.ai Design** pour la production des ~20 mockups d'écrans principaux TrackYu.
> Référencé par [CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md).
>
> **SCOPE** : structure visible des écrans (onglets / tables / filtres / actions / sections).
> **HORS SCOPE** : workflows métier, transitions d'état, matrice permissions détaillée — chantier séparé après livraison de tous les mockups.
>
> Dernière mise à jour : 2026-04-26 (v1.3 — stratégie template universel D11)

---

## 0bis. Convention "musts / libertés / nudges" — équilibre directives ↔ créativité

> Décision **D10 (2026-04-26)** — Niveau B "Équilibré".
> Le brief Design ne doit pas étouffer la créativité. Distinction stricte à appliquer dans **tous les briefs futurs** :

### 🔒 MUSTS — non-négociable (TrackYu identity & data)

Tout ce qui touche à **l'identité TrackYu** et **la data réelle** :

- Palette exacte : brand `#d96d4c`, idle ambre `#FBBF24`, status véhicule (vert/jaune/rouge/gris stricts), sémantiques success/danger/warning/caution/info/emerald
- Polices : Inter (corps), Archivo Black (display), JetBrains Mono (mono-labels)
- **Données disponibles** : la liste des champs/colonnes/onglets/sections **qui existent dans le code TrackYu** (Design ne peut pas inventer des données — sinon discord avec backend)
- Labels FR systématique + vocabulaire figé (`Chaud`/`Moyen`/`Dormant`, `Nouveau`/`Qualifié`/etc., cf. BLUEPRINT §7)
- Statut véhicule jamais utilisé en accent générique (le CTA reste orange marque, pas vert "moving")
- Mode dual clair / sombre

### 🎨 LIBERTÉS — Design propose, on valide

Tout ce qui touche au **visuel et à l'UX** :

- **Type de visualisation** par champ (mini-gauge / progress / radial / chiffre coloré / sparkline / autre)
- **Disposition des sections** dans la page (Design peut réorganiser)
- **Hiérarchie typographique** (Design peut proposer plus emphatique ou plus discret)
- **Densité** (compact vs aéré selon contexte module)
- **Drawer / Panel** position et taille (peut proposer plein-écran, sheet bas, modal, etc.)
- **Animations et micro-interactions**
- **Empty states** et illustrations
- **Layouts charts** (innovations bienvenues)
- **Patterns émergents** : sparklines en fond, mini-maps, glassmorphism, etc.
- **Mobile gestures** et adaptations responsive
- **Composition** des KPI cards / status cards / panels (Design peut proposer mieux que les patterns en cours)
- **Style** des badges, icons, chips, séparateurs

### 💡 NUDGES — suggestions inspirantes, pas obligatoires

- Les patterns du **Dashboard v1 validé** (sparklines fond KPI, mini stats radiales, breadcrumb mono `// SECTION`) peuvent inspirer mais ne sont pas obligatoires
- Le **DLS** ([DLS.md](DLS.md)) liste les patterns acquis (`.btn` / `.card` / `.filter-chip` / etc.) — **disponibles**, pas imposés
- Si Design **propose un pattern nouveau et meilleur**, on l'évalue, on le valide, on l'**ajoute au DLS** pour propagation (pas de rejet par principe)

### Boucle vertueuse

```
Design propose pattern nouveau
        ↓
Validation utilisateur + Claude Code
        ↓
Si convaincant : extension du DLS
        ↓
Disponible pour les écrans suivants
        ↓
Cohérence accumulative (vs cohérence figée)
```

→ Le DLS **vit** au lieu de **figer**. Chaque écran enrichit potentiellement le langage.

### Briefing par couches (D20 — 2026-04-26)

Tout brief Design doit respecter une logique de **couches progressives**. Pas de surcharge initiale.

```
Couche 1 — CADRE                      (toujours)
  Structure (combien d'écrans/onglets/sous-onglets)
  Identité TrackYu (MUSTS rigides)
  Livrables (artboards, modes)

Couche 2 — ARCHITECTURE               (toujours, court)
  Intent par sous-onglet en 1-2 lignes
  Patterns transversaux à réutiliser
  Header / footer commun

Couche 3 — DÉTAIL CHAMPS / ACTIONS    (UNIQUEMENT si demandé)
  Champs précis, libellés exacts
  Actions de ligne, modales triggers

Couche 4 — VARIANTS / EDGE CASES      (à la fin, si besoin)
  Empty / loading / error
  Permissions par rôle structurelles
```

**Règle** : commencer par Couche 1, descendre seulement si demandé ou si Design pose question spécifique. Design est créatif, lui laisser de l'air. **Stop dès le bloc copy-paste, pas de "Notes pour toi" en queue.**

---

## 0. Comment lire ce document

Pour chaque écran principal :

- **Module** + fichier composant React de référence
- **Onglets niveau 1** (avec **labels exacts en français** affichés à l'utilisateur)
- **Sous-onglets** s'il y en a
- **Tableau principal** (colonnes visibles)
- **Filtres** (search bar, dropdowns, date range, filter chips)
- **Actions toolbar** (boutons Créer / Importer / Exporter / etc.)
- **Sections** (KPI cards, charts, listes secondaires)
- **Modals déclenchables** (mentionnées sans détail visuel — à générer pendant l'intégration)
- **Particularités** (Kanban, drag-drop, real-time, virtualisation, etc.)
- **Rôles** autorisés (résumé)

Les **5 écrans atypiques** (Dashboard, Map, Replay, Agenda, Tickets) ont leur propre format adapté à leur nature non-tabulaire.

---

## 1. Périmètre

### Écrans à mockuper dans cette vague (claude.ai Design)

| #   | Écran                              | Type                      | Statut                                   |
| --- | ---------------------------------- | ------------------------- | ---------------------------------------- |
| 1   | Connexion + Inscription + Reset    | Auth                      | Pilote séparé (mockup connexion v1 reçu) |
| 2   | Dashboard                          | Atypique (KPI dense)      | ✅ Mockup v1 validé en cours             |
| 3   | Carte temps réel (Map)             | Atypique (Leaflet)        | À mockuper                               |
| 4   | Replay                             | Atypique (timeline)       | À mockuper                               |
| 5   | Fleet liste + Vehicle Detail Panel | Container + Panel         | À mockuper                               |
| 6   | Prévente (Leads & Pistes)          | Container 7 onglets       | À mockuper                               |
| 7   | Ventes (Sales)                     | Container 4 onglets       | À mockuper                               |
| 8   | Comptabilité (Accounting)          | Container 9 onglets       | À mockuper                               |
| 9   | Tech / Interventions               | Container 6 onglets       | À mockuper                               |
| 10  | Monitoring système                 | Vue unique multi-sections | À mockuper                               |
| 11  | Stock (Inventaire)                 | Container 6 onglets       | À mockuper                               |
| 12  | Support / Tickets                  | Atypique (table + chat)   | À mockuper                               |
| 13  | Rapports                           | Catalog + viewer          | À mockuper                               |
| 14  | Settings                           | Container onglets         | À mockuper                               |
| 15  | Administration                     | Container 13 panels       | À mockuper                               |
| 16  | Agenda                             | Atypique (calendrier)     | À mockuper                               |

→ **~14-15 mockups** à produire (Auth déjà en cours, Dashboard validé en cours, Comptabilité découpé en 2).

### Règle "1 mockup = 1 onglet actif"

Pour chaque écran avec onglets (Prévente, Ventes, Comptabilité, Tech, Stock, Settings, Admin), **un seul mockup** = l'onglet le plus représentatif **rempli**. Les autres onglets sont visibles dans la barre d'onglets mais **non remplis**. Les sous-vues secondaires sont décrites textuellement, pas dessinées.

Ce qui est livré pour chaque écran :

- 1 mockup principal (onglet actif rempli, données démo cohérentes)
- 1 vignette empty state (compact, illustre le pattern "rien à afficher")
- Mode **clair ET sombre** systématiquement

### Hors scope de cette vague

- **Modals & forms** (~30 modals dispersés) → générés à la volée pendant l'intégration code, en réutilisant les patterns du DLS
- **Composants partagés** (Modal, Drawer, BottomSheet, CommandPalette, NotificationCenter, AiAssistant) → traités en Vague 3 du SCREEN_MAP
- **Sub-panels Admin** (13 panels : Resellers, WhiteLabel, Webhooks, Integrations, etc.) → représentés comme un onglet actif dans le mockup Admin, pas un mockup par panel
- **Workflows métier** (lead → contrat → facture, etc.) → chantier séparé après livraison de tous les mockups
- **États transitions** (ticket OPEN → IN_PROGRESS → RESOLVED) → chantier séparé

---

## 2. Patterns communs (à réutiliser sur tous les écrans)

### 2.1 Header de page

```
┌────────────────────────────────────────────────────────────┐
│ // MODULE · SECTION                          (breadcrumb mono)│
│ Titre principal (page-title — 22px font-black)              │
│ Sous-titre optionnel (page-subtitle — 13px secondary)       │
│                                                              │
│ [DateRangeSelector] [Filter button] [Action button +]       │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Container avec onglets

```
┌────────────────────────────────────────────────────────────┐
│ Header de page                                              │
│ ┌──────────────────────────────────────────────┐           │
│ │ [Onglet 1] [Onglet 2 actif] [Onglet 3]      │ tabs     │
│ └──────────────────────────────────────────────┘           │
│                                                              │
│ Contenu de l'onglet actif                                   │
│ (peut contenir sous-onglets, KPIs, tables, charts)          │
└────────────────────────────────────────────────────────────┘
```

Onglet actif : fond `var(--primary-dim)` + texte `var(--primary)` + border bottom 2px primary.
Onglet inactif : texte `var(--text-secondary)` + hover `var(--bg-elevated)`.

### 2.3 Toolbar (recherche + filtres + actions)

```
┌────────────────────────────────────────────────────────────┐
│ [🔍 SearchBar.....................] [▾Status] [▾Type]     │
│ [filter-chip Tous] [chip Actifs] [chip Convertis]          │
│                          [Importer] [Exporter] [+ Action]  │
└────────────────────────────────────────────────────────────┘
```

### 2.4 Tableau

```
┌────────────────────────────────────────────────────────────┐
│ [☑] [Col1 ↑] [Col2] [Col3] [Col4] [Actions]                │ th-base (uppercase muted 11px)
├────────────────────────────────────────────────────────────┤
│ [☐] data    data    data   data   [⋮]                      │ tr-hover
│ [☐] data    data    data   data   [⋮]                      │
└────────────────────────────────────────────────────────────┘
[Page 1/12 ←][1][2][3]…[12][→][10/page ▾]
```

- Tri : flèche sur colonne triable
- Selection multi : checkbox header + lignes
- Actions ligne : 3-dots `[⋮]` en colonne droite
- Pagination : numbered + items per page selector

### 2.5 KPI cards (top row)

Format dejà figé via le mockup Dashboard v1 :

- Icône colorée en haut-gauche (10×10 dans card 12×12)
- Badge tendance ↑/↓ en haut-droite (rounded full, fond tinté status)
- Valeur (font-black tabular-nums)
- Label (xs muted)
- Sub-label (10px muted)
- Sparkline en fond (optionnel)

### 2.6 Empty state

```
┌────────────────────────────────────────┐
│            [Illustration]               │
│                                         │
│     Aucun résultat trouvé              │
│   Sous-titre explicatif                │
│                                         │
│        [+ Action principale]           │
└────────────────────────────────────────┘
```

### 2.7 Modals (3 types selon contexte)

- **Modal centrée** (50-70% viewport) — pour formulaires, confirmation, détail
- **Drawer latéral** (panel droit, full-height) — pour quick view (ex: Vehicle Detail)
- **BottomSheet mobile** (slide bas, 80% viewport) — pour actions mobile

### 2.8 Statuts véhicule (couleurs strictes)

| Statut   | Couleur                   | Visible sur                       |
| -------- | ------------------------- | --------------------------------- |
| moving   | Vert `#22C55E`            | Map markers, badges, dots, donuts |
| **idle** | **Jaune ambre `#FBBF24`** | Idem                              |
| stopped  | Rouge `#EF4444`           | Idem                              |
| alert    | Rouge foncé `#DC2626`     | Badges critiques                  |
| offline  | Gris `#6B7280`            | Idem                              |

→ **Jamais utiliser ces couleurs comme accent générique.** Le CTA reste `#d96d4c` (terracotta).

### 2.9 Sévérité sémantique (badges)

| Sévérité | Couleur dark | Couleur light | Usage                                |
| -------- | ------------ | ------------- | ------------------------------------ |
| Success  | `#4ade80`    | `#16a34a`     | OK, terminé, validé                  |
| Danger   | `#f87171`    | `#dc2626`     | Erreur, critique, urgent             |
| Warning  | `#fb923c`    | `#ea580c`     | Attention (orange — distinct marque) |
| Caution  | `#fbbf24`    | `#d97706`     | Avertissement (ambre)                |
| Info     | `#c084fc`    | `#9333ea`     | Info neutre (violet, pas bleu)       |
| Emerald  | `#34d399`    | `#059669`     | Catégorie technique distincte        |

---

## 2bis. Stratégie de production — template universel + atypiques (D11)

> Décision **D11 (2026-04-26)** — au lieu de 14 mockups complets, on factorise via un **template universel** appliqué aux modules à pattern commun.

### Dichotomie

| Type                                 | Modules                                                                         | Approche                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Template universel** (8 modules)   | Prévente, Ventes, Comptabilité, Tech, Stock, Settings, Administration, Rapports | 1 squelette générique → application à chaque module avec ses libellés/data |
| **Atypiques sur mesure** (6 modules) | Dashboard ✓, Fleet ✓, Map, Replay, Tickets, Agenda, Monitoring                  | Mockup dédié — layout spécifique non factorisable                          |

### Économie

- **Avant** : 14 mockups complets × design from scratch
- **Après** : 1 template + 6 atypiques + 8 variations légères = **gain temps × cohérence garantie**

### Cf. §3a pour le brief template, §3 pour les écrans atypiques.

---

## 3a. Template universel — "Container avec onglets + table"

Squelette à appliquer aux 8 modules à pattern commun.

### 🔒 MUSTS — squelette obligatoire

**Header standard**

- Breadcrumb mono `// MODULE · SECTION`
- Titre principal (Archivo Black ou Inter Black)
- LIVE badge à droite (vert pulsé pour modules temps réel)
- Search globale + theme toggle + notification (déjà dans header App)

**Sous-header**

- Sous-titre avec compteurs ("47 véhicules · 31 en route · ...")
- Sélecteur de période en haut à droite (Jour / Semaine / Mois en pills toggle ou DateRangeSelector)

**Barre d'onglets**

- 4-7 onglets génériques visibles (libellés "Onglet 1" / "Onglet 2" en placeholder dans le template — remplis par module)
- 1 onglet actif rempli, autres visibles non remplis

**Onglet "Vue d'ensemble" rempli (template)**

- 4-6 KPI cards en haut (icon + value + label + tendance)
- 5 mini-dashboards en grille 3+2 ou 2+3 :
  - 1 area chart série temporelle (Recharts)
  - 1 bar chart catégoriel
  - 1 donut/pie chart répartition
  - 1 jauge radiale (gauge style Dashboard v1)
  - 1 liste compacte type "TOP 5"

**Onglet "Liste" rempli (template)**

Toolbar :

- Search bar large à gauche
- Filtres multi-critères (filter-chips + dropdowns)
- À droite : `[Importer] [Exporter ▾ : PDF/CSV/Excel] [⚙ Colonnes] [+ Nouveau]`
- Si lignes sélectionnées : bandeau bulk actions sous toolbar (`X sélectionnés` + actions)

Table :

- Header avec checkbox "Select All"
- Headers de colonnes triables (icône ↑↓), filtrables (mini-icône), resizables (optionnel)
- Lignes avec checkbox + colonnes data placeholder + actions [⋮]
- Hover row : background `--bg-elevated`
- Selected row : background `--primary-dim` + border-left primary

Pagination footer :

- "X-Y sur N résultats" gauche · pages numérotées centre · items per page droite

Column Manager (modal/popover déclenché par ⚙) :

- Liste colonnes avec checkbox visible/masquée
- Drag-drop pour réordonner
- Bouton "Réinitialiser"

### 🎨 LIBERTÉS

- Composition exacte des KPI cards (taille, sparkline ou pas)
- Type de chaque mini-dashboard (Design choisit)
- Disposition grille (3+2 / 2+3 / autre)
- Style filter-chips (pill / outline / fill)
- Animation bandeau bulk actions
- Position bouton Column Manager
- Style pagination
- Style hover et selected row

### Livrables template

- 1 mockup mode SOMBRE — Onglet "Vue d'ensemble"
- 1 mockup mode SOMBRE — Onglet "Liste" (sans sélection)
- 1 mockup mode SOMBRE — Onglet "Liste" avec 3 sélectionnés (bandeau bulk visible)
- 1 mockup mode CLAIR — Onglet "Liste" (validation mode dual)
- 1 vignette empty state ("Aucun élément à afficher")
- 1 vignette mini : Column Manager popover ouvert

= **6 vignettes pour 1 template universel**

### Application aux 8 modules (Phase 2c)

Une fois le template validé, chaque module reçoit ses libellés et data spécifiques :

| Module         | Onglets à plugger                                                                                                                      | Colonnes table à plugger |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Prévente       | Vue d'ensemble · Leads · Devis · Catalogue · Tâches · Automatisations · Inscriptions                                                   | Cf. §3.4                 |
| Ventes         | Vue d'ensemble · Clients · Contrats · Factures                                                                                         | Cf. §3.5                 |
| Comptabilité   | (découpé en 2 mockups, cf. §3.6)                                                                                                       | Cf. §3.6                 |
| Tech           | Vue d'ensemble · Liste · Planning · Radar · Stock · Équipe                                                                             | Cf. §3.7                 |
| Stock          | Vue d'ensemble · Boîtiers · SIMs · Accessoires · Mouvements · RMA                                                                      | Cf. §3.9                 |
| Settings       | Profil · Apparence · Sécurité · Notifs · Tickets · Sync · Préférences                                                                  | Cf. §3.12                |
| Administration | Revendeurs · Devices · WhiteLabel · Équipe · Système · Audit · Help · Templates · Messages · Webhooks · Org · Intégrations · Corbeille | Cf. §3.13                |
| Rapports       | Catalog + Report viewer                                                                                                                | Cf. §3.11                |

Phase légère : juste injecter le contenu, pas redessiner la structure.

---

## 3. Écrans principaux à mockuper

### 3.1 Carte temps réel — `View.MAP` ATYPIQUE

**Fichier** : [`features/map/components/MapView.tsx`](../../features/map/components/MapView.tsx)

**Layout** :

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header (breadcrumb // CARTE EN DIRECT)            │
│         │                                                    │
│         │ ┌──────────────┬─────────────────────────────────┐│
│         │ │              │                                  ││
│         │ │ Liste        │       CARTE LEAFLET             ││
│         │ │ véhicules    │       (markers colorés selon    ││
│         │ │ (filtrable)  │        statut + clusters         ││
│         │ │              │        + heatmap optionnel)      ││
│         │ │ - TY-042 ●   │                                  ││
│         │ │ - TY-018 ●   │       [Légende statuts]         ││
│         │ │ - TY-007 ●   │       [Toggle heatmap]          ││
│         │ │ - ...        │       [Toggle géofences]        ││
│         │ │              │       [Toggle satellite/street] ││
│         │ │              │                                  ││
│         │ └──────────────┴─────────────────────────────────┘│
│         │ + Bouton flottant "Replay" (apparaît au clic)     │
└─────────────────────────────────────────────────────────────┘
```

**Markers** : pin coloré selon statut véhicule (vert/jaune/rouge/gris). Cluster si zoom out (chiffres). Tooltip au hover (immat + vitesse).

**Sélection véhicule** :

- Clic marker → ouvre **VehicleDetailPanel** en drawer droit (cf. 3.3)
- Clic ligne dans liste gauche → idem + zoom carte

**Filtres liste gauche** : search + filter-chip (statut), order by

**Particularités** :

- Real-time WS (positions mises à jour toutes les 5-10s)
- Performance : virtualization si flotte > 100 véhicules
- Mode sombre/clair : tiles Leaflet adaptés

**Rôles** : tous (CLIENT voit sa flotte uniquement)

---

### 3.2 Replay — sous-mode de Map ATYPIQUE

**Fichier** : [`features/map/components/ReplayControlPanel.tsx`](../../features/map/components/ReplayControlPanel.tsx)

**Layout** :

```
┌─────────────────────────────────────────────────────────────┐
│ Header avec sélecteur véhicule + date du replay             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│             CARTE LEAFLET avec trace polyline               │
│             (couleur dégradée selon vitesse)                │
│             + marker animé du véhicule                      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Timeline 24h colorée (segments par statut)                  │
│ ━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━ 14:23              │
│ [⏮] [⏪] [▶/⏸] [⏩] [⏭]    Vitesse: x1 x2 x4 x8           │
│                                                              │
│ Événements (jump-to) :                                       │
│ ◉ 06:30 Démarrage    ◉ 09:14 Arrêt 12min   ◉ 13:50 Excès  │
└─────────────────────────────────────────────────────────────┘
```

**Particularités** :

- Timeline 24h colorée selon statut (segments verts pour roulage, jaunes pour idle, rouges pour stops)
- Player avec play/pause/vitesse
- Jump to event (clic sur événement → marker se téléporte)

**Rôles** : ADMIN, MANAGER, CLIENT (sa flotte)

---

### 3.3 Fleet liste + Vehicle Detail Panel

**Fichier** : [`features/fleet/components/FleetTable.tsx`](../../features/fleet/components/FleetTable.tsx) + [`VehicleDetailPanel.tsx`](../../features/fleet/components/VehicleDetailPanel.tsx)

**Onglets** : aucun (vue tabulaire unique)

**Tableau principal** :

- Colonnes : `Immat / Alias` · `Statut` (badge couleur) · `Vitesse` · `Position` (Adresse + bouton "Voir sur carte") · `Carburant` (mini-gauge bar) · `Conducteur` · `Score conduite` · `Dernière maj` · `Actions [⋮]`
- Selection multi (export bulk, assignment driver)
- Tri : tous les colonnes
- Virtualization (react-window) si > 200 lignes

**Filtres** :

- SearchBar "Rechercher (immat, alias, conducteur)..."
- filter-chip statut : `Tous` `En route` `Au ralenti` `Arrêté` `Hors ligne` `Alerte`
- Dropdown "Tous les modèles"
- Dropdown "Tous les chauffeurs"
- Toggle "Avec alertes uniquement"

**Actions toolbar** : `[+ Nouveau véhicule]` `[Importer CSV]` `[Exporter PDF/Excel]` `[Gérer colonnes ⚙]`

**Vehicle Detail Panel** (drawer responsive ouvert au clic ligne) :

> ⚠ Spec corrigée 2026-04-27 après audit code legacy. Voir [`modules/FLEET.md`](modules/FLEET.md) §12 pour le détail complet.

- **4 zones** : Header (~80px) · Config banner (32px optionnel, mode personnalisation) · Content scroll · Footer (~120px)
- **Header bleu primaire** : icône statut + nom véhicule + immatriculation + Position Actuelle (adresse/géofence + boutons Copier coords / Maps) + ligne `Statut+Durée \| Kilométrage \| Heures moteur` + bouton Config + Close
- **11 onglets internes** (CollapsibleSection, ordre/visibilité personnalisable) :
  `Photo` · `Activité` · `Alertes` · `Infractions/Violations` · `Comportement` · `Maintenance` · `Dépenses` · `Carburant` · `Capteurs` · `GPS` (staff only) · `Historique Appareil`
- **Footer 2 boutons critiques full-width** :
  - `Immobiliser` / `Déverrouiller` (Lock/LockOpen, danger/success)
  - `Signaler une panne` / `Marquer comme réparé` (Wrench, warning/success)
- **Bouton "REJOUER LE TRAJET"** dans ActivityBlock (pas dans footer)

**Modals** : VehicleFormModal, ImportModal, ConfirmDelete

**Rôles** : ADMIN, MANAGER, CLIENT (sa flotte)

---

### 3.4 Prévente — `View.PRESALES`

**Fichier** : [`features/crm/components/PresalesView.tsx`](../../features/crm/components/PresalesView.tsx)

**Onglets niveau 1** :

1. **Vue d'ensemble**
2. **Leads & Pistes**
3. **Devis**
4. **Catalogue**
5. **Tâches** (desktop only)
6. **Automatisations** (desktop only)
7. **Inscriptions**

**Onglet "Vue d'ensemble"** :

- 6 KPI cards : `Total leads` · `Gagnés` · `Perdus` · `Taux conversion %` · `Temps conversion moyen` · `Pipeline value`
- Section **Scoring leads** : 3 colonnes (Chaud 🔥 / Moyen ☀ / Dormant ❄) avec compteurs
- Section **Leads dormants** : liste leads sans activité > 7j
- Charts : Bar chart "Entonnoir commercial" + Pie chart "Répartition par statut"

**Onglet "Leads & Pistes"** :

- **Toggle vue** : `[Kanban]` `[Liste]` (Kanban par défaut sur desktop, Liste sur mobile)
- **Mode Kanban** : 5 colonnes affichées en français (`Nouveau` / `Qualifié` / `Proposition` / `Gagné` / `Perdu`), drag-drop entre colonnes, cards avec : société + contact + valeur + score + date
- **Mode Liste** : table colonnes `Société` `Contact` `Email` `Téléphone` `Statut` `Valeur potentielle` `Source` `Revendeur` `Actions`
- Filtres : SearchBar · Dropdown sociétés · Dropdown statut · Dropdown source · Dropdown revendeur (SUPERADMIN)
- Actions : `[+ Nouveau lead]` `[Saisie rapide]` `[Importer CSV]` `[Exporter PDF]`

**Onglet "Devis"** : table polymorphe (cf. FinanceView mode QUOTES) — colonnes Numéro · Date · Prospect · Montant · Statut · Validité · Actions

**Onglet "Catalogue"** :

- KPI cards : `Total articles` · `Catégories` · `Actifs` · `Prix moyen`
- Table catalogue : Référence · Modèle · Type · Catégorie · Prix · Statut · Actions (Edit/Clone/Toggle/Delete)

**Onglet "Tâches"** : liste tâches commerciales avec filter-chip statut

**Onglet "Inscriptions"** : table demandes d'inscription en attente de validation

**Modals** : LeadFormModal, LeadDetailModal, ImportModal, CatalogFormModal, StatusChangeModal, **WinCelebrationModal** (animation quand lead → WON)

**Rôles** : COMMERCIAL, MANAGER, ADMIN, SUPERADMIN

---

### 3.5 Ventes — `View.SALES`

**Fichier** : [`features/crm/components/SalesView.tsx`](../../features/crm/components/SalesView.tsx)

**Onglets niveau 1** :

1. **Vue d'ensemble** (DashboardSales)
2. **Clients & Tiers**
3. **Contrats**
4. **Factures** (avec **sous-onglet Recouvrement** — D25 2026-04-27)

**DateRangeSelector global** dans le header (impacte tous les onglets)

**Onglet "Vue d'ensemble"** :

- 4 KPI cards : `CA Émis` · `Encaissements` · `Taux recouvrement %` · `Clients impayés`
- Section **TOP 5 clients impayés** : table compacte avec montant dû + badge ancienneté
- Charts : revenue trend 12 mois

**Onglet "Clients & Tiers"** :

- Table : `Nom Client` · `Type` · `Statut` · `Téléphone` · `Email` · `Plan souscription` · `Solde / Statut paiement`
- Filtres : SearchBar · Status · Type
- Actions : `[+ Nouveau client]` · `[Importer]` · `[Exporter]`

**Onglet "Contrats"** : table contrats avec colonnes adaptées (Numéro · Client · Date début · Date fin · Statut · Mensualité · Actions)

**Onglet "Factures"** : container avec 2 sous-onglets

- **Sous-onglet "Liste"** :
  - Table : `Numéro` · `Date` · `Client` · `Montant TTC` · `Statut` · `Date paiement` · `Actions`
  - filter-chip statut : `Toutes` `Brouillon` `Envoyée` `Payée` `En retard` `Annulée`
  - Actions : `[+ Nouvelle facture]` · `[Génération en bloc]` · `[Exporter]`

- **Sous-onglet "Recouvrement"** (déplacé depuis Comptabilité, D25) :
  - Table impayés : `Numéro` · `Client` · `Montant dû` · `Ancienneté` (badge gradient vert→rouge selon âge) · `Niveau de relance` · `Dernière relance` · `Actions`
  - Filtres : ancienneté (0-30j / 31-60j / 61-90j / +90j) · niveau relance · client
  - Actions ligne : envoyer relance (email/SMS) · escalader · enregistrer paiement · contentieux

**Modals** : ClientFormModal, ClientDetailModal, ContractFormModal, InvoiceFormModal, PaymentModal, SendDocumentModal, RelanceModal (recouvrement)

**Rôles** : COMMERCIAL, FINANCE, ADMIN

---

### 3.6 Comptabilité — `View.ACCOUNTING`

**Fichier** : [`features/finance/components/AccountingView.tsx`](../../features/finance/components/AccountingView.tsx)

> ⚠️ **Architecture révisée D25 (2026-04-27)** : passage de **9 onglets → 4 onglets** niveau 1 avec 2 containers (Finance + Comptabilité) ayant chacun des sous-onglets.
>
> **Réorganisation** :
>
> - Recouvrement → déplacé vers `Vente > Factures > Recouvrement`
> - Caisse + Banque → sous-onglets de `Module Comptabilité > onglet Finance`
> - Rapports + Dépenses → sous-onglets de `Module Comptabilité > onglet Comptabilité` (l'onglet journal devient un container)

**Onglets niveau 1** (4 onglets) :

1. **Vue d'ensemble** (Stats)
2. **Finance** (container 2 sous-onglets : Caisse · Banque)
3. **Budget** _(desktop)_
4. **Comptabilité** (container 3 sous-onglets : Journal · Rapports · Dépenses)

**Filtre top-bar SUPERADMIN** : Dropdown "Tous les revendeurs / Revendeur X" (multi-tenant)

**Onglet "Vue d'ensemble"** :

- 6 KPI cards : `CA Émis` · `Encaissements` · `Taux recouvrement` · `Charges` · `Résultat net` · `Marge %`
- Section **TOP 5 clients impayés**
- Section **Balance** : Pie chart 3 segments (Actif Immob / Actif Circulant / Trésorerie)
- Section **Aging Balance** : 4 barres (`0-30j` / `31-60j` / `61-90j` / `+90j`)
- Indicateur **DSO** (Days Sales Outstanding)
- Chart **Monthly Revenue** : 3 séries (Encaissements · Dépenses · Solde)
- Chart **Bank Balance** 6 derniers mois
- Chart **Budget vs Réel** par catégorie de charge

**Onglet "Finance"** (container 2 sous-onglets) :

- **Sous-onglet "Caisse"** :
  - Header : Solde de caisse en gros chiffre
  - Table mouvements : `Date` · `Référence` · `Label` · `Mouvement` (Entrée/Sortie) · `Montant` · `Solde courant`
  - Actions : `[+ Encaissement]` · `[+ Décaissement]` · `[Exporter]`

- **Sous-onglet "Banque"** :
  - Header : Solde bancaire par compte
  - Table opérations : `Date` · `Référence` · `Label` · `Débit` · `Crédit` · `Solde` · `Statut rapprochement` (rapproché/non)
  - Actions : `[Importer relevé]` (CSV/OFX) · `[Lancer rapprochement]` · `[Exporter]`
  - Vue dédiée : BankReconciliationView pour le rapprochement

**Onglet "Budget"** : tableau budget par catégorie + barres comparatives prévu/réalisé

**Onglet "Comptabilité"** (container 3 sous-onglets) :

- **Sous-onglet "Journal"** (écritures comptables) :
  - Table : `Date` · `Référence` · `Label` · `Compte` · `Débit` · `Crédit` · `Journal`
  - Filtre par classe comptable (CLASSE 1-8 dropdown)
  - SearchBar "Rechercher (label, ref, numéro compte)..."
  - Actions : `[+ Nouvelle écriture]` (modal EntryModal avec 2+ lignes obligatoires, équilibrée débit/crédit)

- **Sous-onglet "Rapports"** : accès direct aux rapports financiers/comptables (Bilan · Balance âgée · État TVA · Journaux · Export FEC) — délègue au module Rapports avec catégorie pré-filtrée

- **Sous-onglet "Dépenses"** : suivi des **dépenses de l'entreprise** (frais généraux, fournitures, services, prestataires, abonnements logiciels, etc.) — **PAS les dépenses véhicules** (qui sont dans Fleet > VehicleDetailPanel > ExpensesBlock)

**Modals** : EntryModal (création écriture comptable), CashMovementModal (encaissement/décaissement), BankImportModal, BankReconcileModal

**Particularité** : verrouillage de période comptable possible (lockDate)

**Rôles** : FINANCE, ADMIN, SUPERADMIN

---

### 3.7 Tech / Interventions — `View.TECH`

**Fichier** : [`features/tech/components/TechView.tsx`](../../features/tech/components/TechView.tsx)

**Onglets niveau 1** (6 onglets, 3 cachés sur mobile) :

1. **Vue d'ensemble** _(desktop)_
2. **Liste**
3. **Planning** _(desktop)_
4. **Radar (carte)** _(desktop)_
5. **Stock**
6. **Équipe**

**Onglet "Vue d'ensemble"** :

- 5 KPI cards : `Total interventions` · `Terminées` · `En attente` · `En cours` · `Temps moyen`
- TechStats : Pie chart par statut + distribution techniciens

**Onglet "Liste"** :

- Table : `ID` · `Véhicule / Client` · `Technicien` · `Type` · `Statut` · `Date planifiée` · `Actions`
- Tri : Date, Technicien, Statut
- Filtres : SearchBar · filter-chip statut · Dropdown type · Dropdown technicien
- Actions : `[+ Nouvelle intervention]` · `[Filtres ▾]`
- Mobile : KPI filter chips cliquables (En attente / En cours / Terminées) en haut

**Onglet "Planning"** : calendrier hebdomadaire drag-drop par technicien

**Onglet "Radar (carte)"** : carte temps réel positions techniciens + clusters interventions

**Onglet "Stock"** :

- Table : `Type` · `Modèle` · `S/N (IMEI/ICCID)` · `Statut` · `Date entrée` · `Actions (Transfert)`
- Mobile : cartes empilées (Type / Modèle / S/N / status badge / bouton Transfer)
- Filtres : Dropdown type (BOX / SIM / SENSOR / ACCESSORY) · SearchBar
- Section **Pending Transfers** : table secondaire (Accepter / Refuser)
- Actions : `[+ Inventaire]` (modal audit) · `[+ Ajout]`

**Onglet "Équipe"** : TechTeamView (gestion techniciens + permissions)

**Modals** : InterventionDetailModal, InterventionFormModal, StockAuditModal, StockTransferModal, IndividualTransferModal

**Particularités** :

- Status change avec modal confirmation + commentaire obligatoire
- Sync avec Tickets (passage IN_PROGRESS quand technicien EN_ROUTE)
- Sensor config sync vers Vehicle au COMPLETED
- Mobile FAB "+" en bas-droite

**Rôles** : TECH, MANAGER, ADMIN

---

### 3.8 Monitoring système — `View.MONITORING` ATYPIQUE

**Fichier** : [`features/tech/components/monitoring/SystemMetricsPanel.tsx`](../../features/tech/components/monitoring/SystemMetricsPanel.tsx)

**Layout** : vue unique (pas d'onglets), grid sections.

**6 sections empilées** :

1. **Ressources serveur**
   - Stat cards : `CPU %` · `Mémoire %` · `Disque %` · `Uptime`
   - Progress bars (rouge si > 80%)

2. **Pipeline GPS**
   - Stat cards : `Connexions TCP` · `Messages reçus` · `Positions sauvées` · `Erreurs parsing` · `Latence moy` · `Buffer size`

3. **Cache Redis**
   - Stat cards : `Hit rate %` · `Latence cache`
   - Progress bar Hit rate
   - Stats : Hits count · Misses count

4. **Base de données PostgreSQL**
   - Stat cards : `Pool actives/total` · `Latence requête`
   - Stats : Total queries · Batch inserts
   - Progress bar pool utilization

5. **WebSocket temps réel**
   - Stat cards : `Clients connectés` · `Messages émis` · `Messages throttled`

6. **Métriques business**
   - Stat cards : `Véhicules actifs` · `Alertes générées`

**Actions toolbar** : `[Rafraîchir 🔄]` (auto-refresh 3-5s)

**Particularités** :

- Real-time react-query auto-refetch
- Bouton "Voir Grafana" (lien externe)
- Dégradation gracieuse en loading ('...')

**Rôles** : SUPERADMIN, ADMIN

---

### 3.9 Stock — `View.STOCK`

**Fichier** : [`features/stock/components/StockView.tsx`](../../features/stock/components/StockView.tsx)

**Onglets niveau 1** (6 onglets, 3 cachés sur mobile) :

1. **Vue d'ensemble** _(desktop)_
2. **Boîtiers GPS**
3. **Cartes SIM**
4. **Accessoires**
5. **Mouvements** _(desktop)_
6. **SAV / RMA** _(desktop)_

**Top KPI cards (toujours visible)** : `Boîtiers en stock` · `Installés` · `RMA` · `SIMs Dispo` · `SIMs Actives` · `Accessoires`

**Onglet "Boîtiers GPS"** :

13 colonnes au total — pour ne pas déborder sur laptop 1280px, distinguer **essentielles vs masquables** :

| Catégorie                                      | Colonnes                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Essentielles** (toujours visibles)           | `ID/Référence` · `Modèle` · `IMEI` · `Statut` · `Affectation` · `Actions`                                           |
| **Masquables** (toggle via "Gérer colonnes ⚙") | `Localisation` · `Client` · `SIM (numéro)` · `Date entrée` · `Date installation` · `Date sortie` · `Info technique` |

- Tri : tous colonnes
- Pagination 10/15/25/50 items/page
- Multi-select avec "Select All" header

**Onglet "Cartes SIM"** :

- Table : `ICCID` · `Numéro (MSISDN)` · `Opérateur` · `Statut` · `Localisation` · `Affectation` · `Client` · `Date entrée` · `Date installation` · `Date sortie` · `Actions`
- Filtre : Dropdown opérateur

**Onglet "Accessoires"** : table similaire (Référence / Modèle / Type / Statut / etc.)

**Onglet "Mouvements"** :

- Table : `Date` · `Device ID` · `Type mouvement` · `Notes`
- Filter : Type (ALL / TRANSFER / ASSIGNMENT / RETURN)

**Onglet "SAV / RMA"** :

- Table : `ID/IMEI` · `Modèle` · `Type` · `Statut` · `Client` · `Date retrait`
- Actions : `SEND` / `RECEIVE_OK` / `RECEIVE_REPLACE` / `SCRAP` / `RESTORE`

**Filtres globaux** : SearchBar "Modèle, IMEI, ICCID, S/N, Numéro..." · Dropdown statut · Dropdown client · Dropdown opérateur (SIMs)

**Actions toolbar** : `[+ Ajouter]` · `[Import en bloc CSV]` (template à télécharger) · `[Exporter CSV]` · `[Exporter PDF]` · `[Gérer colonnes ⚙]`

**Modals** : AddDeviceModal, AssignModal, TransferModal, BulkImportModal, StockDetailModal, EditDeviceModal, IndividualTransferModal

**Particularités** : multi-select bulk transfer, SIM swap avec confirmation, validation schema, template CSV download

**Rôles** : TECH, ADMIN, SUPERADMIN

---

### 3.10 Support / Tickets — `View.SUPPORT` ATYPIQUE

**Fichier** : [`features/support/components/SupportViewV2.tsx`](../../features/support/components/SupportViewV2.tsx)

**Layout 2 panels** :

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header (// SUPPORT · TICKETS)                     │
│         │ ┌──────────────────────┬───────────────────────┐ │
│         │ │ Liste tickets         │ Conversation ticket    │ │
│         │ │ (40% width)           │ (60% width)            │ │
│         │ │                       │                        │ │
│         │ │ [Filtres status]      │ [Header ticket]        │ │
│         │ │ [SearchBar]           │ Sujet · Client         │ │
│         │ │                       │ Statut · Assigné       │ │
│         │ │ ─ Ticket #1234 ●      │                        │ │
│         │ │   Critique · 2j       │ ─ Bulles conversation  │ │
│         │ │ ─ Ticket #1235 ○      │   (chat-style)         │ │
│         │ │   Moyen · 5h          │ ─ ─ ─ ─ ─ ─ ─ ─ ─      │ │
│         │ │ ─ Ticket #1236 ○      │ Client : msg agent     │ │
│         │ │   Faible · 1j         │ Agent : réponse        │ │
│         │ │   ...                 │ Système : assignation  │ │
│         │ │                       │                        │ │
│         │ │ [+ Nouveau ticket]    │ [Composer réponse...]  │ │
│         │ │                       │ [Pièce jointe] [Send]  │ │
│         │ │                       │                        │ │
│         │ │                       │ Sidebar droite :       │ │
│         │ │                       │ - Détails ticket       │ │
│         │ │                       │ - Historique actions   │ │
│         │ │                       │ - SLA timer            │ │
│         │ └──────────────────────┴───────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Liste tickets (gauche)** :

- Filter chips statut : `Tous` `Ouverts` `En cours` `Résolus` `Clôturés`
- Filter dropdown : `Priorité` `Catégorie` `Date`
- SearchBar
- Items : ticket card avec dot statut + numéro + sujet + sévérité badge + temps écoulé

**Conversation (centre)** :

- Header : Sujet + statut + actions (`Assigner` `Escalader` `Fermer`)
- Chat-style : bulles différentes selon expéditeur (Client / Agent / Système)
- Indicateur "en train d'écrire..."
- Composer en bas : textarea + drop zone fichiers + emoji + bouton Send

**Sidebar droite — collapsible par défaut** (icône expand pour étendre) :

Layout par défaut = **2 colonnes** (liste tickets + chat conversation, plus large). La sidebar droite s'ouvre à la demande pour ne pas étouffer le composer chat sur 1280px laptop.

Contenu sidebar droite :

- Détails : Client + Email + Tél + Catégorie + Priorité + SLA timer
- Historique actions : timeline (créé / assigné / commenté / résolu)

**Modals** : TicketFormModal, AssignModal, EscalateTicketModal, ClosureModal (avec raison)

**Particularités** :

- Real-time WS (nouveaux messages)
- Notification typing
- Upload fichier drag-drop
- SLA timer visuel

**Rôles** : SUPPORT_AGENT, MANAGER, ADMIN, CLIENT (ses propres tickets)

---

### 3.11 Rapports — `View.REPORTS`

**Fichier** : [`features/reports/components/ReportsView.tsx`](../../features/reports/components/ReportsView.tsx)

**2 vues** :

**Vue CATALOG** (par défaut) :

- Filter category buttons : `Tous` `Activité` `Technique` `Carburant` `Performance` `Journaux` `Business` `Support`
- SearchBar "Rechercher un rapport..."
- Grid de **report cards** (4 colonnes desktop, 2 mobile)
- Chaque card : icône catégorie · titre · description · badge sévérité s'il y en a

**Catégories et rapports (~35 total)** :

1. **Activité** (6) : Synthèse · Trajets · Arrêts · Ralenti · Hors-ligne · Vitesse
2. **Technique** (7) : Synthèse · Geofencing · POI · Maintenance · Capteurs · Immobilisation · Alertes
3. **Carburant** (6) : Synthèse · Consommation · Recharges · Pertes suspectes · Efficacité · Graphiques
4. **Performance** (6) : Synthèse · Productivité · Éco-conduite · Emploi du temps · Dépenses · Heures moteur
5. **Journaux** (5) : Synthèse · Système · Événements · Erreurs · Piste d'audit
6. **Business** (5) : Synthèse · Devis · Factures · Paiements · Comptabilité
7. **Support** (4) : Synthèse · Tickets · Tickets résolus · Tickets en attente

**Vue REPORT** (après clic sur card) :

```
[← Rapports]   Catégorie > Nom rapport         [🤖 Analyser avec l'IA]
─────────────────────────────────────────────────────────────────────
Filter bar : DateRange · Véhicule · Conducteur · etc.
─────────────────────────────────────────────────────────────────────
KPIs en haut (3-5 cards)
─────────────────────────────────────────────────────────────────────
Charts (Recharts) si pertinent
─────────────────────────────────────────────────────────────────────
Table dense (colonnes selon le rapport)
─────────────────────────────────────────────────────────────────────
[Exporter PDF] [Exporter Excel] [Programmer envoi]
```

**Modals** : AiAnalysisModal (avec streaming), ScheduleReportModal

**Rôles** : ADMIN, MANAGER, FINANCE, COMMERCIAL, CLIENT (ses rapports)

---

### 3.12 Settings — `View.SETTINGS`

**Fichier** : [`features/settings/components/SettingsView.tsx`](../../features/settings/components/SettingsView.tsx)

> ⚠ Spec corrigée 2026-04-27 après lecture du code legacy. Structure réelle : **5 groupes × 20 onglets visibles** (pas 7). Voir [`BRIEFS_VAGUE2_DETAIL.md`](BRIEFS_VAGUE2_DETAIL.md) §6 pour structure exacte.
>
> ⚠ La personnalisation visuelle white-label N'EST PAS dans Settings — elle est dans **Administration > Marque blanche** (cf. §3.13).

**Layout 2 panels** : sidebar verticale gauche (5 groupes hiérarchiques) + main content.

**Structure exacte du menu (sidebar gauche)** :

```
┌─ Profil ───────────────────────────┐
│  Mon compte (User)                 │
│  Mes Opérations (Activity)         │
│  Mes notifications (Bell)          │
│  Centre d'aide (HelpCircle)        │
├─ Gestion ──────────────────────────┤
│  Utilisateurs (Users)              │
│  Sous-utilisateurs (Users)         │
│  Branche (GitBranch)               │
│  Groupe (Layers)                   │
│  Véhicules (Box)                   │
│  Conducteurs (Car)                 │
│  Commandes (Terminal)              │
├─ Règles & Alertes ─────────────────┤
│  Zones (Hexagon)                   │
│  POI (MapPin)                      │
│  Maintenance (Wrench)              │
│  Alertes (Bell)                    │
│  Règles (Calendar)                 │
│  Eco-conduite (Leaf)               │
├─ Système ──────────────────────────┤
│  Réinitialisation & Sync (RefreshCw)│
│  Configuration Support (Settings)  │
├─ À propos ─────────────────────────┤
│  À propos (Info)                   │
└────────────────────────────────────┘
```

**Pattern dominant du contenu** : 13 onglets sur 20 utilisent une **table générique** réutilisée (Utilisateurs, Sous-utilisateurs, Branches, Groupes, Véhicules, Conducteurs, Commandes, Zones, POI, Maintenance, Alertes, Règles, Eco-conduite) — toolbar (search + filter chips + dropdown filtres + bouton `+ Nouveau`) + table dense + pagination + selection multi.

**Onglets atypiques** :

- `Mon compte` : profile card (avatar, nom, email, téléphone, langue, fuseau)
- `Mes notifications` : liste notifications chronologique + filtres
- `Centre d'aide` : FAQ catégorisée + recherche + bouton support
- `Configuration Support` : préférences support, templates macros, heures d'ouverture
- `Réinitialisation & Sync` : actions danger zone (resync, vider cache, reset prefs)
- `À propos` : version + liens légaux

**Visibilité par rôle** : varie selon role (CLIENT voit Profil + Mes Opérations + À propos seulement par ex.)

**Modals** : ChangePasswordModal, Toggle2FAModal, et tous les forms (UserForm, VehicleForm, GeofenceForm, etc.) selon onglet actif

**Rôles** : tous (chaque user voit ses propres settings)

---

### 3.13 Administration — `View.ADMIN`

**Fichier** : [`features/admin/components/SuperAdminView.tsx`](../../features/admin/components/SuperAdminView.tsx)

**Layout 2 panels** (similaire à Settings) :

**Onglets niveau 1** (13 panels, 7 cachés sur mobile) :

1. **Revendeurs** _(SUPERADMIN only)_
2. **Paramètres boîtiers**
3. **Marque blanche** _(SUPERADMIN)_
4. **Équipe**
5. **Système** _(SUPERADMIN)_
6. **Journal d'audit** _(SUPERADMIN)_
7. **Centre d'aide**
8. **Documents (templates)**
9. **Messages (templates email/SMS)**
10. **Webhooks** _(SUPERADMIN)_
11. **Organisation**
12. **Intégrations** _(SUPERADMIN)_
13. **Corbeille** _(SUPERADMIN)_

**Pour le mockup** : afficher l'onglet **Revendeurs** actif (le plus représentatif).

**Onglet "Revendeurs"** :

- Table : `Nom` · `Email` · `Statut` · `Plan` · `Utilisateurs` · `Véhicules` · `Date création` · `Actions`
- Filtres : SearchBar · Status · Plan
- Actions : `[+ Ajouter revendeur]` · `[Exporter]`

**Onglet "Équipe"** :

- Table : `Nom` · `Email` · `Rôle` · `Statut` · `Permissions` · `Actions`
- Actions : `[+ Ajouter utilisateur]`

**Onglet "Journal d'audit"** :

- Table : `Date` · `User` · `Action` · `Ressource` · `Détails`
- Filtres : DateRange · User · Type action

**Onglet "Marque blanche"** : color picker + upload logo + preview live (similaire onglet Apparence Settings)

**Onglet "Webhooks"** : liste webhooks souscrits avec URL, événements, dernière exécution, statut

**Onglet "Intégrations"** : liste intégrations actives (Wave, Zoho, Mailgun, etc.) avec config

**Modals** : ResellerFormModal, StaffFormModal, WhiteLabelSettingsModal, DeviceConfigModal, WebhooksModal, IntegrationsModal, TrashRestoreModal

**Particularités** : filtrage onglets selon role (SUPERADMIN voit tout, ADMIN tenant voit moins)

**Rôles** : ADMIN, SUPERADMIN

---

### 3.14 Agenda — `View.AGENDA` ATYPIQUE

**Fichier** : [`features/agenda/components/AgendaView.tsx`](../../features/agenda/components/AgendaView.tsx)

**Layout** :

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Header (// AGENDA · AVRIL 2026)                   │
│         │ ┌─────────┬──────────────────────────────────────┐│
│         │ │ Mini    │ ┌────┬────┬────┬────┬────┬────┬────┐││
│         │ │ cal     │ │ L  │ M  │ M  │ J  │ V  │ S  │ D  │││
│         │ │         │ ├────┼────┼────┼────┼────┼────┼────┤││
│         │ │ 04/2026 │ │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │││
│         │ │ ...     │ │  ●●│  ● │    │  ● │ ●●●│    │    │││
│         │ │         │ ├────┼────┼────┼────┼────┼────┼────┤││
│         │ │ Filtres │ │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │││
│         │ │ ◉ Tous  │ │  ● │    │ ●●●│    │  ● │  ● │    │││
│         │ │ ○ Tech  │ ├────┼────┼────┼────┼────┼────┼────┤││
│         │ │ ○ Comm. │ │ ...│ ...│ ...│ ...│ ...│ ...│ ...│││
│         │ │         │ └────┴────┴────┴────┴────┴────┴────┘││
│         │ │ Agents :│                                       ││
│         │ │ ◉ Tous  │ Vue : [Mois] [Semaine] [Jour]        ││
│         │ │ ○ Yao K.│ Filtres : [Tous][Tech][Business]     ││
│         │ │ ○ Aké M.│ [+ Nouvelle intervention]             ││
│         │ │         │ [+ Nouvelle tâche]                    ││
│         │ └─────────┴──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Événements colorés selon type** :

- **TECH** (Interventions) : couleur bleue, icône `Wrench`
- **BUSINESS** (Tâches commerciales) : couleur orange, icône `Briefcase`

**Drag-drop** : déplacer event → met à jour scheduledDate (TECH) ou dueDate (BUSINESS)

**Click event** : ouvre modal détail (read-only avec bouton Edit)

**Filtres** :

- Sidebar gauche : type (Tous / Tech / Business) + agent + search
- Header : navigation `← Mois / Mois →` + jump-to-date

**Sections desktop only** : KPI cards en haut (Interventions today/week/month, Tasks pending, Technicians on duty)

**Modals** : InterventionDetailModal, InterventionFormModal, TaskFormModal

**Rôles** : TECH, COMMERCIAL, MANAGER, ADMIN

---

## 4. États visuels à représenter

**Règle** : 1 mockup principal en état **rempli normal** + 1 vignette **empty state** par écran. Les autres états (loading / error / success) sont gérés au moment de l'intégration code via les patterns DLS — pas besoin de les mockuper en première vague.

| État              | Représentation                                                    | Quand mockuper ?                        |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------- |
| **Rempli normal** | Données démo cohérentes (5-15 lignes table, KPIs réalistes, etc.) | **Toujours** (mockup principal)         |
| **Empty**         | Empty state pattern : illustration + message + CTA                | **Toujours** (vignette compacte à côté) |
| **Loading**       | Skeleton (cf. DLS §7.11) — patterns réutilisables                 | Pas mockup, géré à l'intégration        |
| **Error**         | Banner rouge + retry button                                       | Pas mockup, géré à l'intégration        |
| **Success**       | Toast vert (NotificationToast)                                    | Pas mockup, géré à l'intégration        |

---

## 5. Rôles & permissions (résumé)

Matrice simplifiée par écran :

| Écran          | CLIENT           | TECH | COMMERCIAL | FINANCE | SUPPORT | MANAGER | ADMIN | SUPERADMIN |
| -------------- | ---------------- | ---- | ---------- | ------- | ------- | ------- | ----- | ---------- |
| Dashboard      | ✓ (KPIs limités) | ✓    | ✓          | ✓       | ✓       | ✓       | ✓     | ✓          |
| Map            | ✓ (sa flotte)    | –    | –          | –       | –       | ✓       | ✓     | ✓          |
| Replay         | ✓ (sa flotte)    | –    | –          | –       | –       | ✓       | ✓     | ✓          |
| Fleet          | ✓ (sa flotte)    | –    | –          | –       | –       | ✓       | ✓     | ✓          |
| Prévente       | –                | –    | ✓          | –       | –       | ✓       | ✓     | ✓          |
| Ventes         | –                | –    | ✓          | ✓       | –       | ✓       | ✓     | ✓          |
| Comptabilité   | –                | –    | –          | ✓       | –       | ✓       | ✓     | ✓          |
| Tech           | –                | ✓    | –          | –       | –       | ✓       | ✓     | ✓          |
| Monitoring     | –                | –    | –          | –       | –       | –       | ✓     | ✓          |
| Stock          | –                | ✓    | –          | –       | –       | ✓       | ✓     | ✓          |
| Support        | ✓ (ses tickets)  | –    | –          | –       | ✓       | ✓       | ✓     | ✓          |
| Rapports       | ✓ (ses rapports) | ✓    | ✓          | ✓       | ✓       | ✓       | ✓     | ✓          |
| Agenda         | –                | ✓    | ✓          | –       | –       | ✓       | ✓     | ✓          |
| Settings       | ✓                | ✓    | ✓          | ✓       | ✓       | ✓       | ✓     | ✓          |
| Administration | –                | –    | –          | –       | –       | –       | ✓     | ✓          |

→ Le mockup principal montre le **rôle ADMIN** (le plus complet). Variantes par rôle traitées **dans la plupart des cas** pendant l'intégration via `hasPermission()`.

> **Référence détaillée** : voir [RBAC_MATRIX.md](RBAC_MATRIX.md) pour la matrice complète des 12 rôles × écrans × permissions extraites du code.

### Exception — vignette "vue CLIENT" demandée pour ces 4 écrans

Pour les écrans où la différence rôle est **structurelle** (pas juste cacher 2 colonnes), demander à Design une **petite vignette additionnelle** "vue CLIENT" qui montre ce qui disparaît :

| Écran                     | Différence ADMIN vs CLIENT                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard**             | KPIs : ADMIN voit 6 cards (Véhicules / Contrats / Revenus / Tickets / Interventions / Stock), CLIENT voit 4 cards (Véhicules / Alertes / KM jour / Tickets). Pas de revenus, pas de stock, pas d'interventions globales. |
| **Fleet**                 | CLIENT ne voit que ses véhicules (pas de filtre tenant), pas d'actions admin (assignation tracker, edit conducteur), pas de colonnes financières (mensualité).                                                           |
| **Ventes / Comptabilité** | CLIENT ne voit pas du tout — ces écrans sont staff only. **Pas de vignette nécessaire** (on cache l'écran entier).                                                                                                       |
| **Rapports**              | CLIENT voit ses propres rapports flotte uniquement (Activité, Carburant, Performance). Pas de Business / Journaux / Support.                                                                                             |

Pour les autres écrans (Comptabilité, Tech, Stock, Admin, Monitoring) : staff/admin only, pas de vignette CLIENT nécessaire.

---

## 6. Patterns transversaux à réutiliser

Pour cohérence inter-écrans :

- **DateRangeSelector** dans le header (Prévente / Ventes / Comptabilité / Rapports / Agenda) — même look partout
- **Badge sévérité** : pill coloré selon DLS §2.9 — cohérent partout (alertes, tickets, SLA)
- **Empty state** : même illustration / message / CTA pattern partout
- **3-dots actions** dans la dernière colonne des tables — menu dropdown au clic
- **Drawer latéral droit** pour les détails (Vehicle, Ticket, Intervention) — même largeur 480px
- **Bottom sheet mobile** pour quick views — même slide animation
- **Search bar** : même icône loupe + placeholder gris + clear button au focus
- **Pagination** : même footer compact (Page x/n + page selector + items/page selector)
- **KPI card** : même structure exacte (icon top-left, trend top-right, value, label, sub-label)
- **Header pattern** : breadcrumb mono `// MODULE · SECTION` toujours présent

---

## 7. Convention de labels (i18n)

Tous les labels visibles en mockup sont en **français**. Les constantes en anglais (`NEW`, `QUALIFIED`, `OPEN`, `IN_PROGRESS`) existent côté code mais ne sont jamais affichées à l'utilisateur.

### Vocabulaire figé

| Domaine              | Anglais code                                          | Français affichage                                          |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Statuts Kanban leads | `NEW` / `QUALIFIED` / `PROPOSAL` / `WON` / `LOST`     | `Nouveau` / `Qualifié` / `Proposition` / `Gagné` / `Perdu`  |
| Scoring leads        | `HOT` / `WARM` / `COLD`                               | `Chaud` / `Moyen` / `Dormant`                               |
| Statuts ticket       | `OPEN` / `IN_PROGRESS` / `RESOLVED` / `CLOSED`        | `Ouvert` / `En cours` / `Résolu` / `Clôturé`                |
| Priorité ticket      | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`                | `Faible` / `Moyenne` / `Élevée` / `Critique`                |
| Statut intervention  | `PENDING` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED` | `En attente` / `En cours` / `Terminée` / `Annulée`          |
| Statut facture       | `DRAFT` / `SENT` / `PAID` / `OVERDUE` / `CANCELLED`   | `Brouillon` / `Envoyée` / `Payée` / `En retard` / `Annulée` |
| Statut véhicule      | `MOVING` / `IDLE` / `STOPPED` / `OFFLINE`             | `En route` / `Au ralenti` / `Arrêté` / `Hors ligne`         |
| Statut RMA           | `SEND` / `RECEIVE_OK` / `RECEIVE_REPLACE` / `SCRAP`   | `Envoyé` / `Reçu OK` / `Reçu — remplacé` / `Mis au rebut`   |

→ Si Design hésite sur un label, utiliser le tableau ci-dessus comme référence.

---

## 8. Checklist Design avant validation de chaque mockup

Pour CHAQUE mockup que Design produit, toi (ou Claude Code) vérifies :

```
[ ] Palette TrackYu : brand #d96d4c (pas #F97316), idle ambre #FBBF24
[ ] Mode clair ET sombre livrés systématiquement
[ ] Header pattern présent (breadcrumb mono + titre)
[ ] Onglets visibles avec labels exacts en français (cf. §7)
[ ] 1 onglet actif rempli + autres onglets visibles non remplis
[ ] Tableau avec colonnes nommées exactement comme listées
[ ] Si table dense : essentielles vs masquables distinguées
[ ] Filtres présents (search + chips + dropdowns selon écran)
[ ] Actions toolbar avec libellés exacts en français ("+ Nouveau lead")
[ ] Couleurs statut véhicule respectées (vert/jaune/rouge/gris stricts)
[ ] Sévérité sémantique cohérente (success/danger/warning/caution/info/emerald)
[ ] Sparklines / mini-charts cohérents avec mockup Dashboard validé
[ ] 1 vignette empty state représentée
[ ] Patterns transversaux respectés (drawer, bottom sheet, KPI card)
[ ] Si écran avec différence rôle structurelle : vignette "vue CLIENT" présente
```

---

## 9. Comment générer les mockups (workflow révisé D11)

Stratégie en **3 sous-phases** au lieu de 14 mockups séquentiels.

### Phase 2a — Template universel (à produire MAINTENANT)

**Livrable** : 6 vignettes (cf. §3a "Livrables template")

**Effort Design** : 1 session focalisée

**Validation** : utilisateur valide le squelette avant qu'on l'applique aux 8 modules

→ Si écart pattern, on ajuste sur 1 template — pas sur 8 modules.

### Phase 2b — Atypiques sur mesure (en parallèle ou après 2a)

**Livrables** : 1 mockup par atypique (modes dual + vignettes selon §4 / §5)

| #   | Atypique   | Statut                | Pourquoi atypique                                      |
| --- | ---------- | --------------------- | ------------------------------------------------------ |
| 1   | Dashboard  | ✅ v1 validé en cours | KPIs + flotte temps réel + mini stats + 3 cards bottom |
| 2   | Fleet      | ✅ pilote validé      | Table + drawer permanent (pas onglet "détail")         |
| 3   | Map        | À faire               | Layout split (liste + carte Leaflet)                   |
| 4   | Replay     | À faire               | Carte + timeline player                                |
| 5   | Tickets    | À faire               | Layout chat 2 panneaux + sidebar collapsible           |
| 6   | Agenda     | À faire               | Calendrier mois/semaine/jour                           |
| 7   | Monitoring | À faire               | 6 sections empilées (CPU/Pipeline/Redis/etc.)          |

**Ordre suggéré** : Tickets → Agenda → Map → Replay → Monitoring (du plus structurant au moins).

### Phase 2c — Application template aux 8 modules

**Livrables** : pour chaque module, 1 variation du template avec :

- Libellés des onglets injectés (FR exacts, cf. §3 et §7)
- Colonnes table injectées (cf. §3 par module)
- Filtres spécifiques injectés
- KPIs spécifiques injectés
- Actions spécifiques injectées

**Effort Design** : très léger, c'est juste du content injection (pas de refonte structurelle)

**Validation** : par module, en revue groupée (4-5 modules à la fois).

### Pourquoi cette séquence

- claude.ai Design garde mieux la cohérence sur 1 template figé que sur 14 designs séparés
- Tu corriges un écart de pattern dans 1 template, pas dans 14 mockups
- Plus facile à valider visuellement (1 squelette puis 8 variations légères)
- Les atypiques peuvent être produits en parallèle (ne dépendent pas du template)

---

## 10. Ce qui est traité APRÈS livraison de tous les mockups

Pour mémoire (chantier séparé futur) :

- **Workflows métier** : enchaînements lead → contrat → facture → paiement, etc.
- **Transitions d'état** par entity (ticket OPEN → IN_PROGRESS → RESOLVED → CLOSED, etc.)
- **Matrice permissions complète** par champ (ADMIN peut éditer sensitive, MANAGER read-only, etc.)
- **Forms détaillés** : layout exact de chaque formulaire (Lead, Contract, Invoice, Intervention, Ticket)
- **Modals secondaires** : Confirm, Import, Schedule, AiAnalysis, etc.
- **Notifications** : Center, Composer, types
- **CommandPalette** Ctrl+K layout
- **AiAssistant chat** layout

---

## 11. Référence

| Document                                                   | Rôle                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| [`CHANTIER_REFONTE_DESIGN.md`](CHANTIER_REFONTE_DESIGN.md) | Charter umbrella                                                 |
| [`AUDIT.md`](AUDIT.md)                                     | État du repo                                                     |
| [`DLS.md`](DLS.md)                                         | Source canonique tokens/composants/règles                        |
| [`SCREEN_MAP.md`](SCREEN_MAP.md)                           | Inventaire 141 écrans (vagues d'intégration)                     |
| [`INTEGRATION_PLAYBOOK.md`](INTEGRATION_PLAYBOOK.md)       | Workflow Design → Code (à suivre lors de l'intégration)          |
| [`RBAC_MATRIX.md`](RBAC_MATRIX.md)                         | Matrice rôles × écrans × permissions (référence à l'intégration) |
| [`CHANGELOG.md`](CHANGELOG.md)                             | Journal versionné                                                |

---

_Brief vivant. À enrichir si Design soulève des questions structurelles non couvertes ici._
