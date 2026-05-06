# ⚠️ OBSOLÈTE — Briefs Vague 1 — Aperçu global des 12 modules restants

> **Document obsolète depuis 2026-04-27.**
>
> Stratégie initiale : aperçu rapide × 12 modules avant détail.
> En réalité, l'utilisateur préfère **détail riche pour tous les modules** (cf. CHANGELOG D21 + clarification 2026-04-27).
>
> → **Document de référence actuel** : [`BRIEFS_VAGUE2_DETAIL.md`](BRIEFS_VAGUE2_DETAIL.md) (8 modules restants en mode détail).
>
> Conservé pour traçabilité historique, ne pas utiliser pour transmettre à Design.

---

# (Contenu historique ci-dessous, ne plus utiliser)

# Briefs Vague 1 — Aperçu global des 12 modules restants

> Briefs courts à transmettre à claude.ai Design en série pour produire l'**APERÇU GLOBAL** (D21 : zoom out → zoom in).
>
> 1-2 artboards par module en mode **aperçu structurel**, pas de détail riche.
> Mode **sombre uniquement** (D18). Mode clair en batch ultérieur.
> Code Design **mutable** à l'intégration (D19) — divergences mineures éditées au moment du build.
>
> Préambule à coller avec chaque brief : voir §0 ci-dessous.
>
> Dernière mise à jour : 2026-04-26

---

## 0. Préambule universel (à coller avec chaque brief)

```
══════════════════════════════════════════════════════════════════════
PRÉAMBULE TRACKYU — à appliquer pour tout module
══════════════════════════════════════════════════════════════════════

Identité visuelle (MUSTS)
  - Brand orange : #d96d4c (terracotta) — accent, CTA
  - Statuts véhicule (jamais en accent générique) :
      moving=#22C55E · idle=#FBBF24 · stopped=#EF4444 · offline=#6B7280
  - Surfaces dark : --bg-app #0d0d0f · --bg-card #16161a · --bg-elevated #1c1c21
  - Polices : Inter (corps) + Archivo Black (display) + JetBrains Mono (mono-labels)
  - Sémantiques : success/danger/warning/caution/info/emerald
  - Labels FR systématique

Header standard (toujours)
  - Breadcrumb mono "// MODULE · SECTION"
  - Titre principal (Archivo Black ou Inter Black)
  - LIVE badge à droite (si module temps réel)

Architecture fichiers (réutiliser pattern Prévente)
  - 1 fichier HTML par module : <module>.html
  - Réutilise tc-*.jsx (template container, déjà créé pour Prévente)
  - <module>-data.jsx : données mockées
  - <module>-views.jsx : vues
  - <module>-main.jsx : container

Mode aperçu Niveau 1 (D21)
  - 1-2 artboards par module, pas de détail riche
  - Onglets visibles dans la barre (libellés exacts ci-dessous)
  - 1 sous-onglet distinctif esquissé (cf. brief module)
  - Pas de bulk actions / empty state / variants à ce niveau
```

---

# Modules à template universel (7 briefs)

## 1. VENTES — Aperçu Niveau 1

```
══════════════════════════════════════════════════════════════════════
VENTES (template universel) — APERÇU
══════════════════════════════════════════════════════════════════════

Onglets visibles : Vue d'ensemble · Clients & Tiers · Contrats · Factures

Sous-onglet distinctif à esquisser : Vue d'ensemble (KPIs CA + recouvrement
+ TOP 5 clients impayés + chart revenus 12 mois)

Header : DateRangeSelector global à droite (impacte tous les onglets)

Livrables : 1-2 artboards mode sombre
══════════════════════════════════════════════════════════════════════
```

## 2. COMPTABILITÉ — Aperçu Niveau 1 (2 artboards car densité)

```
══════════════════════════════════════════════════════════════════════
COMPTABILITÉ (template universel) — APERÇU
══════════════════════════════════════════════════════════════════════

Onglets visibles : Vue d'ensemble · Finance · Recouvrement · Budget ·
Comptabilité (journal) · Banque · Caisse · Rapports · Dépenses

Sous-onglets distinctifs à esquisser (DEUX artboards car densité) :
  Artboard A : Vue d'ensemble (KPIs CA/Encaissements/DSO + Aging Balance
               + Balance pie chart + Bank Balance evolution)
  Artboard B : Comptabilité (journal d'écritures comptables, table dense
               avec colonnes Date · Référence · Label · Compte · Débit ·
               Crédit · Journal + filtre par classe comptable 1-8)

Note : SUPERADMIN voit dropdown "Filtrer par revendeur" en haut

Livrables : 2 artboards mode sombre (Vue d'ensemble + Journal)
══════════════════════════════════════════════════════════════════════
```

## 3. TECH / INTERVENTIONS — Aperçu Niveau 1

```
══════════════════════════════════════════════════════════════════════
TECH / INTERVENTIONS (template universel) — APERÇU
══════════════════════════════════════════════════════════════════════

Onglets visibles : Vue d'ensemble · Liste · Planning · Radar · Stock · Équipe

Sous-onglet distinctif à esquisser : Planning (calendrier hebdo drag-drop
par technicien — vue semaine avec interventions colorées par statut et
groupées en colonnes par technicien)

Note : sync avec Tickets (passage IN_PROGRESS quand technicien EN_ROUTE)

Livrables : 1-2 artboards mode sombre
══════════════════════════════════════════════════════════════════════
```

## 4. STOCK — Aperçu Niveau 1

```
══════════════════════════════════════════════════════════════════════
STOCK (template universel) — APERÇU
══════════════════════════════════════════════════════════════════════

Onglets visibles : Vue d'ensemble · Boîtiers GPS · Cartes SIM · Accessoires
                   · Mouvements · SAV/RMA

Sous-onglet distinctif à esquisser : SAV/RMA (table avec actions cycle de
vie SEND / RECEIVE_OK / RECEIVE_REPLACE / SCRAP / RESTORE — pattern
distinctif vs autres modules)

KPI cards top (toujours visibles) : Boîtiers en stock · Installés · RMA ·
SIMs Dispo · SIMs Actives · Accessoires

Livrables : 1-2 artboards mode sombre
══════════════════════════════════════════════════════════════════════
```

## 5. SETTINGS — Aperçu Niveau 1

```
══════════════════════════════════════════════════════════════════════
SETTINGS (template universel — onglets verticaux) — APERÇU
══════════════════════════════════════════════════════════════════════

Particularité : onglets en sidebar gauche du contenu (pas en barre top)

Onglets visibles : Profil · Apparence · Sécurité · Notifications ·
                   Mes tickets · Synchronisation · Préférences

Sous-onglet distinctif à esquisser : Apparence (color picker accent +
preview live + upload logo + font selector + density toggle + sidebar
style + border-radius)

Note : pas de DateRangeSelector ni LIVE badge (paramètres user, pas data
temps réel)

Livrables : 1-2 artboards mode sombre
══════════════════════════════════════════════════════════════════════
```

## 6. ADMINISTRATION — Aperçu Niveau 1

```
══════════════════════════════════════════════════════════════════════
ADMINISTRATION (template universel — onglets verticaux) — APERÇU
══════════════════════════════════════════════════════════════════════

Particularité : 13 panels en sidebar gauche (similaire Settings mais
plus dense)

Onglets visibles : Revendeurs · Paramètres boîtiers · Marque blanche ·
                   Équipe · Système · Journal d'audit · Centre d'aide ·
                   Documents · Messages · Webhooks · Organisation ·
                   Intégrations · Corbeille

Sous-onglet distinctif à esquisser : Marque blanche (color picker +
preview live tenant + upload logo + nom affiché — vraiment distinctif
pour démo white-label)

Visibilité : 7 onglets cachés sur mobile (whitelabel, system, audit-logs,
templates, webhooks, integrations, trash)

Livrables : 1-2 artboards mode sombre
══════════════════════════════════════════════════════════════════════
```

## 7. RAPPORTS — Aperçu Niveau 1

```
══════════════════════════════════════════════════════════════════════
RAPPORTS (template universel — pas de tabs classiques) — APERÇU
══════════════════════════════════════════════════════════════════════

Particularité : navigation Catalog (par défaut) → Report viewer
                Pas d'onglets persistants — c'est filter buttons puis cards

Vue 1 — CATALOG (à esquisser obligatoirement) :
  - Filter category buttons : Tous · Activité · Technique · Carburant ·
    Performance · Journaux · Business · Support
  - SearchBar "Rechercher un rapport..."
  - Grid de report cards (4 cols desktop)

Vue 2 — REPORT viewer (à esquisser comme distinctif) :
  - Header avec breadcrumb retour + bouton "Analyser avec l'IA"
  - Filter bar (DateRange + véhicule + conducteur)
  - KPIs top + charts Recharts + table dense

Total ~35 rapports répartis en 7 catégories

Livrables : 2 artboards mode sombre (Catalog + Report viewer)
══════════════════════════════════════════════════════════════════════
```

---

# Modules atypiques (5 briefs)

> Les atypiques ont des layouts uniques. Aperçu = structure visible sans
> contenu détaillé.

## 8. TICKETS / SUPPORT — Aperçu Niveau 1 (atypique chat)

```
══════════════════════════════════════════════════════════════════════
SUPPORT / TICKETS (atypique — layout chat 2 colonnes) — APERÇU
══════════════════════════════════════════════════════════════════════

Layout : 2 colonnes par défaut (sidebar droite collapsible)
  - Colonne 1 (40%) : Liste tickets (filter chips statut + search +
    cards tickets avec sévérité)
  - Colonne 2 (60%) : Conversation chat ticket (header + bulles
    chat-style + composer textarea)
  - Sidebar droite collapsible (icône expand) : Détails ticket + SLA
    timer + historique actions

Pas d'onglets — vue unique avec layout split

Livrables : 1 artboard mode sombre (vue principale layout 2 colonnes
            avec ticket sélectionné)
══════════════════════════════════════════════════════════════════════
```

## 9. AGENDA — Aperçu Niveau 1 (atypique calendrier)

```
══════════════════════════════════════════════════════════════════════
AGENDA (atypique — calendrier) — APERÇU
══════════════════════════════════════════════════════════════════════

Layout : sidebar gauche (mini-cal + filtres agents/types) + main
         calendrier mois

Vue principale : Calendrier MOIS (grille 7 cols × N lignes)
  - Header navigation : ← Mois · Jour courant · Mois → · sélecteur
    Mois/Semaine/Jour
  - Events colorés : TECH (Interventions, bleu) · BUSINESS (Tâches,
    orange) — cliquables drag-drop
  - Filtres : ALL / TECH / BUSINESS · agent · search

Pas d'onglets — vue unique calendrier

Livrables : 1 artboard mode sombre (calendrier mois rempli avec events
            esquissés)
══════════════════════════════════════════════════════════════════════
```

## 10. MAP — Aperçu Niveau 1 (atypique carte)

```
══════════════════════════════════════════════════════════════════════
CARTE TEMPS RÉEL (atypique — Leaflet) — APERÇU
══════════════════════════════════════════════════════════════════════

Layout : split horizontal
  - Sidebar gauche (~280px) : Liste véhicules + search + filter chips
    statut + ordre
  - Main : Carte Leaflet (placeholder background avec quelques markers
    colorés selon statut véhicule + clusters)
  - Overlay carte (top-right) : Légende statuts · Toggle heatmap ·
    Toggle géofences · Toggle satellite/street

Bouton flottant "Replay" en bas-droite (apparaît au clic véhicule)

Pas d'onglets — vue unique carte

Livrables : 1 artboard mode sombre (vue carte avec liste véhicules à
            gauche)
══════════════════════════════════════════════════════════════════════
```

## 11. REPLAY — Aperçu Niveau 1 (atypique timeline)

```
══════════════════════════════════════════════════════════════════════
REPLAY (atypique — sub-mode de Map, timeline player) — APERÇU
══════════════════════════════════════════════════════════════════════

Layout : carte (top, ~70% hauteur) + timeline player (bottom, ~30%)

Vue principale :
  - Header : sélecteur véhicule + sélecteur date du replay
  - Carte Leaflet avec trace polyline colorée selon vitesse + marker
    animé du véhicule
  - Timeline 24h colorée par segments statut (vert mouvement / jaune
    idle / rouge stops)
  - Player controls : ⏮ ⏪ ▶ ⏩ ⏭ + sélecteur vitesse x1/x2/x4/x8
  - Liste événements jump-to (Démarrage / Arrêt / Excès de vitesse)

Pas d'onglets — vue unique replay

Livrables : 1 artboard mode sombre
══════════════════════════════════════════════════════════════════════
```

## 12. MONITORING SYSTÈME — Aperçu Niveau 1 (atypique vue sections)

```
══════════════════════════════════════════════════════════════════════
MONITORING SYSTÈME (atypique — vue unique sections) — APERÇU
══════════════════════════════════════════════════════════════════════

Layout : 6 sections empilées verticalement (pas d'onglets)

Sections (à esquisser toutes les 6, contenu placeholder OK) :
  1. Ressources serveur : 4 stat cards (CPU% · Mémoire% · Disque% ·
     Uptime) avec progress bars
  2. Pipeline GPS : 6 stat cards (TCP · Messages · Positions · Erreurs ·
     Latence · Buffer)
  3. Cache Redis : Hit rate + progress bar
  4. PostgreSQL : Pool + latence + queries
  5. WebSocket : Clients connectés + messages émis/throttled
  6. Métriques business : Véhicules actifs + alertes générées

Header : bouton "Rafraîchir 🔄" + lien externe "Voir Grafana"

Auto-refresh visuel (badge "Sync · temps réel" pulsé)

Livrables : 1 artboard mode sombre (vue unique avec 6 sections esquissées)
══════════════════════════════════════════════════════════════════════
```

---

## Synthèse — total à produire

| #   | Module         | Type                | Artboards | Distinctif esquissé           |
| --- | -------------- | ------------------- | --------- | ----------------------------- |
| 1   | Ventes         | template            | 1-2       | Vue d'ensemble (KPIs + chart) |
| 2   | Comptabilité   | template            | **2**     | Vue d'ensemble + Journal      |
| 3   | Tech           | template            | 1-2       | Planning hebdo                |
| 4   | Stock          | template            | 1-2       | SAV/RMA                       |
| 5   | Settings       | template            | 1-2       | Apparence (color picker)      |
| 6   | Administration | template            | 1-2       | Marque blanche                |
| 7   | Rapports       | template            | **2**     | Catalog + Report viewer       |
| 8   | Tickets        | atypique chat       | 1         | Layout 2 colonnes             |
| 9   | Agenda         | atypique calendrier | 1         | Calendrier mois               |
| 10  | Map            | atypique carte      | 1         | Layout split + carte          |
| 11  | Replay         | atypique timeline   | 1         | Carte + timeline player       |
| 12  | Monitoring     | atypique sections   | 1         | 6 sections empilées           |

**Total : 14-16 artboards** sur 12 fichiers HTML modulaires (cohérent avec architecture Prévente déjà établie).

---

## Ordre de production suggéré

Pour optimiser la cohérence et le rythme :

**Sous-vague A — Templates métier proches** (cohérence Vente/Compta/CRM)

1. Ventes
2. Comptabilité

**Sous-vague B — Templates ops** (cohérence Tech/Stock) 3. Tech 4. Stock

**Sous-vague C — Templates admin/config** (cohérence Settings/Admin) 5. Settings 6. Administration

**Sous-vague D — Vues spécifiques restantes** 7. Rapports 8. Tickets (atypique) 9. Agenda (atypique)

**Sous-vague E — Vues GPS-related** (cohérence visuelle entre eux) 10. Map (atypique) 11. Replay (atypique) 12. Monitoring (atypique)

Chaque sous-vague = 1-3 modules. Validation utilisateur entre sous-vagues
pour cohérence. À la fin de la Vague 1 complète : revue globale des 14
modules ensemble (Dashboard + Fleet + Prévente + 12 nouveaux) pour valider
la cohérence inter-modules avant d'attaquer le détail.

---

## Une fois la Vague 1 livrée

Selon D21 stratégie zoom out → zoom in :

1. **Validation globale** des 14 modules en bloc (cohérence inter-modules)
2. Si écarts détectés → corrections ciblées sur les modules concernés
3. **Vague 2 (Niveau 2 détail)** : par module, juste avant intégration code
   - Sous-onglets actifs remplis avec contenu réaliste
   - Champs précis, libellés exacts
   - Actions, modales, variants
4. **Phase 3 bootstrap V2** lancée en parallèle (init projet, copie sélective)
5. **Phase 4 build** : module par module, avec spec `modules/<MODULE>.md`

---

_Briefs prêts à transmettre à Design en série. Format aligné avec mémoires Claude Code (D20 briefing par couches + D21 zoom out → zoom in)._
