# AUDIT MODULE SUPPORT — Rapport Complet

> **Date** : 2026-02-28  
> **Module** : Support (Module 1)  
> **Fichier principal** : `features/support/components/SupportViewV2.tsx` (2072 lignes)  
> **Onglets audités** : DASHBOARD, TICKETS, KANBAN, SLA, CONFIG, LIVECHAT  
> **Backend** : `backend/src/controllers/ticketController.ts` + `ticketRepository.ts`

---

## Résumé

| Sévérité        | Count  | Description                                       |
| --------------- | ------ | ------------------------------------------------- |
| 🔴 Critique     | 0      | —                                                 |
| 🟠 Moyen        | 3      | Bugs fonctionnels affectant les données affichées |
| 🟡 Mineur       | 6      | Inconsistances UI, données manquantes             |
| 🔵 Amélioration | 8      | Suggestions UX/DX                                 |
| **Total**       | **17** |                                                   |

---

## 🟠 Bugs Moyens (3)

### 🟠-1 · `slaStats` ne passe pas `slaConfig` dynamique → KPIs SLA faux

**Fichier** : `SupportViewV2.tsx` lignes 235-240  
**Impact** : Dashboard + SLA Monitor + Performance agent  
**Description** : Le calcul de `slaStats` appelle `getSlaStatus(t.createdAt, t.priority)` sans le 3ème paramètre `slaConfig`. Résultat : les KPIs "SLA Critique", "Taux SLA" et le taux SLA par agent utilisent les **valeurs par défaut hardcodées** (CRITICAL=4h, HIGH=24h, MEDIUM=48h, LOW=72h) au lieu de la **configuration SLA personnalisée du tenant**.

En revanche, `getSlaBadge()` (ligne 819) et `getRemainingTime()` (ligne 823) utilisent correctement `slaConfig`. Cela crée une **incohérence** : un ticket peut afficher un badge SLA vert dans la liste mais être compté comme "critique" dans le Dashboard.

**Correction** : Passer `slaConfig` à `getSlaStatus()` dans `slaStats` et dans le tableau performances agent. Ajouter `slaConfig` aux deps du useMemo.

**Statut** : ✅ Corrigé

---

### 🟠-2 · KPI "Résolus (Mois)" affiche le total all-time

**Fichier** : `SupportViewV2.tsx` lignes 913-917  
**Impact** : Dashboard — KPI trompeur  
**Description** : Le label dit "Résolus (Mois)" mais la valeur affichée est `ticketCounts.RESOLVED` qui compte **tous les tickets résolus** depuis toujours, pas seulement ceux du mois en cours.

**Correction** : Renommer le label en "Résolus" (puisqu'on montre le total) et ajouter un deuxième compteur filtré par mois en cours.

**Statut** : ✅ Corrigé (label renommé + compteur mensuel ajouté)

---

### 🟠-3 · Composant monolithique (2072 lignes)

**Fichier** : `SupportViewV2.tsx`  
**Impact** : Maintenabilité, performance, lisibilité  
**Description** : Le composant unique gère 6 onglets, 20+ états, toute la logique d'actions, tous les rendus. Cela rend le fichier difficile à maintenir et à tester.

**Correction** : Refactoring recommandé — extraire chaque onglet en sous-composant :

- `SupportDashboard.tsx`
- `SupportTicketsList.tsx`
- `SupportKanban.tsx`
- `SupportSLAMonitor.tsx`
- `SupportConfig.tsx`

**Statut** : ⏳ À planifier (refactoring structurel)

---

## 🟡 Bugs Mineurs (6)

### 🟡-1 · PieChart "Tickets par Statut" exclut CLOSED

**Fichier** : `SupportViewV2.tsx` lignes 1007-1013  
**Impact** : Dashboard — graphique incomplet  
**Description** : Le PieChart montre 4 statuts (OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED) mais omet CLOSED, créant un graphique qui ne totalise pas 100% des tickets.

**Statut** : ✅ Corrigé

---

### 🟡-2 · Mobile : KPIs affichés de manière inconsistante

**Fichier** : `SupportViewV2.tsx` lignes 888 vs 937  
**Impact** : Dashboard Mobile  
**Description** : La première rangée de KPIs a `hidden sm:grid` (masquée sur mobile), mais la deuxième rangée (temps de résolution) n'a pas cette classe et s'affiche toujours. Comportement incohérent.

**Statut** : ✅ Corrigé (ajout `hidden sm:grid` à la 2ème rangée)

---

### 🟡-3 · Compteur sous-catégories affiche des données obsolètes

**Fichier** : `SupportViewV2.tsx` ligne 1818  
**Impact** : Config tab  
**Description** : `configSubCategories.filter(sc => sc.category_id === cat.id).length` utilise l'état `configSubCategories` qui ne contient que les sous-catégories de la **dernière catégorie expandue**. Les autres catégories affichent '0' au lieu de '?' après la première expansion.

**Statut** : ✅ Corrigé (affiche toujours '?' quand la catégorie n'est pas expandue)

---

### 🟡-4 · Client detail header peut être vide

**Fichier** : `SupportViewV2.tsx` ligne 1316  
**Impact** : Tickets tab — détail  
**Description** : `clientDetails?.name` est utilisé dans le header du détail ticket. Si le client n'est pas dans le cache local `clients`, le nom est vide. Devrait fallback sur `getClientName(selectedTicket)`.

**Statut** : ✅ Corrigé

---

### 🟡-5 · BarChart catégories vide sans message si `ticketCategories` = []

**Fichier** : `SupportViewV2.tsx` lignes 1020-1028  
**Impact** : Dashboard  
**Description** : Si l'API des catégories échoue, le BarChart est vide sans aucune indication. Pas bloquant mais confus.

**Statut** : 📝 Noté (low priority)

---

### 🟡-6 · Config SLA en lecture seule sans indication

**Fichier** : `SupportViewV2.tsx` lignes 1777-1797  
**Impact** : Config tab — UX  
**Description** : La section "Configuration SLA" affiche les valeurs mais ne permet pas de les modifier. Aucun message n'indique qu'il faut aller dans les paramètres admin.

**Statut** : ✅ Corrigé (ajout indication)

---

## 🔵 Améliorations Suggérées (8)

| #   | Onglet    | Suggestion                                                                    |
| --- | --------- | ----------------------------------------------------------------------------- |
| 1   | Dashboard | Ajouter un LineChart pour l'évolution du volume de tickets dans le temps      |
| 2   | Dashboard | Rendre les KPI cards cliquables (drill-down vers tickets filtrés)             |
| 3   | Dashboard | Agent performance pourrait utiliser le endpoint backend `/stats`              |
| 4   | Kanban    | Ajouter une colonne CLOSED (collapsed/read-only)                              |
| 5   | Kanban    | Afficher le nom de l'agent assigné sur les cartes                             |
| 6   | Tickets   | Ajouter un bouton "Supprimer" pour les tickets (le backend le supporte)       |
| 7   | Config    | Remplacer `prompt()` par un modal pour ajout de sous-catégorie                |
| 8   | Config    | Permettre la création de nouvelles catégories (pas seulement sous-catégories) |

---

## Backend — Analyse

### Routes (`ticketRoutes.ts`)

- ✅ Routes correctement ordonnées : `/my`, `/stats`, `/sla-violations` avant `/:id`
- ✅ Permissions RBAC appliquées sur toutes les routes staff
- ✅ Routes client (`/my`, `/:id/messages/client`) sans permission requise

### Controller (`ticketController.ts`)

- ✅ Validation Zod sur create/update/message/escalate
- ✅ Protection RESOLVED/CLOSED — seuls admin/superadmin peuvent rouvrir
- ✅ Timestamps auto (`first_response_at`, `started_at`, `resolved_at`, `closed_at`)
- ✅ Escalation avec email notification (non-blocking) + audit logging
- ✅ SLA violations use dynamic config from DB
- ✅ Attachments avec nettoyage fichier disque à la suppression
- ✅ Tenant isolation via `ticketRepository.checkAccess()`

### API Layer (`services/api/support.ts`)

- ✅ Mapping snake_case → camelCase correct
- ✅ Mock mode fonctionnel
- ✅ Error handling avec throw
- ✅ Message, attachment, escalation, client-reply endpoints

---

## Synthèse des corrections appliquées

| #   | Type | Fix                                                              | Lignes        |
| --- | ---- | ---------------------------------------------------------------- | ------------- |
| 1   | 🟠   | `slaStats` + agent table : passer `slaConfig` à `getSlaStatus()` | 235-240, 1090 |
| 2   | 🟠   | KPI "Résolus" : renommer label + ajouter compteur mensuel        | 913-917       |
| 3   | 🟡   | PieChart : ajouter CLOSED                                        | 1007-1013     |
| 4   | 🟡   | Mobile KPIs : uniformiser `hidden sm:grid`                       | 937           |
| 5   | 🟡   | Sous-catégories : afficher '?' quand non-expandée                | 1818          |
| 6   | 🟡   | Client name fallback dans détail ticket                          | 1316          |
| 7   | 🟡   | SLA Config : ajouter note lecture seule                          | 1777          |
