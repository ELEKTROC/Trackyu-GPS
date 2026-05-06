# Audit Complet — `/features/tech/`

> **Date** : 2026-03-10  
> **Scope** : 25 fichiers — composants, partials, monitoring, hooks, services, constants, utils  
> **Mode** : READ-ONLY — Aucune correction appliquée

---

## Résumé Exécutif

| Sévérité        | Nombre | Description                                                            |
| --------------- | ------ | ---------------------------------------------------------------------- |
| 🔴 CRITIQUE     | 5      | Runtime crashes, native dialogs, raw fetch, dead buttons               |
| 🟠 MOYEN        | 14     | `as any` abusifs, empty catch, `useMemo` mal utilisé, hardcoded values |
| 🟡 MINEUR       | 6      | Code mort, imports inutilisés, duplication logique                     |
| 🔵 AMÉLIORATION | 7      | Composants trop longs, accessibilité, séparation responsabilités       |
| **Total**       | **32** |                                                                        |

**Lignes totales analysées : ~9 500 lignes sur 25 fichiers**

---

## 🔴 CRITIQUE (5 issues)

### C1 — `AlertsConsole.tsx` L290 — Native `confirm()` au lieu de `useConfirmDialog`

`handleDeleteAlertConfig` utilise le `confirm()` natif du navigateur, bloquant l'UI. Tous les autres fichiers du module (InterventionList, TechSettingsPanel) utilisent correctement `useConfirmDialog`.

```typescript
// AlertsConsole.tsx:290
const handleDeleteAlertConfig = async (config: AlertConfig) => {
    if (!confirm(`Supprimer la règle "${config.name}" ?`)) return;  // ❌ confirm() natif
```

**Impact** : Incohérence UI, bloque le thread principal, pas de dark mode.

---

### C2 — `OfflineTrackerList.tsx` L263 — `window.confirm()` natif dans bulk action

```typescript
// OfflineTrackerList.tsx:263
const handleBulkAction = async (action: 'PING' | 'TICKET') => {
    // ...
    if (!window.confirm(confirmMsg)) return;  // ❌ window.confirm() natif
```

**Impact** : Même problème que C1, plus critique car l'opération est en masse.

---

### C3 — `UserMonitoring.tsx` L111 — Raw `fetch()` bypasse `api.ts`

`handleResetPassword` utilise un `fetch()` brut avec construction manuelle des headers auth, violant le pattern centralisé `api.ts`.

```typescript
// UserMonitoring.tsx:111-115
const handleResetPassword = async (user: EnhancedUser) => {
    // ...
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
    });
```

**Impact** : Ne fonctionne pas en mode mock (`VITE_USE_MOCK=true`), pas de gestion token refresh, pas d'intercepteurs.

---

### C4 — `AnomalyDashboard.tsx` L232, L251 — Boutons dead (pas de `onClick`)

Deux boutons CTA dans le panneau "Recommandations IA" n'ont aucun handler :

```tsx
// AnomalyDashboard.tsx:232
<button className="w-full py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors">
    Activer Mode Vol     <!-- ❌ Pas de onClick -->
</button>

// AnomalyDashboard.tsx:251
<button className="w-full py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 transition-colors">
    Voir Graphique Jauge  <!-- ❌ Pas de onClick -->
</button>
```

**Impact** : UX trompeuse — l'utilisateur clique et rien ne se passe.

---

### C5 — `MonitoringView.tsx` L210 — Card cliquable avec handler vide

```tsx
// MonitoringView.tsx:210
<Card className="p-4 border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
```

La KPI "En Ligne" affiche `cursor-pointer` + `hover:shadow-md` mais le `onClick` est `() => {}`. Tous les autres KPI cards naviguent vers un onglet (`onClick={() => setActiveTab('OFFLINE')}`).

**Impact** : UX incohérente, l'utilisateur s'attend à une navigation.

---

## 🟠 MOYEN (14 issues)

### M1 — `OfflineTrackerList.tsx` L125 — `useMemo` utilisé comme side-effect

```typescript
// OfflineTrackerList.tsx:125
useMemo(() => {
  setCurrentPage(1);
}, [searchTerm, filter]);
```

`useMemo` ne doit jamais contenir de side-effects. Devrait être `useEffect`.

**Impact** : Comportement imprévisible dans les futures versions de React (Strict Mode, Concurrent Mode).

---

### M2 — `TechView.tsx` L102, L216, L623 — `as any` sur données critiques

```typescript
// TechView.tsx:102
return [{ id: 'unassigned', name: 'Non assigné', email: '', role: 'TECHNICIAN' } as any];

// TechView.tsx:216
const [viewMode, setViewMode] = useState<...>(initialViewMode as any);

// TechView.tsx:623
<Tabs tabs={TECH_TABS} activeTab={viewMode} onTabChange={(id) => setViewMode(id as any)} />
```

---

### M3 — `InterventionList.tsx` — 7 occurrences de `as any` (L103, L152, L170, L308, L443, L444, L572)

Principalement sur les champs de tickets (`ticket.number`, `ticket.title`) et l'import CSV. Indique des types `Ticket` et `InvoiceItem` incomplets.

---

### M4 — `InterventionTechTab.tsx` — 7 occurrences de `as any` (L36, L86, L87, L126, L286×2, L566)

Accès à des propriétés non typées (`vehicle.last_update`, `formData.simNumber`, `formData.wwPlate`). Ces propriétés existent en runtime mais ne sont pas dans les interfaces TypeScript.

---

### M5 — `InterventionRequestTab.tsx` — 5 occurrences de `as any` (L102, L142×2, L221, L298, L425)

Cast de valeurs de `<select>` et accès à des propriétés non typées de Ticket.

---

### M6 — `TechSettingsPanel.tsx` L858, L887 — `(slaConfig as any)[item.key]` accès dynamique

```typescript
// TechSettingsPanel.tsx:858
value={(slaConfig as any)[item.key]}
```

Accès dynamique indexé contournant le typage. Devrait utiliser un mapping typé ou `keyof SlaConfig`.

---

### M7 — `AlertsConsole.tsx` L233, L241 — `as any` sur addTicket / addIntervention

```typescript
addTicket({ ... } as any);
addIntervention({ ... } as any);
```

Les objets passés ne correspondent pas exactement aux types attendus. Risque de données manquantes en runtime.

---

### M8 — `OfflineTrackerList.tsx` L224, L245 — `as any` sur addTicket / api.commands.create

Mêmes types de casts que M7, appliqués lors de création de tickets et commandes.

---

### M9 — `useInterventionForm.ts` L46 — `technicians: any[]` paramètre non typé

```typescript
interface UseInterventionFormProps {
    // ...
    technicians: any[];  // ❌ Devrait être User[] ou Technician[]
```

---

### M10 — `deviceService.ts` — 4 variables `response` inutilisées (L13, L31, L49, L71)

```typescript
const response = await api.post(`/devices/${imei}/command`, { type: 'PING' });
// `response` n'est jamais utilisé dans les 4 fonctions
```

---

### M11 — `deviceService.ts` — Valeurs hardcodées (APN, IP, port)

```typescript
// deviceService.ts
const apn = 'orange.ci'; // Hardcodé au lieu de config
const ip = '148.230.126.62'; // Hardcodé
const port = 5000; // Hardcodé
```

Devrait être configurable ou venir d'un fichier de configuration.

---

### M12 — `SystemMetricsPanel.tsx` — URL Grafana hardcodée

```tsx
<a href="http://148.230.126.62:3000" target="_blank" rel="noopener noreferrer">
```

URL de production hardcodée dans le composant. Devrait utiliser une variable d'environnement.

---

### M13 — `OfflineTrackerList.tsx` — Commentaires stockés uniquement en localStorage

```typescript
const COMMENTS_STORAGE_KEY = 'offline_tracker_comments';
const loadComments = (): VehicleComment[] => {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
```

Les commentaires véhicules offline ne sont jamais persistés côté serveur. Perte de données au clear de cache ou changement de navigateur.

---

### M14 — `useInterventionForm.ts` L560-561 — `(formData as any).observations` propriété fantôme

```typescript
? `Vérifications : ${checklistItems.join(', ')}. ${(formData as any).observations || ''}`
: (formData as any).observations
```

La propriété `observations` n'existe pas dans le type `Intervention`. Toujours `undefined` en runtime.

---

## 🟡 MINEUR (6 issues)

### N1 — `AlertsConsole.tsx` L486-494 — Condition dupliquée (code mort)

Dans le tab `autoAlerts`, deux blocs consécutifs testent `filteredAlertConfigs.length === 0`. Le second est **inatteignable** :

```tsx
{filteredAlertConfigs.length === 0 ? (
    // ... "Aucune règle configurée"
) : filteredAlertConfigs.length === 0 ? (  // ❌ Toujours false ici
    // ... "Aucune règle ne correspond" — CODE MORT
) : (
```

La logique voulue était probablement :

- Si `alertConfigs.length === 0` → "Aucune règle configurée"
- Sinon si `filteredAlertConfigs.length === 0` → "Aucune règle ne correspond aux filtres"

---

### N2 — `AnomalyDashboard.tsx` — Import inutilisé `Signal`

`Signal` est importé de lucide-react mais n'est pas utilisé dans le composant.

---

### N3 — `InterventionTechTab.tsx` L500-510 — SMS hardcodé `smslink123456`

```tsx
<button onClick={() => copyToClipboard('smslink123456', 'LOC')}>smslink123456</button>
```

Commande SMS de localisation hardcodée. Devrait être dynamique selon le protocole du tracker.

---

### N4 — `OfflineTrackerList.tsx` — Duplication de la logique offline

La logique de détection offline (hours calculation + bucket classification) est dupliquée entre `MonitoringView.tsx` et `OfflineTrackerList.tsx`. `MonitoringView` utilise des helpers cohérents (`getHoursOffline`, `isVehicleOffline`), mais `OfflineTrackerList` recalcule séparément.

---

### N5 — `InterventionVehicleTab.tsx` L328 — Accès dynamique avec `as any`

```typescript
checked={!!(formData as any)[field]}
```

La checklist de pré-intervention utilise un accès dynamique au lieu d'un type union.

---

### N6 — `TechTeamView.tsx` — `dateRange` potentiellement null

Si `periodPreset === 'ALL'`, `dateRange` peut être `undefined` et `dateRange.start` causerait une erreur dans `handleExport`. Vérifier la gestion du cas null.

---

## 🔵 AMÉLIORATION (7 suggestions)

### A1 — Composants trop volumineux

| Fichier                   | Lignes | Suggestion                                                                  |
| ------------------------- | ------ | --------------------------------------------------------------------------- |
| `TechSettingsPanel.tsx`   | 1197   | Extraire chaque tab (Types, Natures, SLA, Devices, Rules) en sous-composant |
| `TechView.tsx`            | 954    | Extraire les modals (stock, history, audit, transfer) en composants dédiés  |
| `InterventionTechTab.tsx` | 940    | Extraire la section Fuel Gauge Config en composant séparé                   |
| `OfflineTrackerList.tsx`  | 733    | Extraire les modals (comment, inactivity history)                           |
| `AlertsConsole.tsx`       | 685    | Extraire chaque tab (alerts, autoAlerts, createdAlerts)                     |

---

### A2 — `TechSettingsPanel.tsx` — Pas de gestion d'état loading par opération

`saving` est un unique boolean partagé entre toutes les opérations CRUD (types, natures, SLA, devices, rules). Si deux opérations sont déclenchées simultanément, le state est incohérent.

---

### A3 — `useInterventionForm.ts` — Hook monolithique (741 lignes)

Ce hook contient toute la logique métier du formulaire d'intervention. Considérer une décomposition :

- `useInterventionValidation` — logique de validation par onglet
- `useInterventionPDF` — génération de PDFs (bon + rapport)
- `useInterventionAutoPopulate` — auto-population des champs véhicule/contrat

---

### A4 — Accessibilité incomplète dans les modals

Les modals dans `OfflineTrackerList.tsx`, `AlertsConsole.tsx`, et `UserMonitoring.tsx` :

- N'ont pas de gestion `aria-modal="true"`, `role="dialog"`
- N'empêchent pas le focus de sortir du modal (focus trap)
- Ne ferment pas avec `Escape` (seulement via click outside)

---

### A5 — `MonitoringView.tsx` — Pas de loading state

Le composant dépend de `useDataContext()` mais n'affiche aucun état de chargement pendant le fetch initial des données.

---

### A6 — `AnomalyDashboard.tsx` — "Dernière analyse: il y a 5 min" hardcodé

```tsx
<span className="text-xs text-slate-500">Dernière analyse: il y a 5 min</span>
```

Ce timestamp est statique et ne reflète pas la réalité.

---

### A7 — `deviceService.ts` — Pas de retry / timeout

Les commandes device (ping, cut engine, configure) n'ont aucun mécanisme de retry ni de timeout. Une commande perdue due à un problème réseau échoue silencieusement.

---

## Fichiers sans issue détectée

| Fichier                          | Lignes | Verdict                                          |
| -------------------------------- | ------ | ------------------------------------------------ |
| `constants.ts`                   | 140    | ✅ Propre                                        |
| `utils/resolutionTime.ts`        | 150    | ✅ Bien typé, bonne couverture des edge cases    |
| `hooks/useInterventionFilter.ts` | 35     | ✅ Simple et propre                              |
| `services/mockService.ts`        | 20     | ✅ Mock data minimal                             |
| `partials/index.ts`              | 7      | ✅ Barrel export propre                          |
| `InterventionForm.tsx`           | 300    | ✅ Bien refactorisé (hooks avant return, portal) |
| `InterventionPlanning.tsx`       | 508    | ✅ D&D + conflit detection bien implémentés      |
| `TechRadarMap.tsx`               | 200    | ✅ Usage correct de Leaflet                      |
| `TechStats.tsx`                  | 599    | ✅ Recharts bien intégré                         |
| `InterventionSignatureTab.tsx`   | 300    | ✅ Signature pads + photos bien gérés            |

---

## Inventaire des `as any` par fichier

| Fichier                    | Occurrences | Commentaire                            |
| -------------------------- | :---------: | -------------------------------------- |
| InterventionTechTab.tsx    |      7      | Propriétés vehicle/formData non typées |
| InterventionList.tsx       |      7      | Ticket fields + CSV import             |
| InterventionRequestTab.tsx |      5      | Ticket fields + select casts           |
| useInterventionForm.ts     |      2      | `formData.observations` fantôme        |
| TechView.tsx               |      3      | Technicians fallback + viewMode        |
| TechSettingsPanel.tsx      |      2      | slaConfig dynamic access               |
| AlertsConsole.tsx          |      2      | addTicket/addIntervention              |
| AnomalyDashboard.tsx       |      2      | addTicket/commands.create              |
| OfflineTrackerList.tsx     |      2      | addTicket/commands.create              |
| InterventionVehicleTab.tsx |      1      | checklist dynamic access               |
| **Total**                  |   **33**    |                                        |

---

## Résumé des actions prioritaires

1. **Remplacer les 2 `confirm()`/`window.confirm()` natifs** par `useConfirmDialog` (C1, C2)
2. **Remplacer le `fetch()` brut** dans UserMonitoring par `api.users.resetPassword()` (C3)
3. **Ajouter des `onClick` handlers** aux boutons dead d'AnomalyDashboard (C4)
4. **Fixer le `onClick={() => {}}` vide** sur la card "En Ligne" de MonitoringView (C5)
5. **Remplacer `useMemo` par `useEffect`** dans OfflineTrackerList L125 (M1)
6. **Fixer la condition dupliquée** dans AlertsConsole autoAlerts tab (N1)
7. **Réduire les `as any`** — 33 occurrences dont ~15 pourraient être résolues en enrichissant les interfaces TypeScript

---

_Fin de l'audit — 25 fichiers, ~9 500 lignes analysées_
