# Audit Formulaire de Création de Ticket

**Date :** 6 février 2026  
**Module :** Support / Tickets  
**Fichier principal :** `features/support/components/SupportViewV2.tsx`

---

## 📋 Problèmes Identifiés et Corrigés

### 1. ❌ Techniciens non affichés dans "Assigner à"

**Symptôme :** Le dropdown "Assigner à" n'affichait pas les techniciens  
**Cause :** Le filtre ne prenait pas en compte le rôle `TECH`  
**Correction :** Ajout de `u.role === 'TECH'` dans le filtre des techniciens  
**Fichier :** `SupportViewV2.tsx` ligne ~180

### 2. ❌ Encodage des sous-catégories (??? au lieu de caractères accentués)

**Symptôme :** Sous-catégories affichées comme "D??sinstallation", "R??paration GPS"  
**Cause :** Données corrompues en base (encodage UTF-8 mal géré)  
**Correction :** UPDATE SQL pour corriger les noms :

- Désinstallation, Réinstallation, Réparation GPS, Réclamation facturation, etc.

### 3. ❌ Champs redondants (Catégorie + Sous-catégorie + Type d'intervention)

**Symptôme :** 3 champs à remplir créaient de la confusion  
**Correction :** Harmonisation avec le formulaire d'intervention :

- Pour **"Demande d'intervention"** : Type (Installation/Dépannage) + Nature
- Pour **autres catégories** : Sous-Catégorie uniquement

### 4. ❌ Sujet et Description à saisir manuellement

**Symptôme :** Perte de temps, incohérence dans les sujets  
**Correction :** Génération automatique :

- **Sujet** : `[Type] - [Nature] - [Plaque]` ou `[Sous-catégorie] - [Plaque]`
- **Description** : Template contextualisé selon le type d'intervention

### 5. ❌ Badge statut paiement client manquant

**Symptôme :** Impossible de savoir si le client a des impayés  
**Correction :** Ajout d'un badge sous le champ véhicule :

- 🟢 **À jour** : Pas de factures en retard
- 🔴 **Impayés** : Factures OVERDUE détectées

### 6. ❌ Véhicules non filtrés par client

**Symptôme :** Tous les véhicules s'affichaient au lieu de ceux du client  
**Cause :** Mapping `clientId` absent dans l'API  
**Correction :**

- Ajout du mapping `clientId` dans `api.ts`
- Filtrage par `v.clientId === ticketForm.clientId`

### 7. ❌ "Client inconnu" pour les clients d'autres tenants (Cross-tenant)

**Symptôme :** Ticket créé avec client d'un autre tenant affichait "Client inconnu"  
**Cause :** Frontend cherchait le client dans la liste locale (même tenant)  
**Correction :**

- Backend retourne `client_name` via JOIN dans `getTickets`
- Frontend utilise `ticket.clientName` en priorité
- Fallback sur recherche locale si non disponible
  **Fichiers :** `ticketController.ts`, `api.ts`, `SupportViewV2.tsx`, `types.ts`

### 8. ❌ Numérotation tickets suivait tenant de l'opérateur

**Symptôme :** Ticket créé par staff `tenant_default` pour client `tenant_smt` → `TIC-TKY-00002`  
**Attendu :** Numérotation basée sur le tenant du CLIENT → `TIC-SMT-00001`  
**Correction :**

- `createTicket` récupère le `tenant_id` du client
- Utilise ce tenant pour le numéro ET pour l'insertion
  **Fichier :** `ticketController.ts`

### 9. ❌ 404 sur attachments pour tickets cross-tenant

**Symptôme :** `GET /api/tickets/TIC-SMT-00001/attachments` retournait 404  
**Cause :** Vérification stricte `WHERE tenant_id = $userTenant` bloquait les SUPERADMIN  
**Correction :** Bypass tenant pour SUPERADMIN dans toutes les fonctions ticket  
**Fichiers corrigés :**

- `getTicketById` - SUPERADMIN voit tous tenants
- `updateTicket` - SUPERADMIN peut modifier + utilise tenant réel du ticket
- `deleteTicket` - SUPERADMIN peut supprimer
- `addTicketMessage` - SUPERADMIN peut ajouter messages
- `getTicketAttachments` - SUPERADMIN peut voir attachments ✅
- `getTicketStats` - SUPERADMIN voit stats globales

### 10. ❌ Modification possible des tickets résolus/clôturés

**Symptôme :** Utilisateurs pouvaient modifier des tickets terminés  
**Correction :**

- Blocage backend : 403 si ticket `RESOLVED` ou `CLOSED`
- Exception : SUPERADMIN/ADMIN peuvent rouvrir (changer statut vers `OPEN`/`IN_PROGRESS`)
- UI : Boutons masqués, messages désactivés, Kanban drag bloqué
  **Fichiers :** `ticketController.ts`, `SupportViewV2.tsx`

---

## ✅ Fonctionnalités Implémentées

### Génération Automatique du Sujet

| Catégorie              | Format du Sujet                                  |
| ---------------------- | ------------------------------------------------ |
| Demande d'intervention | `[Installation/Dépannage] - [Nature] - [Plaque]` |
| Autres catégories      | `[Sous-catégorie] - [Plaque]`                    |

**Exemples :**

- `Installation - Transfert - AB-123-CD`
- `Dépannage - Remplacement - XY-456-ZW`
- `Réclamation facturation - AB-123-CD`

### Templates de Description Pré-remplis

| Type               | Nature                | Description                                                             |
| ------------------ | --------------------- | ----------------------------------------------------------------------- |
| Installation       | Installation          | "Demande d'installation GPS sur véhicule [plaque] (Client: [nom])."     |
| Installation       | Transfert             | "Demande de transfert de balise GPS vers véhicule [plaque]..."          |
| Installation       | Réinstallation        | "Demande de réinstallation GPS sur véhicule [plaque]..."                |
| Dépannage          | Remplacement          | "Demande de remplacement suite à panne sur véhicule [plaque]..."        |
| Dépannage          | Retrait               | "Demande de retrait de balise GPS sur véhicule [plaque]..."             |
| Dépannage          | Contrôle branchements | "Demande de contrôle des branchements GPS sur véhicule [plaque]..."     |
| Dépannage          | Recalibrage sonde     | "Demande de recalibrage de la sonde carburant sur véhicule [plaque]..." |
| Réclamation client | \*                    | "Réclamation client ([nom]) concernant: [sous-catégorie]..."            |
| Support technique  | \*                    | "Support technique requis: [sous-catégorie] - Véhicule: [plaque]..."    |

### Indicateurs Visuels

- ✅ Badge **"✓ Généré automatiquement"** sur le sujet
- ✅ Badge **"✓ Pré-remplie"** sur la description
- ✅ L'utilisateur peut modifier manuellement les champs générés
- ✅ En mode édition, les champs ne sont pas écrasés

---

## 🔧 Fichiers Modifiés

| Fichier               | Modifications                                                            |
| --------------------- | ------------------------------------------------------------------------ |
| `TicketFormModal.tsx` | Fonction `generateSubjectAndDescription()`, onChange handlers, badges UX |
| `SupportViewV2.tsx`   | Filtre techniciens (ajout rôle TECH)                                     |
| `api.ts`              | Mapping `clientId` sur les véhicules                                     |
| Base de données       | Correction encodage `ticket_subcategories`                               |

---

## 📊 Avant / Après

### Avant

```
┌─────────────────────────────────────┐
│ Client: [dropdown]                  │
│ Véhicule: [tous les véhicules]      │
│ Catégorie: [dropdown]               │
│ Sous-catégorie: [???encoding???]    │
│ Type intervention: [dropdown]       │  ← Redondant
│ Assigner à: [vide - pas de techs]   │
│ Sujet: [saisie manuelle]            │
│ Description: [saisie manuelle]      │
└─────────────────────────────────────┘
```

### Après

```
┌─────────────────────────────────────┐
│ Client: [dropdown avec recherche]   │
│ Revendeur: [lecture seule]          │
│ Véhicule: [filtrés par client]      │
│   🔴 Impayés / 🟢 À jour            │
│ Catégorie: [dropdown]               │
│ Priorité: [dropdown avec SLA]       │
│ ─── Si "Demande d'intervention" ─── │
│ Type: [Installation/Dépannage]      │
│ Nature: [Transfert, Retrait...]     │
│ ─── Sinon ───────────────────────── │
│ Sous-catégorie: [encodage OK]       │
│ ────────────────────────────────────│
│ Assigner à: [techs + agents]        │
│ Sujet: [auto] ✓ Généré auto         │
│ Description: [auto] ✓ Pré-remplie   │
└─────────────────────────────────────┘
```

---

## 🔄 Workflow des Statuts de Ticket

### Statuts disponibles

| Statut           | Description                            | Couleur   |
| ---------------- | -------------------------------------- | --------- |
| `OPEN`           | Nouveau ticket, non traité             | 🔵 Bleu   |
| `IN_PROGRESS`    | En cours de traitement                 | 🟡 Jaune  |
| `WAITING_CLIENT` | En attente réponse client              | 🟠 Orange |
| `RESOLVED`       | Problème résolu, en attente validation | 🟢 Vert   |
| `CLOSED`         | Ticket clôturé définitivement          | ⚫ Gris   |

### Transitions autorisées

```
┌──────────┐     ┌─────────────┐     ┌─────────────────┐
│   OPEN   │────▶│ IN_PROGRESS │────▶│ WAITING_CLIENT  │
└──────────┘     └─────────────┘     └─────────────────┘
      │                 │                     │
      │                 ▼                     │
      │          ┌──────────┐                 │
      └─────────▶│ RESOLVED │◀────────────────┘
                 └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  CLOSED  │  ← Définitif (sauf admin)
                 └──────────┘
```

### Règles de modification

| Statut actuel    | Qui peut modifier | Actions possibles                            |
| ---------------- | ----------------- | -------------------------------------------- |
| `OPEN`           | Tous              | Modifier, changer statut, ajouter messages   |
| `IN_PROGRESS`    | Tous              | Modifier, changer statut, ajouter messages   |
| `WAITING_CLIENT` | Tous              | Modifier, changer statut, ajouter messages   |
| `RESOLVED`       | ❌ Bloqué         | Aucune modification (sauf réouverture admin) |
| `CLOSED`         | ❌ Bloqué         | Aucune modification (sauf réouverture admin) |

### Réouverture d'un ticket (Admin uniquement)

Seuls **SUPERADMIN** et **ADMIN** peuvent rouvrir un ticket résolu/clôturé :

- Changer le statut vers `OPEN` ou `IN_PROGRESS`
- Le ticket redevient modifiable par tous

**Backend** (`ticketController.ts`) :

```typescript
if (['RESOLVED', 'CLOSED'].includes(currentStatus)) {
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN';
  const isReopening = newStatus && ['OPEN', 'IN_PROGRESS'].includes(newStatus);

  if (!isAdmin || !isReopening) {
    return res.status(403).json({
      error: 'Les tickets résolus ne peuvent pas être modifiés...',
    });
  }
}
```

---

## 🎯 Fonctionnalité : Créer Intervention depuis Ticket

Lorsqu'un ticket de catégorie "**Demande d'intervention**" est créé, l'utilisateur peut :

1. Cliquer sur le bouton **"Créer intervention"** dans le détail du ticket
2. Le formulaire d'intervention s'ouvre pré-rempli avec :
   - Client du ticket
   - Véhicule du ticket
   - Type d'intervention (Installation/Dépannage)
   - Nature de l'intervention
   - Description issue du ticket
3. L'intervention créée est liée au ticket (`ticket_id`)
4. Le ticket peut être automatiquement passé en `IN_PROGRESS`

### Champs liés Ticket ↔ Intervention

| Champ Ticket        | Champ Intervention              |
| ------------------- | ------------------------------- |
| `client_id`         | `client_id`                     |
| `vehicle_id`        | `vehicle_id`                    |
| `intervention_type` | `type` (INSTALLATION/DEPANNAGE) |
| `sub_category`      | `nature`                        |
| `description`       | `notes`                         |
| `assigned_to`       | `technician_id`                 |

---

## 🔐 Support Multi-Tenant (Cross-tenant)

### Scénario

Un **SUPERADMIN** travaillant sur `tenant_default` (TrackYu HQ) doit pouvoir créer des tickets pour des clients d'autres tenants (ex: `tenant_smt`).

### Comportement implémenté

| Action              | Comportement                                                |
| ------------------- | ----------------------------------------------------------- |
| Création ticket     | Ticket créé avec `tenant_id` du CLIENT (pas de l'opérateur) |
| Numérotation        | Basée sur le tenant du client → `TIC-SMT-00001`             |
| Affichage client    | Nom récupéré via JOIN SQL (pas recherche locale)            |
| Lecture ticket      | SUPERADMIN peut voir tous les tickets                       |
| Modification ticket | SUPERADMIN peut modifier tous les tickets                   |
| Messages            | SUPERADMIN peut ajouter des messages partout                |
| Attachments         | SUPERADMIN peut voir/ajouter des pièces jointes             |
| Statistiques        | SUPERADMIN voit les stats globales                          |

### Fonctions backend avec bypass SUPERADMIN

- `getTickets()` - Liste sans filtre tenant
- `getTicketById()` - Accès sans restriction
- `updateTicket()` - Utilise le tenant réel du ticket
- `deleteTicket()` - Suppression sans restriction
- `addTicketMessage()` - Ajout sans restriction
- `getTicketAttachments()` - Lecture sans restriction
- `getTicketStats()` - Stats globales
- `escalateTicket()` - Escalade sans restriction

---

## ✅ Tests Recommandés

### Tests Formulaire

- [ ] Créer un ticket "Demande d'intervention" → vérifier sujet/description auto
- [ ] Créer un ticket "Réclamation client" → vérifier sous-catégorie + sujet
- [ ] Changer de véhicule → vérifier que le sujet se met à jour
- [ ] Vérifier que les techniciens apparaissent dans "Assigner à"
- [ ] Vérifier le badge "Impayés" pour un client avec factures en retard
- [ ] Éditer un ticket existant → vérifier que les champs ne sont pas écrasés

### Tests Cross-Tenant (SUPERADMIN)

- [ ] Créer ticket pour client d'un autre tenant → ID correct (TIC-SMT-XXXXX)
- [ ] Vérifier affichage nom du client (pas "Client inconnu")
- [ ] Modifier le ticket cross-tenant
- [ ] Ajouter un message au ticket cross-tenant
- [ ] Charger les pièces jointes du ticket cross-tenant

### Tests Workflow Statuts

- [ ] Passer un ticket de OPEN → IN_PROGRESS → RESOLVED
- [ ] Vérifier que le bouton "Modifier" disparaît quand RESOLVED
- [ ] Vérifier que l'input message est désactivé quand RESOLVED
- [ ] En tant qu'ADMIN, rouvrir un ticket RESOLVED → doit fonctionner
- [ ] En tant qu'USER, tenter de modifier un ticket RESOLVED → doit être bloqué

### Tests Intervention

- [ ] Créer intervention depuis un ticket "Demande d'intervention"
- [ ] Vérifier pré-remplissage des champs
- [ ] Vérifier liaison ticket ↔ intervention

---

## 🐛 Bugs Corrigés (Session du 6 février 2026)

### ✅ Bouton "Clôturer" ajouté sur tickets RESOLVED

**Problème :** Le bouton "Clôturer" était masqué car il était dans le bloc `{!['RESOLVED', 'CLOSED'].includes(status)}`  
**Correction :** Bouton sorti du bloc conditionnel, visible uniquement quand `status === 'RESOLVED'`

### ✅ Bouton "Rouvrir" pour SUPERADMIN/ADMIN

**Problème :** Impossible de rouvrir un ticket résolu/clôturé depuis l'UI  
**Correction :** Ajout d'un bouton "Rouvrir" visible pour les rôles SUPERADMIN et ADMIN sur les tickets RESOLVED ou CLOSED

### Boutons par statut (après correction)

| Statut           | Boutons visibles                                              |
| ---------------- | ------------------------------------------------------------- |
| `OPEN`           | Escalader, Modifier, Planifier Interv., **Prendre en charge** |
| `IN_PROGRESS`    | Escalader, Modifier, Planifier Interv., **Résoudre**          |
| `WAITING_CLIENT` | Escalader, Modifier, Planifier Interv.                        |
| `RESOLVED`       | **Clôturer** + Rouvrir (admin)                                |
| `CLOSED`         | Rouvrir (admin uniquement)                                    |

---

_Rapport mis à jour le 6 février 2026_
