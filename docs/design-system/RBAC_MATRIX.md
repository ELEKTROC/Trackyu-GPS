# RBAC MATRIX — Matrice rôles / écrans / permissions TrackYu

> **Document de référence** sur le contrôle d'accès basé sur les rôles (RBAC).
> Source de vérité dérivée du code : [`contexts/AuthContext.tsx`](../../contexts/AuthContext.tsx) (ROLE_DEFINITIONS) + [`features/admin/permissions/permissionStructure.ts`](../../features/admin/permissions/permissionStructure.ts) + [`types/auth.ts`](../../types/auth.ts) (Permission type).
> Référencé par [CHANTIER_REFONTE_DESIGN.md](CHANTIER_REFONTE_DESIGN.md), [SCREEN_MAP.md](SCREEN_MAP.md), [BLUEPRINT.md](BLUEPRINT.md), [INTEGRATION_PLAYBOOK.md](INTEGRATION_PLAYBOOK.md).
>
> Dernière mise à jour : 2026-04-26 (v1.0 — extraction depuis code)

---

## 0. Pourquoi ce document

Quand on intègre un mockup Design dans le code (cf. [INTEGRATION_PLAYBOOK.md](INTEGRATION_PLAYBOOK.md)), il faut **savoir quels guards rôles mettre** :

```tsx
// Exemple
{
  hasPermission('VIEW_FINANCE') && <FinanceSection />;
}
{
  hasPermission('CREATE_VEHICLES') && <Button>+ Nouveau véhicule</Button>;
}
```

Ce document liste **qui voit quoi** pour les 12 rôles × tous les écrans / actions. Il évite de :

- Reposer sur Design (qui ne connaît pas TrackYu) pour décider de la visibilité
- Rouvrir `permissionStructure.ts` (922 lignes) à chaque intégration
- Risquer un oubli de guard (= leak data sensitive)

---

## 1. Les 12 rôles définis

| Rôle               | Type                            | Définition                                                        | Cas d'usage typique                                            |
| ------------------ | ------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| **SUPERADMIN**     | Staff TKY (cross-tenant)        | Toutes permissions + visibilité cross-tenant                      | Équipe TrackYu, support N3, audit plateforme                   |
| **ADMIN**          | Tenant admin                    | Toutes permissions au sein de son tenant                          | Admin d'une entreprise cliente (gestionnaire flotte principal) |
| **RESELLER_ADMIN** | Tenant admin (équivalent ADMIN) | = ADMIN tenant. Peut gérer ses sub-tenants.                       | Admin d'un revendeur TrackYu qui revend à plusieurs clients    |
| **MANAGER**        | Tenant manager (limité)         | Read+limited write. Pas d'admin/users/finance avancée             | Manager d'équipe au sein d'un tenant                           |
| **CLIENT**         | Utilisateur final               | Lecture seule sa flotte (Dashboard, Map, Fleet, Reports)          | Client final qui suit ses véhicules                            |
| **SOUS_COMPTE**    | Sub-account CLIENT              | = CLIENT (alias)                                                  | Sous-utilisateur d'un client (chauffeur, secrétaire)           |
| **TECH**           | Technicien terrain              | Interventions, stock, devices                                     | Technicien qui pose / dépose / maintient les boîtiers          |
| **AGENT_TRACKING** | Agent suivi flotte              | Dashboard + map + fleet + tickets + alertes                       | Agent qui surveille la flotte et crée des tickets              |
| **COMMERCIAL**     | Commercial                      | CRM (leads, clients, contrats), facturation, basique tech/support | Commercial qui prospecte et gère les comptes clients           |
| **SALES**          | Sales (alias)                   | = COMMERCIAL                                                      | Idem, alias en code                                            |
| **COMPTABLE**      | Comptable                       | Finance, paiements, facturation, clients                          | Comptable qui gère factures et paiements                       |
| **SUPPORT_AGENT**  | Agent support N1/N2             | Tickets, clients, fleet, basique tech                             | Agent support qui répond aux tickets clients                   |

### Rôles legacy (à ne plus utiliser pour nouvelles créations)

| Rôle           | Statut                                                     |
| -------------- | ---------------------------------------------------------- |
| `USER`         | Legacy = `CLIENT`. Migré progressivement.                  |
| `CLIENT_ADMIN` | Legacy. Mappé vers `CLIENT` + permissions Support/Finance. |

### Note sur les aliases fonctionnels

- `RESELLER_ADMIN` = `ADMIN` (côté permissions identique). Différence : un RESELLER_ADMIN peut avoir plusieurs sub-tenants sous lui.
- `SALES` = `COMMERCIAL` (alias). Mêmes permissions.
- `SOUS_COMPTE` = `CLIENT` (alias). Mêmes permissions.

→ Dans le code : traiter ensemble `ADMIN` / `RESELLER_ADMIN` ; `CLIENT` / `SOUS_COMPTE` / `SUB_ACCOUNT` ; `COMMERCIAL` / `SALES`.

---

## 2. Matrice écran × rôle (visible / non-visible)

Légende : `✓` visible · `✗` non-visible · `⊘` visible mais scope limité (ex: CLIENT voit sa flotte uniquement)

| Écran                | View              | SUPERADMIN | ADMIN / RESELLER_ADMIN | MANAGER | CLIENT / SOUS_COMPTE | TECH | AGENT_TRACKING | COMMERCIAL / SALES | COMPTABLE        | SUPPORT_AGENT    |
| -------------------- | ----------------- | ---------- | ---------------------- | ------- | -------------------- | ---- | -------------- | ------------------ | ---------------- | ---------------- |
| Dashboard            | `View.DASHBOARD`  | ✓          | ✓                      | ✓       | ⊘ (sa flotte)        | ✓    | ✓              | ✓                  | ✓                | ✓                |
| Carte temps réel     | `View.MAP`        | ✓          | ✓                      | ✓       | ⊘ (sa flotte)        | ✗    | ✓              | ✓                  | ✗                | ✓                |
| Replay               | (sub-mode MAP)    | ✓          | ✓                      | ✓       | ⊘ (sa flotte)        | ✗    | ✓              | ✗                  | ✗                | ✗                |
| Fleet liste          | `View.FLEET`      | ✓          | ✓                      | ✓       | ⊘ (sa flotte)        | ✗    | ✓              | ✓                  | ✓                | ✓                |
| Vehicle Detail Panel | (drawer)          | ✓          | ✓                      | ✓       | ⊘ (lecture limitée)  | ✗    | ✓              | ✓                  | ✓                | ✓                |
| Prévente / Leads     | `View.PRESALES`   | ✓          | ✓                      | ✓       | ✗                    | ✗    | ✗              | ✓                  | ✗                | ✗                |
| Vente / Sales        | `View.SALES`      | ✓          | ✓                      | ✓       | ✗                    | ✗    | ✗              | ✓                  | ⊘ (clients only) | ⊘ (clients only) |
| Comptabilité         | `View.ACCOUNTING` | ✓          | ✓                      | ✗       | ✗                    | ✗    | ✗              | ✗                  | ✓                | ✗                |
| Tech / Interventions | `View.TECH`       | ✓          | ✓                      | ✓       | ✗                    | ✓    | ✓              | ✗                  | ✓                | ✓                |
| Monitoring système   | `View.MONITORING` | ✓          | ✓                      | ✗       | ✗                    | ✗    | ✗              | ✗                  | ✗                | ✗                |
| Stock                | `View.STOCK`      | ✓          | ✓                      | ✗       | ✗                    | ✓    | ✗              | ✗                  | ⊘ (lecture)      | ⊘ (lecture)      |
| Support / Tickets    | `View.SUPPORT`    | ✓          | ✓                      | ✓       | ⊘ (ses tickets)      | ✗    | ✓              | ✓                  | ✓                | ✓                |
| Rapports             | `View.REPORTS`    | ✓          | ✓                      | ✓       | ⊘ (rapports flotte)  | ✗    | ✓              | ✓                  | ✓                | ✓                |
| Agenda               | `View.AGENDA`     | ✓          | ✓                      | ✓       | ✗                    | ✓    | ✗              | ✓                  | ✗                | ✗                |
| Settings             | `View.SETTINGS`   | ✓          | ✓                      | ✓       | ✓ (limité)           | ✓    | ✓              | ✓                  | ✓                | ✓                |
| Administration       | `View.ADMIN`      | ✓          | ✓                      | ✗       | ✗                    | ✗    | ✗              | ✗                  | ✗                | ✗                |

### Synthèse pour Design (qui mockuper en variantes "vue CLIENT")

Conformément au [BLUEPRINT.md §5](BLUEPRINT.md), seuls **4 écrans** demandent une vignette "vue CLIENT" parce que la différence est **structurelle** :

1. **Dashboard** — KPIs réduits (4 au lieu de 6, retire Revenus/Stock/Interventions globales)
2. **Fleet** — colonnes / actions admin retirées, filtre tenant absent, scope = sa flotte
3. **Reports** — rapports flotte uniquement (Activité / Carburant / Performance), pas Business / Journaux / Support
4. **Sales / Comptabilité** — **non-visible** pour CLIENT (pas de vignette nécessaire, on cache l'écran complet)

Pour les autres écrans : ADMIN-only mockup suffit. Les variantes (TECH / COMMERCIAL / FINANCE / SUPPORT / MANAGER) sont gérées en intégration via `hasPermission()`.

---

## 3. Matrice permissions × rôles (extraite de ROLE_DEFINITIONS)

97 permissions définies dans `types/auth.ts`. Voici l'attribution par rôle, organisée par module.

### 3.1 General Access

| Permission       | SUPERADMIN | ADMIN/RESELLER | MANAGER | CLIENT/SOUS_COMPTE | TECH | AGENT_TRACKING | COMMERCIAL/SALES | COMPTABLE | SUPPORT_AGENT |
| ---------------- | ---------- | -------------- | ------- | ------------------ | ---- | -------------- | ---------------- | --------- | ------------- |
| `VIEW_DASHBOARD` | ✓          | ✓              | ✓       | ✓                  | ✓    | ✓              | ✓                | ✓         | ✓             |
| `VIEW_MAP`       | ✓          | ✓              | ✓       | ✓                  | ✓    | ✓              | ✓                | ✗         | ✓             |
| `VIEW_REPORTS`   | ✓          | ✓              | ✓       | ✓                  | ✗    | ✓              | ✓                | ✓         | ✓             |
| `VIEW_LOGS`      | ✓          | ✗              | ✗       | ✗                  | ✗    | ✗              | ✗                | ✗         | ✗             |

### 3.2 Fleet

| Permission                                           | SUPERADMIN              | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| ---------------------------------------------------- | ----------------------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_FLEET`                                         | ✓                       | ✓              | ✓       | ✓      | ✓    | ✓              | ✓          | ✓         | ✓       |
| `MANAGE_FLEET` (geofences, groupes, maint rules)     | ✓                       | ✓              | ✓       | ✗      | ✗    | ✓              | ✗          | ✗         | ✗       |
| `VIEW_VEHICLES` / `CREATE_*` / `EDIT_*` / `DELETE_*` | (fine-grained, voir §4) |                |         |        |      |                |            |           |         |
| `VIEW_DRIVERS` / `CREATE_*` / `EDIT_*` / `DELETE_*`  | (fine-grained)          |                |         |        |      |                |            |           |         |

### 3.3 Sales & CRM

| Permission                                          | SUPERADMIN                          | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| --------------------------------------------------- | ----------------------------------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_CRM`                                          | ✓                                   | ✓              | ✓       | ✗      | ✗    | ✗              | ✓          | ✓         | ✓       |
| `MANAGE_LEADS` (legacy)                             | ✓                                   | ✓              | ✓       | ✗      | ✗    | ✗              | ✓          | ✗         | ✗       |
| `MANAGE_CLIENTS` (legacy)                           | ✓                                   | ✓              | ✓       | ✗      | ✗    | ✗              | ✓          | ✓         | ✓       |
| `MANAGE_CONTRACTS` (legacy)                         | ✓                                   | ✓              | ✓       | ✗      | ✗    | ✗              | ✓          | ✗         | ✗       |
| `VIEW_LEADS` / `CREATE_*` / `EDIT_*` / `DELETE_*`   | (fine-grained, suit MANAGE_LEADS)   |                |         |        |      |                |            |           |         |
| `VIEW_CLIENTS` / `CREATE_*` / `EDIT_*` / `DELETE_*` | (fine-grained, suit MANAGE_CLIENTS) |                |         |        |      |                |            |           |         |

### 3.4 Finance

| Permission                                         | SUPERADMIN             | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| -------------------------------------------------- | ---------------------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_FINANCE`                                     | ✓                      | ✓              | ✓       | ✗      | ✗    | ✗              | ✓          | ✓         | ✗       |
| `MANAGE_FINANCE` (compta avancée)                  | ✓                      | ✓              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |
| `MANAGE_INVOICES` (legacy)                         | ✓                      | ✓              | ✗       | ✗      | ✗    | ✗              | ✓          | ✓         | ✗       |
| `VIEW_PAYMENTS`                                    | ✓                      | ✓              | ✓       | ✗      | ✗    | ✗              | ✗          | ✓         | ✗       |
| `APPROVE_PAYMENTS`                                 | ✓                      | ✓              | ✓       | ✗      | ✗    | ✗              | ✗          | ✓         | ✗       |
| `VIEW_QUOTES` / `CREATE_*` / `EDIT_*`              | (suit MANAGE_INVOICES) |                |         |        |      |                |            |           |         |
| `VIEW_JOURNAL_ENTRIES` / `CREATE_*` / `VALIDATE_*` | ADMIN + COMPTABLE only |                |         |        |      |                |            |           |         |

### 3.5 Tech & Stock

| Permission                      | SUPERADMIN | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| ------------------------------- | ---------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_TECH`                     | ✓          | ✓              | ✓       | ✗      | ✓    | ✓              | ✓          | ✓         | ✓       |
| `MANAGE_INTERVENTIONS` (legacy) | ✓          | ✓              | ✓       | ✗      | ✓    | ✗              | ✓          | ✗         | ✓       |
| `MANAGE_STOCK` (legacy)         | ✓          | ✓              | ✗       | ✗      | ✓    | ✗              | ✗          | ✓         | ✓       |
| `MANAGE_DEVICES` (legacy)       | ✓          | ✓              | ✗       | ✗      | ✓    | ✓              | ✗          | ✗         | ✗       |

### 3.6 Alerts & Monitoring

| Permission      | SUPERADMIN | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| --------------- | ---------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_ALERTS`   | ✓          | ✓              | ✓       | ✗      | ✓    | ✓              | ✗          | ✗         | ✗       |
| `MANAGE_ALERTS` | ✓          | ✓              | ✗       | ✗      | ✗    | ✓              | ✗          | ✗         | ✗       |

### 3.7 Support

| Permission                                          | SUPERADMIN                                  | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| --------------------------------------------------- | ------------------------------------------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_SUPPORT`                                      | ✓                                           | ✓              | ✓       | ✗      | ✗    | ✓              | ✓          | ✓         | ✓       |
| `MANAGE_TICKETS` (legacy)                           | ✓                                           | ✓              | ✓       | ✗      | ✗    | ✓              | ✓          | ✓         | ✓       |
| `MANAGE_MACROS` (réponses prédéfinies)              | ✓                                           | ✗              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✓       |
| `VIEW_TICKETS` / `CREATE_*` / `EDIT_*` / `DELETE_*` | (suit MANAGE_TICKETS, sauf DELETE = ADMIN+) |                |         |        |      |                |            |           |         |

### 3.8 Administration

| Permission                   | SUPERADMIN       | ADMIN/RESELLER | MANAGER | CLIENT | TECH | AGENT_TRACKING | COMMERCIAL | COMPTABLE | SUPPORT |
| ---------------------------- | ---------------- | -------------- | ------- | ------ | ---- | -------------- | ---------- | --------- | ------- |
| `VIEW_ADMIN`                 | ✓                | ✓              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |
| `MANAGE_USERS`               | ✓                | ✓              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |
| `MANAGE_ROLES`               | ✓                | ✓              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |
| `MANAGE_TENANTS`             | ✓ (cross-tenant) | ✗              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |
| `MANAGE_SETTINGS`            | ✓                | ✓              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |
| `MANAGE_FAQ` (centre d'aide) | ✓                | ✗              | ✗       | ✗      | ✗    | ✗              | ✗          | ✗         | ✗       |

---

## 4. Permissions fines (par module et action)

Pour les opérations CRUD précises (VIEW / CREATE / EDIT / DELETE / EXPORT / IMPORT), `permissionStructure.ts` définit la granularité **par tab et par champ** dans 17 modules :

| Module ID       | Catégorie | Actions globales              |
| --------------- | --------- | ----------------------------- |
| `dashboard`     | general   | VIEW · EXPORT                 |
| `map`           | general   | VIEW · EXPORT                 |
| `vehicles`      | fleet     | FULL (CRUD + EXPORT + IMPORT) |
| `drivers`       | fleet     | FULL                          |
| `clients`       | crm       | FULL                          |
| `leads`         | crm       | FULL                          |
| `contracts`     | crm       | FULL                          |
| `invoices`      | finance   | FULL                          |
| `payments`      | finance   | VIEW · CREATE · EXPORT        |
| `interventions` | tech      | FULL                          |
| `stock`         | tech      | FULL                          |
| `tickets`       | support   | FULL                          |
| `reports`       | general   | VIEW · CREATE · EXPORT        |
| `admin`         | admin     | FULL                          |
| `alerts`        | general   | VIEW · EDIT · DELETE          |

### Fine-grained par champ (extrait `permissionStructure.ts`)

Chaque module a des **tabs**, et chaque tab a des **fields** avec leurs actions autorisées. Exemple `vehicles` :

| Tab                                  | Permission par défaut | Sous-onglets staff-only     |
| ------------------------------------ | --------------------- | --------------------------- |
| `vehicles.general`                   | CRUD                  | Non                         |
| `vehicles.device` (boîtier GPS)      | CRUD                  | **Oui** (`staffOnly: true`) |
| `vehicles.client` (client + contrat) | VIEW + EDIT           | Non                         |
| `vehicles.maintenance`               | CRUD                  | Non                         |
| `vehicles.documents`                 | CRUD                  | Non                         |
| `vehicles.alerts`                    | CRUD                  | Non                         |

→ **Règle générale** : pour une intégration spécifique d'un champ ou d'un sous-onglet, **se référer au code** (`permissionStructure.ts`) plutôt qu'à ce résumé. Le code est la source de vérité, ce document est l'aperçu.

---

## 5. Règles d'isolation tenant

### 5.1 Principe

Chaque tenant (client / revendeur / TKY) a ses propres données. L'isolation est **enforcée côté backend** (Row-Level Security PostgreSQL + middlewares Express). Le frontend respecte naturellement cette isolation via les API.

### 5.2 Matrice de visibilité tenant

| Rôle                                                                                 | Voit les données de quels tenants ?                                                |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **SUPERADMIN** (staff TKY, tenant_default)                                           | **Tous les tenants** (cross-tenant par défaut, peut filtrer via dropdown)          |
| **ADMIN**                                                                            | Son tenant uniquement                                                              |
| **RESELLER_ADMIN**                                                                   | Son tenant + tous ses sub-tenants (clients qu'il revend)                           |
| **MANAGER / COMMERCIAL / SALES / COMPTABLE / SUPPORT_AGENT / TECH / AGENT_TRACKING** | Son tenant uniquement                                                              |
| **CLIENT / SOUS_COMPTE**                                                             | Sa flotte uniquement (un client peut avoir plusieurs véhicules mais 1 seul tenant) |

### 5.3 tenant_default (TKY, "TrackYu System")

Le tenant interne TrackYu. Tous les staff TrackYu ont leur compte attaché à ce tenant. Le code utilise une exception pour leur donner la visibilité cross-tenant (cf. mémoire projet `project_superadmin_cross_tenant.md`).

### 5.4 Implications design

Pour les écrans staff cross-tenant (Comptabilité, Admin, Monitoring) : Design doit prévoir **un dropdown "Filtrer par tenant"** dans le toolbar, visible uniquement pour SUPERADMIN.

Exemple [Comptabilité §3.6 BLUEPRINT](BLUEPRINT.md) :

```
[SearchBar] [Classe ▾] [Revendeur ▾ ← visible SUPERADMIN only]
```

---

## 6. Champs sensibles (`sensitive: true`)

Champs marqués `sensitive: true` dans `permissionStructure.ts` — affichage masqué par défaut ou rôle restrictif :

| Module                    | Champ                                         | Sensibilité                               |
| ------------------------- | --------------------------------------------- | ----------------------------------------- |
| Vehicles                  | `vin` (VIN/Châssis)                           | Identifiant unique véhicule, RGPD         |
| Vehicles                  | `monthly_fee` (mensualité)                    | Données financières (masqué pour MANAGER) |
| Devices (vehicles.device) | `imei`                                        | Identifiant boîtier (staff TKY only)      |
| Devices                   | `sim` (numéro SIM)                            | Identifiant SIM (staff TKY only)          |
| Drivers                   | `cni` (N° CNI)                                | Identité personnelle, RGPD                |
| Drivers                   | `license.numero` (N° permis)                  | Identité personnelle, RGPD                |
| Clients                   | `ninea`                                       | Identifiant fiscal sénégalais             |
| Clients                   | `rccm`                                        | Registre commerce                         |
| Clients                   | `rib`                                         | Coordonnées bancaires, RGPD               |
| Clients                   | `solde`                                       | Données financières                       |
| Clients                   | `total_du` (factures)                         | Données financières                       |
| Leads                     | `budget`                                      | Données commerciales sensibles            |
| Contracts                 | `mensualite`, `caution`, `frais_installation` | Données financières                       |
| Invoices                  | `ht`, `tva`, `ttc`, `paye`, `reste`           | Tous montants financiers                  |
| Payments                  | `montant`                                     | Données financières                       |
| Stock                     | `prix_achat`, `prix_vente`, `marge`           | Données financières (masqué pour TECH)    |
| Reports                   | `ca` (chiffre d'affaires)                     | Confidentiel                              |
| Reports                   | `creances`                                    | Confidentiel                              |
| Reports                   | `mrr`                                         | Confidentiel                              |

### Implications design

Pour les mockups, Design peut représenter ces champs **masqués** (•••• ou ▒▒▒▒) pour les rôles non autorisés, ou **absents** du tableau. À discuter au cas par cas.

---

## 7. Mobile tab profiles (bottom navigation)

Source : `MOBILE_TAB_PROFILES` dans `permissionStructure.ts`.

Chaque rôle a un profil mobile qui définit :

- `tabs` : 4-5 onglets dans la bottom nav
- `defaultView` : écran de démarrage après login
- `hiddenTabs` : menus complètement masqués (ni bottom nav, ni "Plus")
- `showMore` : afficher le bouton "Plus" pour accéder aux autres écrans

| Rôle                       | Bottom tabs                                    | Default      | Hidden tabs                                           | "Plus" |
| -------------------------- | ---------------------------------------------- | ------------ | ----------------------------------------------------- | ------ |
| **CLIENT / SOUS_COMPTE**   | Fleet · Map · Dashboard · Reports · Settings   | Fleet        | —                                                     | ✓      |
| **TECH**                   | Tech · Agenda · Settings                       | Agenda       | Fleet, Dashboard, Monitoring, Support, Stock, Reports | ✗      |
| **AGENT_TRACKING**         | Dashboard · Fleet · Agenda · Tech · Support    | Dashboard    | —                                                     | ✓      |
| **COMMERCIAL / SALES**     | Prévente · Vente · Agenda · Fleet · Support    | Agenda       | —                                                     | ✓      |
| **COMPTABLE**              | Comptabilité · Agenda · Fleet · Tech · Support | Comptabilité | —                                                     | ✓      |
| **SUPPORT_AGENT**          | Support · Fleet · Vente · Agenda · Settings    | Support      | —                                                     | ✓      |
| **MANAGER**                | Dashboard · Fleet · Support · Agenda · Vente   | Dashboard    | —                                                     | ✓      |
| **ADMIN / RESELLER_ADMIN** | Dashboard · Fleet · Admin · Support · Settings | Dashboard    | —                                                     | ✓      |
| **SUPERADMIN**             | Dashboard · Fleet · Vente · Support · Agenda   | Dashboard    | —                                                     | ✓      |

### Profil par défaut

Si aucun profil ne matche : `MOBILE_DEFAULT_TABS = ['DASHBOARD', 'MAP', 'FLEET', 'TECH']` avec `defaultView = 'DASHBOARD'`.

---

## 8. Permissions implicites

Certaines permissions découlent d'autres :

| Permission                      | Implique automatiquement                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `MANAGE_LEADS` (legacy)         | `VIEW_LEADS` + `CREATE_LEADS` + `EDIT_LEADS` + `DELETE_LEADS`                                   |
| `MANAGE_CLIENTS` (legacy)       | `VIEW_CLIENTS` + `CREATE_CLIENTS` + `EDIT_CLIENTS` + `DELETE_CLIENTS`                           |
| `MANAGE_CONTRACTS` (legacy)     | `VIEW_CONTRACTS` + `CREATE_CONTRACTS` + `EDIT_CONTRACTS` + `DELETE_CONTRACTS`                   |
| `MANAGE_INVOICES` (legacy)      | `VIEW_INVOICES` + `CREATE_INVOICES` + `EDIT_INVOICES` + `DELETE_INVOICES` + `VIEW_QUOTES` + ... |
| `MANAGE_INTERVENTIONS` (legacy) | `VIEW_INTERVENTIONS` + `CREATE_INTERVENTIONS` + `EDIT_INTERVENTIONS` + `DELETE_INTERVENTIONS`   |
| `MANAGE_STOCK` (legacy)         | `VIEW_STOCK` + `CREATE_STOCK` + `EDIT_STOCK` + `DELETE_STOCK`                                   |
| `MANAGE_DEVICES` (legacy)       | `VIEW_DEVICES` + `CREATE_DEVICES` + `EDIT_DEVICES` + `DELETE_DEVICES`                           |
| `MANAGE_TICKETS` (legacy)       | `VIEW_TICKETS` + `CREATE_TICKETS` + `EDIT_TICKETS` + `DELETE_TICKETS`                           |
| `MANAGE_USERS`                  | `VIEW_USERS` + `CREATE_USERS` + `EDIT_USERS` + `DELETE_USERS`                                   |
| `MANAGE_ROLES`                  | `VIEW_ROLES` + `CREATE_ROLES` + `EDIT_ROLES` + `DELETE_ROLES`                                   |
| `MANAGE_TENANTS`                | `VIEW_TENANTS` + `CREATE_TENANTS` + `EDIT_TENANTS` + `DELETE_TENANTS`                           |
| `VIEW_FLEET`                    | `VIEW_VEHICLES` + `VIEW_DRIVERS` (alias d'accès flotte)                                         |

→ Le code TrackYu est en **transition** depuis les permissions "MANAGE*\*" (legacy, coarse-grained) vers les permissions fine-grained `VIEW*_`/`CREATE\__`/`EDIT*\*`/`DELETE*\*`. Nouveau code = privilégier fine-grained.

---

## 9. Comment utiliser ce document à l'intégration

Au moment d'intégrer un mockup Design (cf. [INTEGRATION_PLAYBOOK.md](INTEGRATION_PLAYBOOK.md)) :

1. Identifier l'écran dans le tableau §2 → savoir quels rôles le voient
2. Pour chaque section / colonne / bouton de l'écran :
   - Trouver la permission correspondante dans §3
   - Wrapper le composant : `{hasPermission('VIEW_X') && <Component />}`
3. Pour les data sensibles (§6), prévoir l'affichage masqué pour rôles non autorisés
4. Pour les écrans cross-tenant (§5), prévoir le dropdown "Filtrer par tenant" SUPERADMIN-only
5. Tester avec **au moins 2 rôles** (cf. PLAYBOOK §6.2) — typiquement ADMIN + CLIENT

### Exemple concret — Fleet

```tsx
// Dans FleetTable.tsx
const { user, hasPermission } = useAuth();

return (
  <div>
    {/* Tous voient la table */}
    <DataTable columns={baseColumns} />

    {/* Colonne Mensualité visible seulement si VIEW_FINANCE */}
    {hasPermission('VIEW_FINANCE') && <Column field="monthly_fee" />}

    {/* Bouton + Nouveau véhicule visible si CREATE_VEHICLES */}
    {hasPermission('CREATE_VEHICLES') && <Button>+ Nouveau véhicule</Button>}

    {/* Dropdown tenant uniquement SUPERADMIN */}
    {user.role === 'SUPERADMIN' && <TenantSelector />}

    {/* Filtre data : backend gère via JWT, frontend assume sa flotte uniquement pour CLIENT */}
  </div>
);
```

---

## 10. Sources de vérité (code)

| Source                                                                                                         | Rôle                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`types/auth.ts`](../../types/auth.ts)                                                                         | `Permission` enum (97 permissions) + `SystemUser` interface                                                                |
| [`contexts/AuthContext.tsx`](../../contexts/AuthContext.tsx)                                                   | `ROLE_DEFINITIONS` (12 rôles avec permissions par défaut) + `hasPermission()` API                                          |
| [`features/admin/permissions/permissionStructure.ts`](../../features/admin/permissions/permissionStructure.ts) | 17 modules × tabs × fields × actions (granularité fine, pour panneau RoleManager) + `SIDEBAR_MENU` + `MOBILE_TAB_PROFILES` |
| [`features/admin/permissions/types.ts`](../../features/admin/permissions/types.ts)                             | Types `ModulePermission`, `PermissionAction`                                                                               |
| [`features/admin/components/RoleManagerV2.tsx`](../../features/admin/components/RoleManagerV2.tsx)             | UI matrice de permissions (admin can edit role permissions)                                                                |

→ **En cas de doute**, le code prime sur ce document. Si écart constaté, mettre à jour ce document + entrée [`CHANGELOG.md`](CHANGELOG.md).

---

## 11. Évolution du RBAC

Toute évolution suit cet ordre :

1. Modification dans le code (`types/auth.ts` pour ajouter une permission, `AuthContext.tsx` pour ajouter un rôle, `permissionStructure.ts` pour ajouter un module)
2. Mise à jour de **ce document** (RBAC_MATRIX.md)
3. Entrée dans [`CHANGELOG.md`](CHANGELOG.md)
4. Si impact UX → mise à jour [BLUEPRINT.md](BLUEPRINT.md) §5 (variantes par rôle) si applicable
5. Si nouvel écran → entrée dans [SCREEN_MAP.md](SCREEN_MAP.md) avec rôles visibles

---

_Document de référence pour l'intégration des écrans avec garde-rôles. À garder à jour au fur et à mesure que le RBAC évolue._
