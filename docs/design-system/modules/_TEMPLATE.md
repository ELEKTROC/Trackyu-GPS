# Module Spec — _TEMPLATE_

> **Gabarit pour créer un nouveau module spec.**
> Copier ce fichier en `MODULE_NAME.md` (en majuscules, ex: `FLEET.md`, `TICKETS.md`).
> Remplir chaque section.
>
> **Objectif** : un fichier auto-suffisant qui permet à n'importe quelle session Claude de **construire le module de A à Z** sans avoir à lire 10 autres docs.

---

## 0. Identité du module

| Champ                   | Valeur                                                         |
| ----------------------- | -------------------------------------------------------------- |
| **Nom court**           | (ex: Fleet)                                                    |
| **Nom complet**         | (ex: Gestion de flotte)                                        |
| **View enum**           | (ex: `View.FLEET`)                                             |
| **URL cible V2**        | (ex: `/fleet`)                                                 |
| **Type**                | 🟦 Template universel · 🟪 Atypique                            |
| **Statut construction** | ⬜ À FAIRE · 🟧 EN COURS · 🟩 CONSTRUIT · 🧪 STAGING · ✅ PROD |
| **Priorité**            | P0 (pilote) · P1 · P2 · P3                                     |
| **Dépendances**         | Quels autres modules doivent être construits avant celui-ci ?  |

---

## 1. Mockup Design

### Lien vers les mockups

- Mockup Dark ADMIN : (lien ou capture)
- Mockup Light ADMIN : (lien ou capture)
- Vignette CLIENT : (si applicable)
- Vignette empty state : (lien ou capture)
- Code source Design (HTML/JSX) : (lien ou collé en `_design-source/MODULE_NAME.html`)

### Captures de référence

(Insérer screenshots ou liens)

---

## 2. Routes & navigation

### Routes V2 (React Router v7)

```tsx
// Exemple
{
  path: '/fleet',
  element: <FleetPage />,
  children: [
    { path: ':vehicleId', element: <VehicleDetailPanel /> }
  ]
}
```

### Triggers de navigation entrantes

- Sidebar nav item
- Search Ctrl+K (CommandPalette)
- Notifications (clic sur alerte véhicule)
- Dashboard (clic sur KPI)
- Map (clic sur marker)

### Triggers sortants

- Vers `/map?vehicleId=X` (clic sur "Voir sur carte")
- Vers `/replay?vehicleId=X&date=Y` (bouton Replay)
- Vers `/fleet/:vehicleId` (ouverture drawer détail)

---

## 3. Data structure

### Types TypeScript (depuis `types/` legacy à copier)

```ts
// Exemple
import type { Vehicle, FleetMetrics } from '@/types';
```

Liste des types nécessaires :

- (ex: `Vehicle`, `Driver`, `Alert`)

### Endpoints backend consommés

| Méthode | Endpoint                                  | Rôle                |
| ------- | ----------------------------------------- | ------------------- |
| GET     | `/api/v1/fleet/vehicles`                  | Liste véhicules     |
| GET     | `/api/v1/fleet/vehicles/:id`              | Détail véhicule     |
| GET     | `/api/v1/fleet/vehicles/:id/subscription` | Abonnement véhicule |
| POST    | `/api/v1/fleet/vehicles`                  | Créer véhicule      |
| ...     | ...                                       | ...                 |

### Hooks data (React Query)

```ts
useVehicles(); // GET /api/v1/fleet/vehicles
useVehicle(id); // GET /api/v1/fleet/vehicles/:id
useCreateVehicle(); // POST mutation
useUpdateVehicle(id); // PUT mutation
useDeleteVehicle(id); // DELETE mutation
```

### WebSocket events consommés (si applicable)

| Event              | Payload                                  | Effet                          |
| ------------------ | ---------------------------------------- | ------------------------------ |
| `vehicle:position` | `{ vehicleId, lat, lng, speed, status }` | MAJ marker carte + ligne table |
| `vehicle:alert`    | `{ vehicleId, severity, type }`          | Toast + badge compteur         |

---

## 4. RBAC — qui voit quoi

Référence : [`../RBAC_MATRIX.md`](../RBAC_MATRIX.md)

### Permissions requises

| Élément                     | Permission                        | Rôles autorisés                       |
| --------------------------- | --------------------------------- | ------------------------------------- |
| Voir l'écran                | `VIEW_FLEET`                      | Tous sauf TECH                        |
| Créer véhicule              | `CREATE_VEHICLES`                 | ADMIN, MANAGER, AGENT_TRACKING        |
| Éditer véhicule             | `EDIT_VEHICLES`                   | ADMIN, MANAGER, AGENT_TRACKING        |
| Supprimer véhicule          | `DELETE_VEHICLES`                 | ADMIN                                 |
| Voir colonne mensualité     | `VIEW_FINANCE`                    | ADMIN, MANAGER, COMMERCIAL, COMPTABLE |
| Voir IMEI / SIM (sensitive) | `MANAGE_DEVICES` (staff TKY only) | SUPERADMIN, TECH                      |

### Différences visuelles par rôle

#### Vue ADMIN (mockup principal)

- Tous les filtres visibles
- Toutes les colonnes visibles
- Actions admin disponibles

#### Vue CLIENT (vignette)

- Pas de dropdown "Filtrer par tenant"
- Pas de boutons "Assigner tracker" / "Éditer conducteur"
- Pas de colonne "Mensualité"
- Scope = sa flotte uniquement (filtre tenant_id côté backend)

### Isolation tenant

- CLIENT voit uniquement sa flotte (filtre backend par tenant_id)
- RESELLER_ADMIN voit ses sub-tenants
- SUPERADMIN voit cross-tenant (avec dropdown sélecteur)

---

## 5. i18n — clés à utiliser

Référence : `i18n/locales/fr.json` (source) · `en.json` · `es.json`

### Clés du module

```json
{
  "fleet": {
    "title": "Gestion de flotte",
    "subtitle": "{{count}} véhicules · {{moving}} en route · {{idle}} au ralenti",
    "actions": {
      "newVehicle": "+ Nouveau véhicule",
      "import": "Importer CSV",
      "export": "Exporter",
      "manageColumns": "Gérer colonnes"
    },
    "filters": {
      "search": "Rechercher (immat, alias, conducteur)...",
      "all": "Tous",
      "moving": "En route",
      "idle": "Au ralenti",
      "stopped": "Arrêté",
      "offline": "Hors ligne"
    },
    "columns": {
      "plate": "Immat / Alias",
      "status": "Statut",
      "speed": "Vitesse",
      "position": "Position",
      "fuel": "Carburant",
      "driver": "Conducteur",
      "score": "Score conduite",
      "lastUpdate": "Dernière maj"
    },
    "drawer": {
      "tabs": {
        "activity": "Activité",
        "behavior": "Comportement",
        "alerts": "Alertes",
        "gps": "GPS",
        "fuel": "Carburant",
        "maintenance": "Maintenance",
        "expenses": "Dépenses"
      },
      "actions": {
        "replay": "Replay",
        "edit": "Modifier"
      }
    }
  }
}
```

→ Clés à ajouter / vérifier dans les 3 langues avant intégration.

---

## 6. Structure UI

### Layout général

(Description du layout : sidebar + header + main + drawer ?)

### Composants principaux à construire

| Composant            | Source              | Notes                     |
| -------------------- | ------------------- | ------------------------- |
| `FleetPage`          | new                 | Container principal       |
| `FleetTable`         | new (depuis Design) | Table dense avec colonnes |
| `VehicleDetailPanel` | new (depuis Design) | Drawer droit              |
| `ActivityBlock`      | new                 | Bloc onglet Activité      |
| `BehaviorBlock`      | new                 | Bloc onglet Comportement  |
| ...                  | ...                 | ...                       |

### Composants partagés à utiliser (depuis components/ui/ V2)

| Composant    | Rôle             |
| ------------ | ---------------- |
| `Button`     | CTA standard     |
| `Card`       | Cartes détail    |
| `Badge`      | Statuts          |
| `SearchBar`  | Recherche        |
| `Pagination` | Pagination table |
| ...          | ...              |

---

## 7. Patterns DLS consommés

Référence : [`../DLS.md`](../DLS.md)

- `.btn` (variantes primary / ghost / etc.)
- `.card`
- `.filter-chip` / `.filter-chip.active`
- `.icon-btn`
- `.toolbar`
- `.page-title` / `.page-subtitle`
- `.section-title`
- `.th-base` / `.td-base` / `.tr-hover`
- `.badge-moving` / `.badge-idle` / `.badge-stopped` / etc.
- KPI card pattern
- Drawer pattern (480px right)

### Patterns nouveaux émergeant de ce module

(Si Design propose un pattern nouveau, l'expliciter ici puis le promouvoir au DLS au moment du commit final)

---

## 8. États visuels

| État                     | Comportement                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| **Loading initial**      | Skeleton sur 5-10 lignes table + KPI cards                       |
| **Loading after action** | Spinner inline sur action en cours                               |
| **Empty**                | EmptyState illustration + "Aucun véhicule" + CTA "+ Nouveau"     |
| **Error fetch**          | Banner rouge "Impossible de charger" + retry                     |
| **No results filter**    | "Aucun résultat pour cette recherche" + bouton "Effacer filtres" |
| **Selection multi**      | Bandeau bulk actions au-dessus de la table                       |

---

## 9. Tests à prévoir

### Tests unitaires

- [ ] Composants atomiques (Button, Card, Badge spécifiques)
- [ ] Helpers utils

### Tests d'intégration

- [ ] Hooks React Query (mocked API)
- [ ] Filtrage table
- [ ] Pagination
- [ ] Sélection multi + bulk actions

### Tests E2E (manuel pour bootstrap)

- [ ] Login ADMIN → voir tous véhicules
- [ ] Login CLIENT → voir uniquement sa flotte
- [ ] Créer véhicule → apparaît dans la table
- [ ] Cliquer véhicule → drawer s'ouvre avec onglets
- [ ] Cliquer "Voir sur carte" → navigue vers /map?vehicleId=X
- [ ] Cliquer "Replay" → navigue vers /replay?vehicleId=X
- [ ] Toggle clair/sombre → tout reste lisible

---

## 10. Checklist build (depuis INTEGRATION_PLAYBOOK)

```
[ ] Mockup Design réceptionné et confronté à DLS (palette, typo, statuts)
[ ] Module spec à jour (cette page)
[ ] Composant créé dans trackyu-front-V2/features/fleet/
[ ] Hooks data branchés (useVehicles, useVehicle, etc.)
[ ] Routes React Router configurées
[ ] RBAC guards appliqués (hasPermission wrappers)
[ ] i18n clés intégrées (FR/EN/ES)
[ ] WebSocket events branchés (si applicable)
[ ] Tests unitaires écrits
[ ] Tests E2E manuels passés
[ ] Mode clair ET sombre testés
[ ] Au moins 2 rôles testés (ADMIN + CLIENT)
[ ] Aucun hex hardcodé (passe par tokens DLS)
[ ] Aucun slate-* / gray-* / zinc-* introduit
[ ] Performance OK (virtualisation si > 100 lignes)
[ ] Accessibilité OK (focus, contraste WCAG AA)
[ ] Module spec mis à jour avec statut → 🟩 CONSTRUIT
[ ] STATE.md mis à jour
[ ] CHANGELOG.md entrée datée
```

---

## 11. Déploiement

### Bootstrap initial

- Module activé en mode **dev local** (`npm run dev`)

### Staging

- Quand staging V2 sera dispo (Phase 3+) : déploiement spécifique par module

### Prod

- Pas avant **parité fonctionnelle totale** (D16). DNS reste sur legacy.

---

## 12. Notes & décisions spécifiques au module

(Notes libres : choix de design, dérogations DLS, points d'attention, TODOs spécifiques, etc.)

---

## 13. Changelog du module

| Date       | Action                    | Par              |
| ---------- | ------------------------- | ---------------- |
| YYYY-MM-DD | Création spec             | Claude session X |
| YYYY-MM-DD | Mockup Design réceptionné | utilisateur      |
| YYYY-MM-DD | Construction démarrée     | Claude session Y |
| YYYY-MM-DD | Build complet             | Claude session Z |
| YYYY-MM-DD | Validation utilisateur    | utilisateur      |
| YYYY-MM-DD | Activé en V2 prod         | Claude session W |

---

_Spec auto-suffisante. Une session Claude lit ce fichier + STATE.md + CLAUDE.md, et a tout pour construire le module._
