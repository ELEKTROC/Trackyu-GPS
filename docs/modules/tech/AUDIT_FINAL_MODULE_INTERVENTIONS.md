# 🔍 Rapport Final — Module Interventions

> **Date** : 27 février 2026  
> **Périmètre** : Module Technique / Interventions (Frontend + Backend)  
> **Méthode** : Revue de code complète, analyse fonctionnelle, vérification build, identification des erreurs

---

## 📋 Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Inventaire des fichiers](#2-inventaire-des-fichiers)
3. [Analyse fonctionnelle](#3-analyse-fonctionnelle)
4. [Revue du code — Qualité & Architecture](#4-revue-du-code--qualité--architecture)
5. [Bugs & Anomalies identifiés](#5-bugs--anomalies-identifiés)
6. [Couverture de tests](#6-couverture-de-tests)
7. [Recommandations](#7-recommandations)
8. [Conclusion](#8-conclusion)

---

## 1. Vue d'ensemble

Le module Interventions est le cœur opérationnel de TrackYu GPS. Il gère le cycle de vie complet d'une intervention terrain : de la création (depuis un ticket support ou manuellement) jusqu'à la clôture avec facturation, en passant par la planification, l'exécution technique, et le reporting.

### Statistiques du module

| Métrique                       | Valeur                             |
| ------------------------------ | ---------------------------------- |
| **Fichiers frontend**          | 22 fichiers (.tsx/.ts)             |
| **Lignes de code frontend**    | ~5 600 lignes                      |
| **Fichiers backend**           | 4 fichiers (routes + controllers)  |
| **Lignes de code backend**     | ~1 540 lignes                      |
| **Schéma de validation (Zod)** | 121 lignes, ~50 champs             |
| **Build status**               | ✅ Compilation réussie (0 erreurs) |
| **Tests unitaires**            | ❌ Aucun (0 fichiers de test)      |

---

## 2. Inventaire des fichiers

### Frontend — `features/tech/`

| Fichier                                            | Lignes | Rôle                                                                         |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `components/InterventionForm.tsx`                  | 391    | Formulaire modal principal (4 onglets)                                       |
| `components/InterventionList.tsx`                  | 769    | Liste avec recherche, filtres, tri, pagination, actions en masse             |
| `components/InterventionPlanning.tsx`              | 508    | Planning semaine/jour avec drag & drop                                       |
| `components/TechView.tsx`                          | ~950   | Conteneur principal (6 onglets : OVERVIEW, LIST, PLANNING, MAP, STOCK, TEAM) |
| `components/TechStats.tsx`                         | ~500   | Tableau de bord OVERVIEW (10 KPIs, 8 graphiques)                             |
| `components/TechTeamView.tsx`                      | 342    | Vue performance équipe                                                       |
| `components/TechRadarMap.tsx`                      | —      | Carte radar des interventions                                                |
| `components/TechSettingsPanel.tsx`                 | —      | Paramètres techniques                                                        |
| `components/partials/InterventionRequestTab.tsx`   | 595    | Onglet 1 : Détails & Planification                                           |
| `components/partials/InterventionVehicleTab.tsx`   | 284    | Onglet 2 : Véhicule & Checklist                                              |
| `components/partials/InterventionTechTab.tsx`      | 942    | Onglet 3 : Technique, Tests, Config Carburant                                |
| `components/partials/InterventionSignatureTab.tsx` | 200    | Onglet 4 : Facturation, Photos, Signatures                                   |
| `components/partials/index.ts`                     | 5      | Barrel export                                                                |
| `hooks/useInterventionForm.ts`                     | 731    | Hook principal : logique métier, validation, handlers                        |
| `hooks/useInterventionFilter.ts`                   | 32     | Hook de filtrage avec guard null                                             |
| `utils/resolutionTime.ts`                          | 127    | Calcul temps résolution/réponse, SLA, formatage                              |
| `services/deviceService.ts`                        | 93     | Commandes GPS (ping, immobilisation, APN, IP)                                |
| `services/mockService.ts`                          | 16     | Génération de données mock                                                   |
| `constants.ts`                                     | 129    | Constantes (statuts, natures, colonnes, seuils)                              |

### Fichiers morts (code non utilisé)

| Fichier                                 | Raison                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `components/InterventionRequestTab.tsx` | Ancien onglet — remplacé par `partials/InterventionRequestTab.tsx` |
| `components/InterventionVehicleTab.tsx` | Ancien onglet — remplacé par `partials/InterventionVehicleTab.tsx` |
| `components/InterventionTechTab.tsx`    | Ancien onglet — remplacé par `partials/InterventionTechTab.tsx`    |

> **Vérification** : Aucun import ne référence ces 3 fichiers. Ils peuvent être supprimés.

### Backend — `backend/src/`

| Fichier                                       | Lignes | Rôle                                                   |
| --------------------------------------------- | ------ | ------------------------------------------------------ |
| `routes/techRoutes.ts`                        | 51     | Routes actives (`/api/tech/interventions/*`)           |
| `routes/interventionRoutes.ts`                | 17     | Routes dupliquées (code mort)                          |
| `controllers/interventionController.ts`       | 1286   | CRUD complet + logique métier (stock, contrats, devis) |
| `controllers/interventionReportController.ts` | 187    | Génération PDF rapport d'intervention                  |

### Schéma de validation

| Fichier                         | Lignes | Rôle                                                    |
| ------------------------------- | ------ | ------------------------------------------------------- |
| `schemas/interventionSchema.ts` | 121    | InterventionSchema + InterventionCompletionSchema (Zod) |

---

## 3. Analyse fonctionnelle

### 3.1 Cycle de vie d'une intervention

```
PENDING → SCHEDULED → EN_ROUTE → IN_PROGRESS → COMPLETED
                                        ↘ CANCELLED
                                        ↘ POSTPONED
```

| Transition              | Déclencheur                           | Validation                                                                     |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| PENDING → SCHEDULED     | Sauvegarde avec date planifiée (auto) | InterventionSchema (Zod)                                                       |
| SCHEDULED → EN_ROUTE    | Bouton « En route » dans la liste     | Aucune (juste status update)                                                   |
| \* → IN_PROGRESS        | Bouton « Démarrer » (onglet 1)        | validateTab('REQUEST') — client, type, nature, technicien, date                |
| IN_PROGRESS → COMPLETED | Bouton « Clôturer » (onglet 4)        | Validation progressive (4 onglets) + InterventionCompletionSchema (signatures) |

### 3.2 Fonctionnalités couvertes

#### Formulaire (4 onglets)

- ✅ **Onglet 1 — Détails & Planification** : Client, Ticket (lier/créer), Type (6 types), Nature (10 natures), Technicien, Date, Lieu, Contact, Contrat, Véhicule + matériel (IMEI/SIM/Sonde)
- ✅ **Onglet 2 — Véhicule & Checklist** : Marque, Modèle, Type d'engin, Kilométrage, VIN, Statut GPS, Type de balise (chargé depuis API), Emplacement physique, Matériel catalogue, Checklist pré-intervention (6 items)
- ✅ **Onglet 3 — Technique & Tests** : Statut connexion (Online/Offline), Mode TCP/SMS, Ping position, Immobilisation, Config APN, Config IP/Port, Commandes SMS copiables, Configuration jauge carburant (capteur, réservoir, calibration auto), Rapport auto-généré
- ✅ **Onglet 4 — Clôture & Signatures** : Articles facturables (catalogue), Mise à jour contrat, Génération facture, Montant reçu, Photos, Signature technicien (auto depuis profil), Signature client

#### Liste

- ✅ 13 colonnes configurables (visibilité toggle)
- ✅ Recherche globale (12 champs : client, tech, plaque, nature, IMEI, ticket, etc.)
- ✅ Filtres avancés : Nature, Client, Revendeur, Facturation
- ✅ Tri multi-colonnes (useTableSort)
- ✅ Pagination configurable (10/15/25/50)
- ✅ Sélection en masse + Actions : Supprimer, Créer Facture groupée
- ✅ Export PDF, CSV, Excel
- ✅ Import CSV (avec template téléchargeable)
- ✅ Bouton « En route » contextuel
- ✅ Durée réelle (résolution time) avec code couleur SLA

#### Planning

- ✅ Vue Jour (plages 08h–18h, positionnement horaire exact)
- ✅ Vue Semaine (grille 7 jours)
- ✅ Drag & Drop (pool → grille, inter-technicien, inter-jour)
- ✅ Snap 30 min, auto-transition PENDING → SCHEDULED
- ✅ Détection conflits horaires (chevauchement)
- ✅ Pool « À planifier » (interventions sans date/technicien)
- ✅ Filtre « Mon Planning » / « Tous »
- ✅ Indicateur temps réel (ligne rouge)
- ✅ Compteur interventions par technicien

#### Vue d'ensemble (OVERVIEW)

- ✅ 10 KPIs : Total, En Attente, En Cours, Terminées, Annulées+Reportées, Taux de Succès, Ponctualité, Temps Moyen+Médian, Réactivité, Chiffre d'Affaires
- ✅ 3 alertes SLA
- ✅ 8 graphiques : Par Technicien, Par Nature, Matériels Top 10, Par Type Engin, Évolution Mensuelle, Tendance 7j, Par Statut (donut), Top Clients

#### Synchronisation Ticket ↔ Intervention

- ✅ Création d'un ticket depuis le formulaire (TicketFormModal aligné sur le module Support)
- ✅ Pré-remplissage depuis ticket (technicien, revendeur, véhicule, lieu, contact)
- ✅ Sync statut : Démarrer → Ticket IN_PROGRESS, Clôturer → Ticket RESOLVED, Supprimer → Ticket OPEN

#### PDF

- ✅ Bon d'intervention (avant intervention — ordre de mission avec checklist vierge)
- ✅ Rapport d'intervention (après — compte-rendu avec observations, IMEI, tests)

### 3.3 Natures d'intervention supportées

| Nature                | Spécificités                                                             |
| --------------------- | ------------------------------------------------------------------------ |
| Installation          | Type forcé à INSTALLATION, véhicules internes uniquement                 |
| Remplacement          | Ancien boîtier/SIM auto-détecté, État matériel retiré obligatoire        |
| Transfert             | Véhicule cible requis, détection client différent, facture mutation      |
| Retrait               | État matériel retiré, mise à jour contrat optionnelle, motif obligatoire |
| Réinstallation        | Boîtier existant réinstallé                                              |
| Contrôle branchements | Vérification sans remplacement                                           |
| Recalibrage sonde     | Active la section jauge carburant                                        |
| Maintenance           | Intervention préventive                                                  |
| Diagnostic            | Analyse sans action corrective                                           |
| Dépannage             | SLA 4h, véhicules du client, matériel existant pré-rempli                |

---

## 4. Revue du code — Qualité & Architecture

### 4.1 Points forts ✅

1. **Refactoring clean** : Le formulaire (ex-2 026 lignes) est correctement décomposé en ~400 lignes (shell) + 731 lignes (hook) + 4 partials. La séparation présentation/logique est respectée.

2. **Validation en 2 niveaux** :
   - Validation par onglet (`validateTab`) pour la navigation forward-only
   - Validation Zod complète (`InterventionSchema` / `InterventionCompletionSchema`) à la sauvegarde/clôture

3. **Gestion défensive des données** :
   - `normalizeMaterial()` gère string, array, JSON, null
   - `formatDate()` / `formatTime()` protègent contre null et dates invalides
   - `useInterventionFilter` a le guard `null scheduledDate`

4. **UX mobile-ready** : Drag & drop sur le planning, responsive grid, animations CSS

5. **Facturation robuste** : Facturation groupée avec vérification même client, montant zéro, déjà facturée

6. **Commandes GPS bi-mode** : TCP (temps réel) et SMS (hors ligne) avec auto-switch selon le statut du boîtier

7. **Import/Export complet** : PDF, CSV, Excel, Import CSV avec template

### 4.2 Points d'attention ⚠️

1. **Schéma Zod vs constants.ts — INCOHÉRENCE TYPES** :
   - `constants.ts` → `INTERVENTION_TYPES` = `['INSTALLATION', 'DEPANNAGE', 'MAINTENANCE', 'DESINSTALLATION', 'VERIFICATION', 'AUTRE']` (6 types)
   - `interventionSchema.ts` → `InterventionTypeSchema` = `z.enum(['INSTALLATION', 'DEPANNAGE'])` (2 types)
   - **Impact** : Une intervention de type MAINTENANCE passera le formulaire UI mais échouera à la validation Zod.

2. **Prop drilling lourd** : `InterventionRequestTab` reçoit 15+ props. Le pattern fonctionne mais est à la limite de lisibilité. Un context dédié `InterventionFormContext` pourrait simplifier.

3. **`deviceService.ts` — IP/APN hardcodés** :
   - `configureIP` utilise `ip = "123.123.123.123"` au lieu de `148.230.126.62` (IP réelle de prod)
   - `configureAPN` utilise `apn = "internet"` au lieu de `"orange.ci"` (opérateur Côte d'Ivoire)
   - **Note** : Le mode SMS dans `InterventionTechTab` utilise les bonnes valeurs (`orange.ci`, `148.230.126.62`). L'incohérence est dans le mode TCP uniquement.

4. **Auto-compose des notes** : Le `useEffect` dans `InterventionTechTab` qui auto-génère le rapport technique a 14 dépendances et peut provoquer des re-render en boucle si mal contrôlé. Le guard `isAutoGenerated` atténue le risque mais un debounce serait plus sûr.

---

## 5. Bugs & Anomalies identifiés

### 🔴 Sévérité Haute

| #      | Description                                                                                                                                                                                                                                                                      | Fichier                                             | Ligne       |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------- |
| **B1** | **Incohérence types intervention** : Le schéma Zod n'accepte que `INSTALLATION` et `DEPANNAGE`, mais le frontend et le backend supportent 6 types (`MAINTENANCE`, `DESINSTALLATION`, `VERIFICATION`, `AUTRE`). Sauvegarder une intervention MAINTENANCE provoque une erreur Zod. | `schemas/interventionSchema.ts`                     | L5          |
| **B2** | **Backend : `res.json()` avant COMMIT** dans `updateIntervention`. Si le COMMIT échoue après envoi de la réponse, le client voit un succès mais la transaction est rollback.                                                                                                     | `backend/src/controllers/interventionController.ts` | ~L1007-1013 |

### 🟡 Sévérité Moyenne

| #      | Description                                                                                                                                                              | Fichier                                                                                          | Ligne |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----- |
| **B3** | **Code mort : 3 fichiers d'onglets** non importés dans aucun composant. Ils font ~800 lignes cumulées de code obsolète.                                                  | `components/InterventionRequestTab.tsx`, `InterventionTechTab.tsx`, `InterventionVehicleTab.tsx` | —     |
| **B4** | **Code mort : `interventionRoutes.ts`** — Doublon du CRUD déjà dans `techRoutes.ts`. Le frontend n'appelle que `/api/tech/interventions`.                                | `backend/src/routes/interventionRoutes.ts`                                                       | —     |
| **B5** | **IP hardcodée incorrecte** dans `deviceService.ts` (mode TCP) : `123.123.123.123` au lieu de `148.230.126.62`.                                                          | `services/deviceService.ts`                                                                      | L72   |
| **B6** | **APN hardcodé incorrect** dans `deviceService.ts` (mode TCP) : `"internet"` au lieu de `"orange.ci"`.                                                                   | `services/deviceService.ts`                                                                      | L53   |
| **B7** | **Symbole monétaire `€`** dans le rapport PDF backend au lieu de `FCFA`.                                                                                                 | `backend/src/controllers/interventionReportController.ts`                                        | ~L97  |
| **B8** | **`getStatusBadge` dans InterventionList** ne contient pas le statut `POSTPONED` (Reportée). Un intervention reportée affichera son code brut au lieu du label français. | `components/InterventionList.tsx`                                                                | ~L468 |

### 🟢 Sévérité Basse

| #       | Description                                                                                                                               | Fichier                                                   | Ligne      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- |
| **B9**  | **`console.error` au lieu de `logger.error`** dans le controller backend (pattern interdit).                                              | `backend/src/controllers/interventionController.ts`       | Multiples  |
| **B10** | **API frontend incomplète** : `api.interventions` n'expose pas `stats`, `history`, `getById`, `report` alors que le backend les supporte. | `services/api.ts`                                         | L1970-2285 |
| **B11** | **Photos stockées en `URL.createObjectURL`** : Les URLs blob ne persistent pas après refresh. Il manque un upload vers le serveur.        | `partials/InterventionSignatureTab.tsx`                   | L176       |
| **B12** | **Contrôle d'accès incohérent** : `generateInterventionReport` requiert `isStaffUser()` (stricter) en plus du `VIEW_TECH` du middleware.  | `backend/src/controllers/interventionReportController.ts` | ~L20       |

---

## 6. Couverture de tests

### État actuel : ❌ Aucun test

Il n'existe **aucun fichier de test** (`*.test.ts`, `*.spec.ts`) dans le répertoire `features/tech/`.

### Tests recommandés (priorité)

#### Tests unitaires (Vitest)

| Priorité | Sujet                                                            | Fichier cible                         |
| -------- | ---------------------------------------------------------------- | ------------------------------------- |
| 🔴 P1    | `resolutionTime.ts` — Calcul temps, formatage, SLA               | `utils/resolutionTime.test.ts`        |
| 🔴 P1    | `interventionSchema.ts` — Validation Zod (cas valides/invalides) | `schemas/interventionSchema.test.ts`  |
| 🟡 P2    | `normalizeMaterial()` — String, array, JSON, null                | `hooks/useInterventionForm.test.ts`   |
| 🟡 P2    | `getVehicleUpdates()` — Mapping véhicule → formData              | `hooks/useInterventionForm.test.ts`   |
| 🟡 P2    | `useInterventionFilter` — Filtrage avec null scheduledDate       | `hooks/useInterventionFilter.test.ts` |
| 🟢 P3    | `cleanPlate()` — Nettoyage plaque d'immatriculation              | `constants.test.ts`                   |
| 🟢 P3    | `formatDate()` / `formatTime()` — Null, undefined, invalid       | `InterventionList.test.ts`            |

#### Exemple de test suggéré — `resolutionTime.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateResolutionTime,
  formatDuration,
  isOverSLA,
  getResolutionTimeColor,
  calculateResolutionStats,
} from './resolutionTime';

describe('calculateResolutionTime', () => {
  it('returns null if not COMPLETED', () => {
    expect(
      calculateResolutionTime({
        status: 'IN_PROGRESS',
        startTime: '2026-01-01T08:00:00Z',
        endTime: '2026-01-01T09:00:00Z',
      } as any)
    ).toBeNull();
  });

  it('returns null if missing startTime or endTime', () => {
    expect(calculateResolutionTime({ status: 'COMPLETED', startTime: '2026-01-01T08:00:00Z' } as any)).toBeNull();
    expect(calculateResolutionTime({ status: 'COMPLETED', endTime: '2026-01-01T09:00:00Z' } as any)).toBeNull();
  });

  it('calculates correct minutes', () => {
    const result = calculateResolutionTime({
      status: 'COMPLETED',
      startTime: '2026-01-01T08:00:00Z',
      endTime: '2026-01-01T10:30:00Z',
    } as any);
    expect(result).toBe(150); // 2h30
  });

  it('returns null for negative duration', () => {
    expect(
      calculateResolutionTime({
        status: 'COMPLETED',
        startTime: '2026-01-01T10:00:00Z',
        endTime: '2026-01-01T08:00:00Z',
      } as any)
    ).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes correctly', () => {
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(45)).toBe('45min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(1500)).toBe('1j 1h'); // 25h
  });
});

describe('isOverSLA', () => {
  it('uses 4h SLA for DEPANNAGE', () => {
    expect(
      isOverSLA({
        type: 'DEPANNAGE',
        status: 'COMPLETED',
        startTime: '2026-01-01T08:00:00Z',
        endTime: '2026-01-01T13:00:00Z', // 5h
      } as any)
    ).toBe(true);
  });

  it('uses 24h SLA for INSTALLATION', () => {
    expect(
      isOverSLA({
        type: 'INSTALLATION',
        status: 'COMPLETED',
        startTime: '2026-01-01T08:00:00Z',
        endTime: '2026-01-01T13:00:00Z', // 5h
      } as any)
    ).toBe(false);
  });
});

describe('getResolutionTimeColor', () => {
  it('returns green for fast DEPANNAGE', () => {
    expect(getResolutionTimeColor(30, 'DEPANNAGE')).toBe('text-green-600');
  });
  it('returns red for slow DEPANNAGE', () => {
    expect(getResolutionTimeColor(300, 'DEPANNAGE')).toBe('text-red-600');
  });
});
```

---

## 7. Recommandations

### 🔴 Corrections prioritaires (à faire immédiatement)

| #   | Action                                                                  | Effort |
| --- | ----------------------------------------------------------------------- | ------ |
| R1  | Aligner `InterventionTypeSchema` Zod avec les 6 types de `constants.ts` | 5 min  |
| R2  | Corriger `res.json()` avant COMMIT dans le controller backend           | 10 min |
| R3  | Corriger IP et APN dans `deviceService.ts` (utiliser env vars)          | 10 min |
| R4  | Ajouter `POSTPONED` au `getStatusBadge` de la liste                     | 2 min  |
| R5  | Corriger `€` → `FCFA` dans `interventionReportController.ts`            | 2 min  |

### 🟡 Nettoyage (planifier)

| #   | Action                                                          | Effort |
| --- | --------------------------------------------------------------- | ------ |
| R6  | Supprimer les 3 fichiers d'onglets morts (root-level)           | 2 min  |
| R7  | Supprimer `interventionRoutes.ts` (doublon de `techRoutes.ts`)  | 5 min  |
| R8  | Remplacer `console.error` par `logger.error` dans le controller | 10 min |
| R9  | Exposer `stats`, `history`, `getById`, `report` dans `api.ts`   | 30 min |

### 🟢 Améliorations futures

| #   | Action                                                                 | Effort |
| --- | ---------------------------------------------------------------------- | ------ |
| R10 | Écrire les tests unitaires (resolutionTime, schema, normalizeMaterial) | 2h     |
| R11 | Implémenter l'upload des photos vers le serveur (remplacer blob URLs)  | 4h     |
| R12 | Introduire un `InterventionFormContext` pour réduire le prop drilling  | 2h     |
| R13 | Ajouter un debounce sur l'auto-compose du rapport technique            | 30 min |
| R14 | Ajouter un test de charge planning (100+ interventions/semaine)        | 1h     |

---

## 8. Conclusion

### Score global du module

| Critère                       | Note           | Commentaire                                                                |
| ----------------------------- | -------------- | -------------------------------------------------------------------------- |
| **Couverture fonctionnelle**  | ⭐⭐⭐⭐⭐ 5/5 | Toutes les natures, le cycle de vie complet, facturation, planning, export |
| **Architecture & Séparation** | ⭐⭐⭐⭐ 4/5   | Bon refactoring (2 026 → 400 + hook). Prop drilling acceptable.            |
| **Qualité du code**           | ⭐⭐⭐⭐ 4/5   | Gestion défensive, validation Zod, bons patterns React                     |
| **Robustesse**                | ⭐⭐⭐½ 3.5/5  | L'incohérence types Zod est un risque réel. Photos blob non persistées.    |
| **Couverture tests**          | ⭐ 1/5         | 0 tests. Point faible critique.                                            |
| **Code mort**                 | ⭐⭐⭐ 3/5     | 4 fichiers morts (3 frontend + 1 backend route). À nettoyer.               |
| **Sécurité**                  | ⭐⭐⭐⭐ 4/5   | RBAC ok, tenant_id filtré, validation Zod. `console.error` à corriger.     |

### Résumé

Le module Interventions est **fonctionnellement complet et bien architecturé**. Le refactoring de 2 026 → ~400 lignes (shell) + 731 lignes (hook) + 4 partials est réussi. La couverture des natures d'intervention (10 natures avec comportements spécifiques), le planning drag & drop, et le mode bi-TCP/SMS pour les commandes GPS sont des points forts notables.

Les **2 bugs bloquants** (types Zod incohérents, `res.json` avant COMMIT) doivent être corrigés en priorité. Le nettoyage du code mort (4 fichiers) et l'ajout de tests unitaires sont les prochaines étapes recommandées.

---

_Rapport généré après audit complet : 22 fichiers frontend, 4 fichiers backend, 1 schéma Zod, build vérifié._
