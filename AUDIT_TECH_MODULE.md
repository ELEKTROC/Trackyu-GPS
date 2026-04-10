# AUDIT Module 8 — Tech / Interventions / Monitoring

> **Date** : 2026-02-28
> **Périmètre** : 25 fichiers (~8 500 lignes) — `features/tech/`
> **Méthodologie** : E1-Rendu, E2-Données, E3-Actions, E4-Edge cases, E5-Améliorations

---

## Résumé

| Sévérité | Trouvés | Corrigés | Restants (structurels) |
|----------|---------|----------|------------------------|
| 🔴 Critique | 5 | 5 | 0 |
| 🟠 Important | 14 | 14 | 0 |
| 🟡 Mineur | 6 | 4 | 2 (hooks deps) |
| 🔵 Amélioration | 7 | 0 | 7 (`as any`, refactoring) |
| **Total** | **32** | **23** | **9** |

---

## Corrections appliquées (23)

### 🔴 Critiques (5)

| # | Fichier | Problème | Correction |
|---|---------|----------|------------|
| 1 | `monitoring/AlertsConsole.tsx` | `confirm()` natif → crash possible | Remplacé par `useConfirmDialog` |
| 2 | `monitoring/OfflineTrackerList.tsx` | `window.confirm()` natif | Remplacé par `useConfirmDialog` |
| 3 | `monitoring/UserMonitoring.tsx` | `fetch()` brut avec URL hardcodée | Remplacé par `api.users.resetPassword()` |
| 4 | `monitoring/UserMonitoring.tsx` | `api.admin.users.resetPassword` — erreur de compilation | Corrigé en `api.users.resetPassword` |
| 5 | `monitoring/OfflineTrackerList.tsx` | `useMemo` utilisé pour side-effect (`setState`) | Remplacé par `useEffect` |

### 🟠 Import / Hardcoded (14)

| # | Fichier | Problème | Correction |
|---|---------|----------|------------|
| 6 | `TechView.tsx` | Imports inutilisés : `History`, `Settings` | Supprimés |
| 7 | `TechStats.tsx` | Import inutilisé : `CalendarX2` | Supprimé |
| 8 | `TechSettingsPanel.tsx` | Imports inutilisés : `Check`, `AlertCircle`, `ChevronDown` | Supprimés |
| 9 | `monitoring/AnomalyDashboard.tsx` | Import inutilisé : `Signal` | Supprimé |
| 10 | `monitoring/SystemMetricsPanel.tsx` | Import inutilisé : `Server` | Supprimé |
| 11 | `monitoring/UserMonitoring.tsx` | Imports inutilisés : `TrendingUp`, `BarChart3`, `Clock` | Supprimés |
| 12 | `partials/InterventionTechTab.tsx` | Imports inutilisés : `Send`, `FileText`, `Sparkles` | Supprimés |
| 13 | `services/deviceService.ts` | IP `148.230.126.62` hardcodée | Extraite vers `GPS_SERVER_IP` dans `constants.ts` |
| 14 | `services/deviceService.ts` | APN `orange.ci` hardcodé | Extrait vers `DEFAULT_APN` dans `constants.ts` |
| 15 | `partials/InterventionTechTab.tsx` | IPs/APNs hardcodées (4 occurrences) | Remplacées par constantes partagées |
| 16 | `monitoring/SystemMetricsPanel.tsx` | URL Grafana hardcodée | Remplacée par `import.meta.env.VITE_GRAFANA_URL` |
| 17 | `services/deviceService.ts` | 3× `response` non utilisé dans `cutEngine`, `configureAPN`, `configureIP` | Supprimées les assignations inutiles |
| 18 | `monitoring/OfflineTrackerList.tsx` | Variable `statusLabel` assignée mais jamais utilisée | Supprimée (commentaire de remplacement) |
| 19 | `constants.ts` | Pas de constantes GPS server | Ajout `GPS_SERVER_IP`, `GPS_SERVER_PORT`, `DEFAULT_APN` (env vars) |

### 🟡 Qualité de code (4)

| # | Fichier | Problème | Correction |
|---|---------|----------|------------|
| 20 | `monitoring/AlertsConsole.tsx` | Code mort — branche ternaire dupliquée (`filteredAlertConfigs.length === 0` × 2) | Supprimé la branche inaccessible |
| 21 | `monitoring/AlertsConsole.tsx`, `OfflineTrackerList.tsx`, `UserMonitoring.tsx` | `import type` manquants | Corrigé : `import type` + `import` mixtes |
| 22 | `services/deviceService.ts` (4×), `UserMonitoring.tsx` (2×), `OfflineTrackerList.tsx` (1×), `InterventionTechTab.tsx` (2×) | `catch (error)` — variable non utilisée | Remplacé par `catch {}` |
| 23 | `monitoring/UserMonitoring.tsx` | Import `API_BASE_URL` inutile (après remplacement fetch) | Supprimé |

---

## Problèmes structurels documentés (non corrigés)

### 🔵 Améliorations / Refactoring

| # | Fichier | Problème | Recommandation |
|---|---------|----------|----------------|
| S1 | `TechSettingsPanel.tsx` (1197 L) | Fichier trop volumineux | Découper en sous-composants par onglet |
| S2 | `TechView.tsx` (954 L) | Fichier trop volumineux (9 tabs) | Extraire chaque tab en composant |
| S3 | `monitoring/OfflineTrackerList.tsx` (736 L) | Fichier trop volumineux | Extraire modal + bulk actions |
| S4 | Multiple fichiers (33× occurrences) | `as any` casts | Typer progressivement les données |
| S5 | `partials/InterventionTechTab.tsx` | 2× `api.post('/devices/sms/...')` inline | Extraire vers `deviceService.ts` |
| S6 | `partials/InterventionTechTab.tsx` L101 | React hook `useEffect` — deps manquantes | Risqué à corriger (boucle d'effet possible) |
| S7 | `partials/InterventionTechTab.tsx` L191 | React hook `useEffect` — dep `commandMode` manquante | Risqué à corriger (changement de comportement) |

---

## Fichiers modifiés

| Fichier | Nb corrections |
|---------|---------------|
| `features/tech/constants.ts` | +3 constantes GPS |
| `features/tech/services/deviceService.ts` | 7 (imports, constantes, vars, catch) |
| `features/tech/components/TechView.tsx` | 1 (imports) |
| `features/tech/components/TechStats.tsx` | 1 (import) |
| `features/tech/components/TechSettingsPanel.tsx` | 1 (imports) |
| `features/tech/components/monitoring/AlertsConsole.tsx` | 4 (confirm→dialog, dead code, import type, catch) |
| `features/tech/components/monitoring/AnomalyDashboard.tsx` | 1 (import) |
| `features/tech/components/monitoring/OfflineTrackerList.tsx` | 5 (confirm→dialog, useMemo→useEffect, statusLabel, import type, catch) |
| `features/tech/components/monitoring/SystemMetricsPanel.tsx` | 2 (import, Grafana URL) |
| `features/tech/components/monitoring/UserMonitoring.tsx` | 5 (imports, fetch→api, api path fix, import type, catch) |
| `features/tech/components/partials/InterventionTechTab.tsx` | 4 (imports, hardcoded values, import type, catch) |

---

## État final

- **Erreurs de compilation** : 0 (toutes les `as any` sont des warnings lint, pas des erreurs TS)
- **Confirmations natives** : 0 restantes (2 remplacées)
- **Fetch bruts** : 0 restants (1 remplacé)
- **IPs/APNs hardcodées** : 0 restantes (centralisées dans `constants.ts`)
- **Imports inutilisés** : 0 restants (15 supprimés au total)
