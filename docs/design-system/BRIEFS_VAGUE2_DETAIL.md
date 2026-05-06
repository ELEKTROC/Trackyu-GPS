# Briefs Vague 2 — Détail des 8 modules restants

> Briefs courts à transmettre à claude.ai Design pour produire les mockups détaillés des modules restants.
>
> Format : objectif + description légère + composants précis avec tous leurs éléments.
> Sur le reste, Design propose librement (cf. D10 musts/libertés/nudges + D19 code mutable + D20 briefing par couches).
>
> Mode sombre (D18 — claires en batch après).
>
> Préambule TrackYu (palette + polices + identité) à coller avec chaque brief — voir [BRIEFS_VAGUE1_APERCU.md](BRIEFS_VAGUE1_APERCU.md) §0.
>
> Dernière mise à jour : 2026-04-27 (v1.1 — atypiques fiabilisés via audit code legacy)
>
> ## Niveau de fiabilité par module
>
> | Module                                           | Source                                                      | Fiabilité                        |
> | ------------------------------------------------ | ----------------------------------------------------------- | -------------------------------- |
> | Comptabilité, Rapports, Administration, Settings | `permissionStructure.ts` (lu intégralement) + audit Explore | 🟢 Solide                        |
> | **Agenda, Monitoring, Map, Replay**              | **Audit Explore code legacy 2026-04-27**                    | 🟢 **Fiabilisé** (révision v1.1) |
>
> Si Design pose des questions sur des champs précis non couverts, je peux ré-auditer le composant legacy à la demande.

---

## 1. AGENDA

**Objectif** : Calendrier unifié interventions techniques + tâches commerciales, avec drag-drop pour reprogrammer la date.

**Description légère** : Layout vertical = header (filtres + recherche + "+ Nouveau" dropdown) + main calendrier mois (grille 7×6, events draggables sur cellules jours) + AgendaStats KPI row (caché sur mobile). Click event TECH → InterventionDetailModal. Click event BUSINESS → TaskFormModal. Drag event → met à jour `scheduledDate` ou `dueDate`.

**Composants précis** :

[Event badge TECH] (badge inline sur cellule calendrier)

- Couleur fond : **bleu primaire** (tinte technique)
- Libellé : `[nature] - [vehicleName | clientName]` (ex: "Installation - TY-042")
- Affichage hover/click : nom client, agent assigné, location, date planifiée, status
- Drag-drop pour changer date

[Event badge BUSINESS] (badge inline sur cellule calendrier)

- Couleur fond : **orange brand** (tinte business)
- Libellé : titre de la tâche
- Affichage : client, commercial assigné, échéance, priorité

[InterventionDetailModal] (déclenché click TECH event)

- Header : icône clé à molette + "Intervention [ID]" + badge créé date
- Status badge : **7 statuts** = `À planifier` / `Planifiée` / `En route` / `En cours` / `Terminée` / `Annulée` / `Reportée`
- Priority badge : **4 niveaux** = `Basse` / `Normale` / `Haute` / `Urgente`
- Nature badge (type d'intervention)
- Sections scroll : Planification (date · durée estimée · startedAt · completedAt), Client (nom · téléphone + bouton call · contact site), Véhicule (nom · immatriculation bg jaune), Technicien, Matériel utilisé (liste + quantités), Description + ticket ID lié
- Footer actions : `Bon (PDF)` · `Rapport (PDF)` (si IN_PROGRESS|COMPLETED) · `Modifier` (bleu) · `Fermer`
- Status change buttons contextuels : `En route` (violet, si PLANIFIÉE) · `Démarrer` (orange, si EN_ROUTE)

**Filtres / actions toolbar (header)** :

- Toggle 3-way : `ALL` / `TECH` / `BUSINESS` (tab style)
- Dropdown agent : `Tous les agents` + liste avec role badge `Tech` / `Com`
- SearchBar : recherche sur title, clientName, agentName, location
- Bouton `+ Nouveau` (dropdown 3 options) :
  - `Nouvelle intervention TECH`
  - `Nouvelle tâche commerciale`
  - `Nouvelle tâche`

**Particularités UX** :

- Drag & Drop events (handleEventMove)
- Animations : `fade-in 500ms` au mount, modals `slide-in-from-bottom` mobile / `zoom-in-95` desktop
- AgendaStats hidden sur mobile

---

## 2. RAPPORTS

**Objectif** : Catalogue de ~35 rapports répartis en 7 catégories + viewer pour consulter chaque rapport avec filtres + KPIs + charts + table + analyse IA.

**Description légère** : Vue catalog par défaut (filter category buttons + grid cards). Click sur card → viewer du rapport. Bouton "Analyser avec l'IA" (Gemini). Programmation envoi récurrent.

**Composants précis** :

[Report card] (dans grid catalog)

- Icône catégorie en haut (Wrench / TrendingUp / Fuel / etc.)
- Titre rapport (ex: "Synthèse Activité")
- Description courte (1-2 lignes, text-secondary)
- Badge sévérité optionnel (NOUVEAU / POPULAIRE / SENSIBLE)
- Hover state : border brand + lift

[Report viewer page]

- Header : `← Rapports` (back) + breadcrumb "Catégorie > Nom rapport" + bouton "🤖 Analyser avec l'IA" (orange)
- Filter bar : DateRangeSelector + véhicule (dropdown) + conducteur (dropdown) + filtres spécifiques
- KPIs top : 3-5 stat cards (icon + value + label + tendance)
- Section charts (Recharts) : 1-2 visualisations (area chart, bar chart, donut)
- Table dense des données (colonnes selon le rapport)
- Footer : `[Exporter PDF]` `[Exporter Excel]` `[Programmer envoi récurrent]`

---

## 3. COMPTABILITÉ

**Objectif** : Cockpit financier complet — flux de trésorerie, journal comptable, budget prévisionnel, rapports financiers, suivi des dépenses.

**Description légère** (architecture révisée D25 — 2026-04-27) : **4 onglets niveau 1** avec 2 containers ayant des sous-onglets. Recouvrement déplacé sous **Vente > Factures**.

**Onglets niveau 1** :

1. **Vue d'ensemble** — KPIs financiers + balance + aging + charts revenus 12 mois
2. **Finance** (container avec 2 sous-onglets) :
   - **Caisse** : encaissements/décaissements espèces
   - **Banque** : opérations bancaires + rapprochement
3. **Budget** : prévisionnel par catégorie + comparaison réalisé vs prévu
4. **Comptabilité** (container avec 3 sous-onglets) :
   - **Journal** : écritures débit/crédit · journaux · classes 1-8 · TVA · export FEC
   - **Rapports** : accès direct aux rapports financiers/comptables (Bilan, Balance âgée, État TVA, Journaux)
   - **Dépenses** : suivi des **dépenses de l'entreprise** (frais généraux, fournitures, services, prestataires, abonnements, etc.). À ne pas confondre avec les dépenses véhicules (qui restent dans Fleet > VehicleDetailPanel > ExpensesBlock)

**Composants précis** :

[Journal entry row] (table onglet Comptabilité)

- Date (font-mono)
- N° pièce (référence)
- Label (description écriture)
- Numéro de compte (4-8 chiffres, font-mono)
- Débit (montant XOF, aligné droite, font-mono tabular-nums) — masqué si 0
- Crédit (montant XOF, aligné droite, font-mono tabular-nums) — masqué si 0
- Journal (Code lettre : VE/AC/BQ/CA/etc.)
- Actions [⋮] : Voir détail, Modifier, Lettrer, Supprimer

[Caisse row] (sous-onglet Finance > Caisse)

- Date · Référence · Label · Mouvement (Entrée/Sortie) · Montant · Solde courant
- Header section : Solde de caisse en gros chiffre
- Boutons : `+ Encaissement` / `+ Décaissement`

[Banque row] (sous-onglet Finance > Banque)

- Date · Référence · Label · Débit · Crédit · Solde · Statut rapprochement (rapproché/non)
- Header : Solde bancaire par compte
- Boutons : `Importer relevé` (CSV/OFX) · `Lancer rapprochement`

[Payment row] (legacy Finance — déplacé sous Vente > Factures > Recouvrement)

- Référence paiement · Date · Client · Facture liée · Montant · Méthode (Virement / Wave / Espèces / Chèque) · Statut (Brouillon / Validé / Annulé) · Notes

[Balance card] (Vue d'ensemble)

- Titre : "Balance" + breadcrumb mono
- Pie chart 3 segments : Actif Immobilisé / Actif Circulant / Trésorerie
- Légende avec montants + pourcentages
- Total en bas

[Aging Balance card] (Vue d'ensemble)

- Titre : "Créances client par ancienneté"
- 4 barres horizontales : 0-30j · 31-60j · 61-90j · +90j
- Couleurs gradient vert → rouge selon ancienneté
- Montants à droite de chaque barre

---

## 4. MONITORING SYSTÈME

**Objectif** : Cockpit infrastructure temps réel : alertes Prometheus actives, ressources serveur, pipeline GPS, cache Redis, PostgreSQL, WebSocket, métriques business — pour ADMIN/SUPERADMIN.

**Description légère** : Vue unique scrollable verticale. Header avec bouton "Rafraîchir les métriques" + titre + timestamp. Sections empilées : (1) Alertes Prometheus actives EN TOP · (2) Ressources serveur · (3) Pipeline GPS · (4) Cache Redis & DB · (5) WebSocket & Business · (6) Liens externes (Grafana). Auto-refresh : 3s GPS · 5s system · 15s alerts · 30s health.

**Composants précis** :

[StatCard générique] (utilisé partout)

- Layout : icône colorée + petit label xs + grosse valeur lg bold + sous-titre optionnel + trend arrow optionnel (up/down/stable)
- **8 color variants** : blue / purple / green / orange / red / cyan / pink / yellow (couleur d'icône + couleur texte cohérentes)
- Exemples libellés réels : `CPU 45.2%` + sub `4 cores` · `Mémoire 62.1%` + sub `4.2 MB` · `Disque 78.3%` · `Connexions TCP 1247` · `Messages reçus 28K` · `Latence 12ms`

[ProgressBar inline] (Ressources serveur, Cache, DB)

- Barre fill horizontale + label texte + percent affichés (ex: `CPU usage` + `45.1%`)
- **Couleur dynamique** :
  - `> 80%` → rouge
  - sinon couleur assignée (blue/purple/orange/green selon contexte)
- Utilisé pour : CPU · Mémoire · Disque · Cache Hit Rate · DB Pool utilization

[FiringAlertRow] (section Alertes Prometheus, EN TOP)

- Severity badge : `CRITICAL` (rouge) / `WARNING` (orange) / `INFO` (cyan)
- Alert name (font-semibold)
- Duration : "depuis 2min"
- Summary truncated (avec title=full au hover)
- Runbook link (icône ExternalLink) si `annotations.runbook_url` présent
- Layout : severity badge + flex-1 content + runbook link

[ServiceHealthBadge] (top section)

- Dot coloré (vert up / rouge down)
- Format : `Prometheus · 45ms` ou `Grafana · down`
- 3 services monitorés : Prometheus / Grafana / Alertmanager

**Filtres / actions toolbar** :

- Bouton `Rafraîchir les métriques` (top right) → call refetch() React Query
- Pas de filtre — tout auto-refresh aux intervals définis ci-dessus
- Lien externe `Voir dashboard Grafana` (fin de page)

**Modals** : aucun (lecture inline ou liens externes)

**Particularités UX** :

- Real-time Socket.IO listener `admin:system-alert` → invalidation immédiate firingAlerts query (fallback 15s poll)
- Deduplication alerts groupées par fingerprint (Prometheus refires)
- Status badge global : `Aucune alerte` (vert) vs `N alertes critiques` (rouge avec compteur)
- Animation : `RefreshCw animate-spin` pendant loading, sections `fade-in` au mount
- Helpers : `formatNumber()` (1.5M / 450K), `formatBytes()` (GB/MB/KB), `formatUptime()` (3j 4h)
- **Très dense** : 6+ grid layouts, 30+ stat cards possibles affichées

---

## 5. ADMINISTRATION

**Objectif** : Cockpit superadmin pour gérer revendeurs, équipe TKY, marque blanche, intégrations, webhooks, audit logs, corbeille, templates documents/messages.

**Description légère** : Sidebar verticale gauche avec 13 panels. Chaque panel a sa propre vue. Mockup principal montre panel "Marque blanche" actif (le plus distinctif).

**Composants précis** :

[Reseller card / row] (panel Revendeurs)

- Avatar / logo revendeur (initiales si pas logo)
- Nom commercial (Logipro Transit)
- Email contact principal
- Statut (badge : Actif / Suspendu / En attente)
- Plan (Starter / Pro / Enterprise)
- Compteurs : N utilisateurs · N véhicules · N tenants sub
- Date création
- MRR (si visible : montant XOF/mois, font-mono)
- Actions [⋮] : Voir détail, Éditer, Suspendre, Impersonate

[White-label settings panel] (mockup principal)

- Section "Couleur de marque" : color picker accent + 3 dérivés générés (hover/dim/strong) + preview live (mini KPI card + button avec la nouvelle couleur)
- Section "Logo" : upload zone drag-drop + preview (logo header + logo login + favicon) + bouton "Reset"
- Section "Nom affiché" : input texte + preview (titre header app)
- Section "Police" : dropdown 7 fonts + preview live
- Section "Densité" : 3 toggles (compact / standard / comfortable) + preview table density
- Section "Sidebar style" : 3 toggles (dark / light / colored) + preview sidebar
- Section "Border radius" : slider (none / small / default / large) + preview cards
- Bouton "Sauvegarder" sticky bottom

[Audit log row] (panel Audit)

- Timestamp (date + heure, font-mono)
- User (avatar + nom)
- Action (badge : CREATE / UPDATE / DELETE / LOGIN / EXPORT)
- Ressource (entity + ID, ex: "Vehicle TY-042")
- Détails (truncate, hover pour voir tooltip)
- IP address (font-mono)
- Actions [⋮] : Voir payload complet

---

## 6. PARAMÈTRES (SETTINGS)

**Objectif** : Cockpit complet de configuration tenant — profil utilisateur, gestion entités (users/véhicules/conducteurs/branches), règles & alertes, système.

**Description légère** : Layout 2 colonnes = **sidebar verticale gauche** organisée en **5 groupes** (20 onglets visibles) + main content (varie par onglet — souvent table avec recherche/pagination). Le menu varie selon le rôle (CLIENT voit moins, ADMIN voit tout). Note : la personnalisation visuelle white-label N'EST PAS dans Settings — elle est dans **Administration > Marque blanche** (cf. §5).

**Structure exacte du menu (sidebar gauche)** :

```
┌─ Profil ──────────────────────────────────┐
│  Mon compte             (icône User)      │
│  Mes Opérations         (icône Activity)  │
│  Mes notifications      (icône Bell)      │
│  Centre d'aide          (icône HelpCircle)│
├─ Gestion ─────────────────────────────────┤
│  Utilisateurs           (icône Users)     │
│  Sous-utilisateurs      (icône Users)     │
│  Branche                (icône GitBranch) │
│  Groupe                 (icône Layers)    │
│  Véhicules              (icône Box)       │
│  Conducteurs            (icône Car)       │
│  Commandes              (icône Terminal)  │
├─ Règles & Alertes ────────────────────────┤
│  Zones                  (icône Hexagon)   │
│  POI                    (icône MapPin)    │
│  Maintenance            (icône Wrench)    │
│  Alertes                (icône Bell)      │
│  Règles                 (icône Calendar)  │
│  Eco-conduite           (icône Leaf)      │
├─ Système ─────────────────────────────────┤
│  Réinitialisation & Sync (icône RefreshCw)│
│  Configuration Support   (icône Settings) │
├─ À propos ────────────────────────────────┤
│  À propos                (icône Info)     │
└───────────────────────────────────────────┘
```

→ **20 onglets visibles** + 5 onglets "cachés" accessibles via navigation programmatique (contracts, my_interventions, clients, techs, reseller)

**Composants précis** :

[Sidebar groupe] (sidebar gauche)

- Titre groupe en label uppercase tracking-wider muted (ex: `PROFIL`, `GESTION`)
- Items du groupe sous le titre : icône + label + dot indicateur si nouvelles données

[Onglet Mon compte] (default)

- Avatar (upload click) + initiales fallback
- Nom complet, Email, Téléphone, Langue préférée, Fuseau horaire
- Bouton "Sauvegarder"

[Onglet table générique] (utilisé par Utilisateurs, Sous-utilisateurs, Véhicules, Conducteurs, Branches, Groupes, Zones, POI, Alertes, Maintenance, Règles, Eco-conduite, Commandes)

- Toolbar : SearchBar + filter chips + dropdown filtres + bouton `+ Nouveau [entité]`
- Table dense avec colonnes adaptées à l'entité
- Colonnes triables (SortableHeader)
- Pagination footer
- Actions ligne [⋮] : Voir / Modifier / Supprimer
- Selection multi : checkbox + bandeau bulk actions au-dessus

[Onglet Mes notifications]

- Liste notifications reçues (chronologique, lue/non-lue badge)
- Filtres : Tout / Non lues / Critiques
- Actions : marquer lu, supprimer

[Onglet Centre d'aide]

- Articles FAQ catégorisés
- Recherche
- Bouton "Contacter le support"

[Onglet Configuration Support]

- Préférences support (email contact, langue, notifications)
- Templates de réponse macros
- Heures d'ouverture support

[Onglet Réinitialisation & Sync]

- Bouton "Resynchroniser les données" (danger zone)
- État dernière sync : timestamp + statut
- Bouton "Vider le cache local"
- Bouton "Réinitialiser les préférences"

[Onglet À propos]

- Logo TrackYu + version + build date
- Liens : CGU / Mentions légales / Politique RGPD
- Crédits techniques

**Particularités UX** :

- Sidebar collapsible sur mobile (drawer)
- Mockup principal recommandé : afficher onglet `Véhicules` actif rempli (bonne représentativité du pattern table générique)
- Onglet visible dépend du rôle (CLIENT voit Profil + Mes Opérations + À propos seulement par exemple)

---

## 7. CARTE EN DIRECT (MAP)

**Objectif** : Suivi temps réel de la flotte sur carte Leaflet avec markers colorés selon statut, clustering, heatmap, géofences, et basculement vers Replay.

**Description légère** : Layout split desktop = `VirtualVehicleList` sidebar gauche (cards scrollable) + main `MapContainer` Leaflet. Sur mobile = bottom sheet draggable (3 états : `25vh` collapsed / `50vh` half / `85vh` full) qui contient la liste + click marker → ouvre VehicleDetailPanel inside. Toolbar overlay top-left.

**Composants précis** :

[VehicleMarker DivIcon] (custom Leaflet)

- Taille : **34×34px**
- Icône type véhicule (emoji) : `🚗` voiture · `🚛` camion · `🚌` bus · `🏍️` moto
- **Heading arrow** rotated dynamiquement (data-arrow DOM transform) si statut MOVING — `transform 1s ease` pour smooth rotation
- Couleur selon statut : `MOVING #22c55e (green)` · `IDLE #f97316 (orange)` · `STOPPED #ef4444 (red)` · `OFFLINE #6b7280 (gray)`
- Glow drop-shadow `${color}66` (66 = opacity hex)
- Cache LRU 400 items par clé `status-type-name`

[ClusterIcon] (zoom out)

- Cercle bleu (32×32) avec nombre blanc bold au centre
- Reactive clustering via MarkerClusterGroup
- Animation zoom-in au click

[Vehicle list card] (sidebar gauche desktop ou bottom sheet mobile)

- VirtualVehicleList scrollable
- Cards : statut dot + immatriculation + alias + statut badge inline + vitesse compact + adresse truncate + conducteur initiales
- Click → centre carte sur véhicule + ouvre marker popup

[StopPopupContent] (mode Replay uniquement)

- Icône emoji : `🅿️` (STOP) ou `⏸️` (IDLE)
- Titre : `Arrêt moteur #1` ou `Ralenti #1`
- Temps : `🕐 09:30 → 09:45` + `⏱ 15min 32s`
- Adresse géocodée live (avec spinner `Géocodage…` pendant fetch) ou fallback `lat, lng`
- Couleur header : rouge `#dc2626` (STOP) / orange `#f97316` (IDLE)

[ReplayMarkerIcon] (pendant playback)

- Cercle blanc 40px bordé de couleur statut + emoji type véhicule
- Label dessous : `immat | 45 km/h | 12.5km`
- Arrow pointing heading si MOVING
- Speed color coding : `≥90 red` · `≥50 orange` · `≥10 green` · `<10 gray`

[Toolbar overlay top-left] (boutons icon-btn)

- `Eye / EyeOff` : toggle "Afficher / Masquer les étiquettes"
- `Refresh` : rafraîchir positions
- `+` : ajouter véhicule
- `Sliders` : "Filtres avancés"
- Toggle Heatmap layer
- `Search` : recherche localisation (géocodage inverse)
- Toggle Géofences (afficher/masquer zones définies)

**Modals déclenchables** :

- `MobileVehicleBottomSheet` (mobile only) : click marker → sheet state, drag handle + VehicleDetailPanel inside
- `ReplayControlPanel` : click bouton "Replay" sur marker popup → ouvre panel collapsible avec 7 onglets

**Particularités UX** :

- Markers NON draggables (positions fixes from backend)
- Mobile bottom sheet draggable (touch-drag from handle, snap auto)
- Pinch zoom natif Leaflet
- Real-time : Socket.IO update positions véhicules continuously, markers re-render on location change
- **GPS Drift filter** : `filterDriftGPS()` exclut points `<2 km/h ET <50m` distance (utilisé en replay)
- Geocoding live à la demande (caché côté composant)

---

## 8. REPLAY

**Objectif** : Rejouer historique d'un véhicule sur période choisie avec analytics par onglets (stats / arrêts / trajets / événements / vitesse / carburant / ralenti).

**Description légère** : Panel collapsible (left desktop / bottom mobile). Header = sélecteur véhicule + date range picker. Player controls. Timeline segments colorés représentant les phases du trajet. **7 onglets** d'analyse avec contenu spécifique. Map en parallèle suit la position via prop `progress` (ReplayFollower).

**Composants précis** :

[PlaybackControls]

- Bouton Play/Pause toggle
- Speed selector dropdown : `1x` · `2x` · `4x` · `8x`
- Slider progression 0-100%
- Affichage temps courant : `14:23:42 / 23:59:59` (font-mono)

[TimelineSegment colored] (sous slider)

- Blocs colorés selon phase véhicule :
  - **MOVING** vert `#22c55e` (en conduite)
  - **IDLE** orange `#f97316` (moteur tournant, vitesse=0)
  - **STOPPED** rouge `#ef4444` (moteur coupé)
  - **OFFLINE** gris `#94a3b8` (hors ligne)
  - **SPEEDING** rouge flash (excès vitesse)
  - **REFILL** vert tick (recharge carburant)
  - **FUEL_LOSS** rouge cross (perte carburant)
- Chaque bloc clickable → jumpTo position
- Hover : tooltip (time range + type)

[7 onglets contenu] (tab switcher)

- `Résumé` (STATS) : stat cards key metrics — distance · duration · drivingTime · stoppedTime · idleTime · avgSpeed · maxSpeed · stopCount · speedingEvents
- `Arrêts` (STOPS) : StopRow avec emoji `🅿️` + duration badge + startTime → endTime + adresse géocodée + bouton "sur carte" — bg dim-red
- `Trajets` (TRIPS) : TripRow avec start location → arrow → end location + distance + duration + avg/max speed (server-fetched `/fleet/vehicles/:id/trips`)
- `Événements` (EVENTS) : EventRow avec icône speedometer + timestamp + speed + limit + excess duration (excès de vitesse principalement)
- `Vitesse` (SPEED) : graphe / liste vitesses
- `Carburant` (FUEL) : Recharts AreaChart (X = time, Y = fuel %) + refill spikes verts + loss spikes rouges
- `Ralenti` (IDLE) : StopRow bg dim-orange (pareil que Arrêts mais pour idle)

[Trace polyline] (sur carte, gérée par MapView en parallèle)

- Couleur dégradée selon vitesse
- Marker animé véhicule qui se déplace au play
- Markers fixes aux événements (Start / Stop / Idle / Speeding)
- ReplayFollower : pan smooth de la carte sur position véhicule (margin 20%)

**Filtres / actions toolbar** :

- Date range picker (start/end dates ou PERIOD_PRESETS)
- Vehicle selector dropdown (avec search)
- Tab switcher 7 boutons (cf. ci-dessus)
- **Boutons export** :
  - `Télécharger PDF` (via html2canvas screenshot)
  - `Télécharger KML`
  - `Télécharger GPX`
  - `Imprimer`

**Modals** : aucun (date picker inline, pas modal)

**Particularités UX** :

- Timeline segments interactifs (click = jump, hover = tooltip)
- Real-time scrubbing via slider pendant playback
- ReplayFollower : pan smooth carte sur position véhicule
- GeocodedCell : cache adresses + retry si vide
- GPS drift filter : `filterDriftGPS()` retire points `<2 km/h ET <50m`
- Stops/Events click depuis Map → ouvre panel + auto-select tab pertinent (callback `externalStopSelect`)
- Helpers : `calculateDistance()` (Haversine), `formatDuration()` (`1h 23min`)

---

## Synthèse — total à produire

| #   | Module         | Composants précis listés                       | Estimation artboards |
| --- | -------------- | ---------------------------------------------- | -------------------- |
| 1   | Agenda         | Event TECH · Event BUSINESS · Mini-calendar    | 1-2                  |
| 2   | Rapports       | Report card · Report viewer                    | 2                    |
| 3   | Comptabilité   | Journal entry · Payment row · Balance · Aging  | 2                    |
| 4   | Monitoring     | Stat card · Progress card · Health indicator   | 1                    |
| 5   | Administration | Reseller card · White-label panel · Audit log  | 1-2                  |
| 6   | Settings       | Profile · Security · Apparence · Notifications | 1-2                  |
| 7   | Map            | Marker · Popup · Sidebar item · Controls       | 1-2                  |
| 8   | Replay         | Timeline · Player · Event item · Trace         | 1                    |

→ ~14-18 artboards mode sombre. Mode clair en batch après validation.

---

_Format consistent avec D20 (briefing par couches : on cadre + précise composants clés, le reste = liberté Design)._
