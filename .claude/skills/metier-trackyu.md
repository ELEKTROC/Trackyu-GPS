# Skill — Métier TrackYu GPS

Contexte produit et règles métier à connaître pour tout développement.

---

## Produit

TrackYu GPS est une plateforme SaaS de gestion de flotte :

- Suivi temps réel des véhicules via boîtiers GPS (GT06, CONCOX, Meitrack, Queclink, Suntech)
- Gestion multi-tenant (revendeurs → clients → véhicules)
- App web (desktop/admin) + app mobile Expo (terrain)
- Concurrent principal : **TRAKZEE** (Smartrack) — vieux design, feature-parity visée
- Benchmark visé : **Samsara / Motive**

---

## Règle absolue : 1 = 1 = 1 = 1

```
1 véhicule = 1 tracker (boîtier GPS) = 1 abonnement = 1 contrat
```

Jamais déroger à cette règle dans les formulaires, la facturation ou les rapports.

---

## Hiérarchie des rôles

| Rôle                                                                     | Niveau                                      | Tenant autorisé                     | Formulaire de création                  |
| ------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------- | --------------------------------------- |
| `SUPERADMIN`                                                             | Staff TrackYu interne                       | `tenant_default` (TKY) uniquement   | StaffPanelV2 (Administration)           |
| `Manager`                                                                | Tenant manager (staff du tenant)            | Tout tenant                         | StaffPanelV2 (Administration)           |
| `ADMIN` / `RESELLER` / `RESELLER_ADMIN`                                  | Admin tenant revendeur                      | Tout tenant                         | StaffPanelV2 (Administration)           |
| `TECH` / `COMMERCIAL` / `SUPPORT_AGENT` / `AGENT_TRACKING` / `COMPTABLE` | Staff (TrackYu ou revendeur)                | Tout tenant                         | StaffPanelV2 (Administration)           |
| `CLIENT`                                                                 | Compte principal d'un client (tier CLI-xxx) | Tout tenant (hors `tenant_default`) | UserForm (Paramètres > Utilisateurs)    |
| `SOUS_COMPTE` + `sub_role ∈ {User, Viewer}`                              | Sous-utilisateur d'un CLIENT                | Tenant du CLIENT                    | SubUserForm (Paramètres > Sous-comptes) |

### Règles clés

- **SUPERADMIN / staff TKY (tenant_default)** → visibilité cross-tenant
- **`ADMIN / RESELLER / RESELLER_ADMIN` = même rôle fonctionnel** — à traiter ensemble dans les checks d'autorisation
- **`CLIENT`** → isolation stricte par `tenant_id`, voit uniquement ses propres véhicules
- **`SOUS_COMPTE`** → isolation stricte par `client_id` ET `tenant_id`, voit uniquement les véhicules de son CLIENT parent
- **Manager est staff du tenant**, pas un sous-compte client. Un Manager n'a **jamais** de `client_id`
- **Contrainte DB `chk_default_tenant_staff_only`** : `CLIENT` et `SOUS_COMPTE` interdits dans `tenant_default` (réservé staff TKY)

### Sub-roles pour SOUS_COMPTE

| `sub_role` | Permissions clés                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`     | CRUD sur le périmètre client : édite véhicules/conducteurs, configure alertes, exporte rapports, crée tickets, crée zones. Ne peut **pas** créer d'interventions (staff only). |
| `Viewer`   | Lecture seule enrichie : voit véhicules, conducteurs, carte, historique, alertes, rapports. Pas d'édition, pas d'export, pas de tickets/zones.                                 |

`Manager` **n'est pas** un sub_role valide — c'est un role staff.

### Flux de création (anti-confusion)

1. Créer un **staff** (TrackYu ou revendeur) → **StaffPanelV2** (Administration > Équipe)
2. Créer un **compte CLIENT** (compte principal d'un client facturé) → **UserForm** (Paramètres > Utilisateurs)
3. Créer un **sous-utilisateur** d'un CLIENT → **SubUserForm** (Paramètres > Sous-comptes)

Toute création hors de ces flux = risque de compte mal classé (cf. incident Allegou Dominique — MANAGER créé à la place d'un sous-compte LTA).

---

## Modules principaux

| Module               | Description                                         |
| -------------------- | --------------------------------------------------- |
| Fleet                | Suivi véhicules, carte temps réel, VehicleDetail    |
| Carburant            | Niveau capteur + fiches REFILL/THEFT, courbes       |
| Maintenance          | Planification, alertes dépassement                  |
| Alertes / Violations | Règles configurables (vitesse, géofence, SOS...)    |
| Finance              | Abonnements, factures, paiements, récurrents        |
| CRM                  | Clients, contrats, tiers, leads                     |
| Agenda               | Planification interventions                         |
| Support              | Tickets, chat, SLA                                  |
| Settings             | Utilisateurs, véhicules, boîtiers, alertes, groupes |

---

## Données temps réel

- Positions GPS : table `positions` (time, latitude, longitude, speed, heading, fuel_liters, raw_data)
- Statuts véhicule : `moving / idle / stopped / offline`
- Durée statut calculée **côté serveur uniquement** — jamais recalculé côté client
- Données du jour = 00:00:00 → 23:59:59 (jour calendaire, pas fenêtre glissante 24h)

---

## Domaines

- `live.trackyugps.com` — app production (destination finale)
- `staging.trackyugps.com` — validation pré-prod
- `trackyugps.com` — futur vitrine SaaS (pas encore migré)

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill :

- `docs/audits-globaux/` — diagnostics transverses
- `docs/modules/` — audits par module métier

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
