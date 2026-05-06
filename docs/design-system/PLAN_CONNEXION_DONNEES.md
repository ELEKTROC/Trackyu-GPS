# PLAN DE CONNEXION DONNÉES V2 — TrackYu

> Mapping complet V2 ↔ Backend. Basé sur : `docs/API_ENDPOINTS.md` (165 endpoints documentés) + investigation directe v1Router.js (80 routes montées) + schémas DB.
> Mis à jour : 2026-04-28

---

## LÉGENDE

| Symbole | Signification                                             |
| ------- | --------------------------------------------------------- |
| ✅      | Champ/endpoint disponible et compatible                   |
| ⚠️      | Disponible mais renommage/transformation nécessaire       |
| ❌      | Absent — à gérer (fallback, calcul, ou endpoint manquant) |
| 🔴      | Endpoint non exposé dans v1Router — à créer backend       |
| 🟡      | Endpoint existe mais non documenté dans API_ENDPOINTS.md  |

---

## ÉTAT CONNEXION PAR MODULE

| Module                                          | Statut                     | Priorité |
| ----------------------------------------------- | -------------------------- | -------- |
| Dashboard                                       | ✅ Phase A+B complet       | —        |
| Fleet liste                                     | ✅                         | —        |
| Alertes                                         | ✅                         | —        |
| Support/Tickets                                 | ✅                         | —        |
| Map sidebar + socket                            | ✅                         | —        |
| Tech/Interventions (List + Overview + Planning) | ✅                         | —        |
| Fleet Drawer (trips/fuel/alerts)                | ⏳                         | 🔴 P1    |
| Labels vehicleType FR                           | ⏳ fix 10 min              | 🔴 P1    |
| Vente (contrats/abonnements/factures/pipeline)  | ⏳                         | 🟠 P2    |
| Prévente/CRM (leads/pipeline/tasks)             | ⏳                         | 🟠 P2    |
| Admin (revendeurs/users/audit/marque blanche)   | ⏳                         | 🟠 P2    |
| Comptabilité (factures/journal/caisse/banque)   | ⏳                         | 🟡 P3    |
| Stock (boîtiers/SIM/SAV/mouvements)             | ⏳                         | 🟡 P3    |
| Agenda (interventions + tâches)                 | ⏳                         | 🟡 P3    |
| Rapports                                        | ⏳                         | 🟡 P3    |
| Settings (profil/tenant/users/notifs/apparence) | ⏳                         | 🟡 P3    |
| Monitoring (complet)                            | ✅ alertes · ⏳ reste mock | 🟡 P3    |

---

## 1. FLEET DRAWER — ONGLETS

### Onglet Activité (trajets)

**Endpoint** : `GET /fleet/vehicles/:id/trips`

| Champ V2 attendu       | Champ backend          | Statut                                    |
| ---------------------- | ---------------------- | ----------------------------------------- |
| `id`                   | `id`                   | ✅                                        |
| `startTime`            | `startTime`            | ✅                                        |
| `endTime`              | `endTime`              | ✅                                        |
| `distance` (km)        | `distance`             | ✅                                        |
| `duration` (min)       | `duration`             | ✅                                        |
| `startLat`, `startLng` | `startLat`, `startLng` | ✅                                        |
| `endLat`, `endLng`     | `endLat`, `endLng`     | ✅                                        |
| `avgSpeed`             | ❌ absent              | ⚠️ ignorer v1                             |
| `maxSpeed`             | ❌ absent              | ⚠️ ignorer v1                             |
| `startAddress`         | ❌ absent              | ⚠️ `GET /fleet/geocode?lat&lng` optionnel |
| `endAddress`           | ❌ absent              | ⚠️ idem                                   |

**Stats journalières** : `GET /fleet/vehicles/:id/day-stats` → `{ km, trips, avgSpeed }`

---

### Onglet Carburant

| Source                  | Endpoint                               | Champs retournés                                        |
| ----------------------- | -------------------------------------- | ------------------------------------------------------- |
| Historique niveaux      | `GET /fleet/vehicles/:id/fuel-history` | `[{ time, level, voltage }]`                            |
| Stats carburant         | `GET /fleet/vehicles/:id/fuel-stats`   | `{ avg, min, max }`                                     |
| Événements REFILL/THEFT | `GET /fuel-events/vehicle/:id`         | `[{ id, type, time, amount, levelBefore, levelAfter }]` |

| Champ V2 attendu               | Statut                          |
| ------------------------------ | ------------------------------- |
| `FuelPoint.time/level/voltage` | ✅                              |
| `FuelStats.avg/min/max`        | ✅                              |
| `FuelStats.current`            | ⚠️ = dernier point fuel-history |
| `FuelEvent.*`                  | ✅ complet                      |

---

### Onglet Alertes véhicule

**Endpoint** : `GET /alerts?vehicleId=:objectId&limit=20`
→ Réutiliser `useAlertsData` avec param supplémentaire. ✅ Aucun écart.

---

### Fix vehicleType FR

**Fichier** : `src/features/fleet/useFleetData.ts:86`

```typescript
// BUG actuel : 'car' détecté avant 'truck' → certains types → 'bus'
vtypeRaw.includes('bus') || vtypeRaw.includes('car') ? 'bus'  // ← FAUX

// Fix
vtypeRaw.includes('truck') || vtypeRaw.includes('camion') ? 'truck'
vtypeRaw.includes('bus')   ? 'bus'
vtypeRaw.includes('moto')  ? 'moto'
: 'car'
```

Labels FR à ajouter : `car→Voiture`, `truck→Camion`, `bus→Bus`, `moto→Moto`.

---

## 2. VENTE (VentePage — 7 onglets)

### Onglet Vue d'ensemble

**Sources** :

- Stats MRR : `GET /analytics/dashboard` → `revenueByMonth` ✅
- Pipeline leads : `GET /sales-pipeline` 🟡 (endpoint non documenté)
- Contrats actifs : `GET /contracts?status=ACTIVE` ✅

---

### Onglet Clients

**Endpoint** : `GET /clients` ou `GET /tiers?type=CLIENT`

| Champ V2 attendu | Champ backend (table `tiers`) | Statut                        |
| ---------------- | ----------------------------- | ----------------------------- |
| `id`             | `id`                          | ✅                            |
| `name`           | `name`                        | ✅                            |
| `email`          | `email`                       | ✅                            |
| `phone`          | `phone`                       | ✅                            |
| `status`         | `status`                      | ✅                            |
| `city`           | `city`                        | ✅                            |
| `vehicleCount`   | ❌ absent dans tiers          | ⚠️ COUNT sous-requête objects |
| `mrr`            | ❌ absent dans tiers          | ⚠️ via abonnements actifs     |
| `resellerName`   | `reseller_id` → join          | ⚠️ JOIN tiers                 |
| `createdAt`      | `created_at`                  | ⚠️ snake_case                 |

---

### Onglet Pipeline (Kanban leads)

**Endpoint principal** : `GET /leads` → table `leads`

| Champ V2 attendu     | Champ DB `leads`                                       | Statut                    |
| -------------------- | ------------------------------------------------------ | ------------------------- |
| `id`                 | `id`                                                   | ✅                        |
| `companyName`        | `company_name`                                         | ⚠️ snake_case             |
| `contactName`        | `contact_name`                                         | ⚠️ snake_case             |
| `status`             | `status` (NEW/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST) | ✅                        |
| `potentialValue`     | `potential_value`                                      | ⚠️ snake_case             |
| `assignedTo`         | `assigned_to` → UUID                                   | ⚠️ besoin JOIN users.name |
| `source`             | `source`                                               | ✅                        |
| `score`              | `score`                                                | ✅                        |
| `qualification`      | `qualification` (COLD/WARM/HOT)                        | ✅                        |
| `sector`             | `sector`                                               | ✅                        |
| `interestedProducts` | `interested_products` (jsonb)                          | ⚠️ snake_case             |
| **Stage pipeline**   | ❌ `stage_id` → `GET /sales-pipeline/:id/stats` 🟡     | ⚠️ endpoint non documenté |
| **Tâches CRM**       | `GET /crm/tasks` ✅                                    | ✅                        |

**Endpoints pipeline non documentés** (trouvés dans salesPipelineRoutes) :

- `GET /sales-pipeline` — liste pipelines
- `GET /sales-pipeline/:id` — détail + stages
- `GET /sales-pipeline/:id/stats` — stats
- `POST /sales-pipeline/leads/:leadId/move` — déplacer lead dans le kanban

---

### Onglet Contrats / Abonnements

**Contrats** : `GET /contracts`

| Champ V2 attendu    | Champ DB `contracts`                   | Statut                 |
| ------------------- | -------------------------------------- | ---------------------- |
| `id`                | `id`                                   | ✅                     |
| `contractNumber`    | `contract_number`                      | ⚠️ snake_case          |
| `status`            | `status`                               | ✅                     |
| `startDate/endDate` | `start_date / end_date`                | ⚠️ snake_case          |
| `monthlyFee`        | `monthly_fee`                          | ⚠️ snake_case          |
| `clientName`        | `client_name` (JOIN tiers via findAll) | ✅ déjà jointuré       |
| `vehicleIds`        | `vehicle_ids` (jsonb array)            | ⚠️ snake_case          |
| `vehicleCount`      | `vehicle_ids` → `.length`              | ⚠️ calculer côté front |
| `resellerName`      | `reseller_name`                        | ✅                     |
| `currency`          | `currency`                             | ✅                     |
| `billingCycle`      | `billing_cycle`                        | ⚠️ snake_case          |
| `autoRenew`         | `auto_renew`                           | ⚠️ snake_case          |

**Abonnements** : `GET /subscriptions`

| Champ V2 attendu    | Champ DB `subscriptions`                      | Statut        |
| ------------------- | --------------------------------------------- | ------------- |
| `planName`          | `plan_name`                                   | ⚠️ snake_case |
| `status`            | `status`                                      | ✅            |
| `monthlyFee`        | `monthly_fee`                                 | ⚠️ snake_case |
| `vehicleCount`      | `vehicle_count`                               | ✅            |
| `vehicleId`         | `vehicle_id`                                  | ⚠️ snake_case |
| `startDate/endDate` | `start_date / end_date`                       | ⚠️ snake_case |
| `nextBillingDate`   | `next_billing_date`                           | ⚠️ snake_case |
| **Générer facture** | `POST /subscriptions/:id/generate-invoice` 🟡 | ✅            |

---

### Onglet Planning Gantt Factures

**Endpoint** : `GET /finance/invoices`

| Champ V2 attendu   | À vérifier dans financeRoutes | Statut     |
| ------------------ | ----------------------------- | ---------- |
| `id`, `number`     | ✅ probable                   | à vérifier |
| `clientName`       | ⚠️ JOIN tiers probable        | à vérifier |
| `amount`, `status` | ✅ probable                   | à vérifier |
| `dueDate`          | ⚠️ `due_date` snake_case      | à vérifier |
| **Devis**          | `GET /finance/quotes`         | ✅         |

---

### Onglet Paiements

**Endpoint** : `GET /finance/payments`

---

### Onglet Recouvrement

**Endpoint** : `GET /recovery` 🟡 (non documenté, route montée dans v1Router)

---

## 3. PRÉVENTE — CRM (PréventePage — 7 onglets)

### Onglets Leads (liste + Kanban)

→ Voir section Vente > Pipeline ci-dessus. Mêmes endpoints.

### Onglet Tâches CRM

**Endpoint** : `GET /crm/tasks`

| Champ V2                           | Statut      |
| ---------------------------------- | ----------- |
| `id`, `title`, `status`, `dueDate` | ✅ probable |
| `leadId`, `assignedTo`             | ✅ probable |

### Onglet Activités CRM

**Endpoint** : `GET /crm-activities` 🟡 (non documenté)

### Onglet Scoring

**Endpoint** : `GET /lead-scoring` 🟡 (non documenté)

### Onglet Scripts / Automation

**Endpoint** : `GET /crm/automation-rules` 🟡 (non documenté, dans crmRoutes)

---

## 4. ADMINISTRATION (AdminPage — 13 onglets)

### Panel Revendeurs

**Endpoint** : `GET /resellers/stats/summary` 🟡 + `GET /tiers?type=RESELLER`

Table `tiers` (type=RESELLER) :

| Champ V2 attendu | Champ DB                          | Statut                        |
| ---------------- | --------------------------------- | ----------------------------- |
| `name`           | `name`                            | ✅                            |
| `email`          | `email`                           | ✅                            |
| `status`         | `status`                          | ✅                            |
| `city`           | `city`                            | ✅                            |
| `createdAt`      | `created_at`                      | ⚠️ snake_case                 |
| `plan`           | ❌ via contrat actif              | ⚠️ JOIN contracts             |
| `userCount`      | ❌ sous-requête                   | ⚠️ COUNT users                |
| `vehicleCount`   | ❌ sous-requête                   | ⚠️ COUNT objects              |
| `mrr`            | ❌ calcul finance                 | ⚠️ `GET /resellers/:id/stats` |
| **Stats**        | `GET /resellers/stats/summary` 🟡 | à explorer                    |

### Panel Équipe TKY

**Endpoint** : `GET /users?tenant_id=tenant_default`
→ Tous les users staff TrackYu. ✅ disponible.

### Panel Marque blanche

**Endpoint** : `GET /tenants/:id` + `PUT /tenants/:id` + `GET /admin-features` 🟡

Table `tenants` (via `GET /settings/tenant`) :

- `primaryColor`, `logo`, `appName`, `font`, `borderRadius` → à vérifier dans settingsRoutes

### Panel Intégrations

**Endpoint** : `GET /admin-features/integrations` 🟡

### Panel Webhooks

**Endpoint** : `GET /admin-features/webhooks` 🟡

### Panel Audit Logs

**Endpoint** : `GET /audit-logs` ✅ (route montée, table `audit_logs` existe)

Table `audit_logs` :

| Champ V2 attendu                             | À vérifier                    |
| -------------------------------------------- | ----------------------------- |
| `timestamp`                                  | `created_at` ⚠️               |
| `userId` + `userName`                        | `user_id` → JOIN users ⚠️     |
| `action` (CREATE/UPDATE/DELETE/LOGIN/EXPORT) | `action` ✅ probable          |
| `entityType` + `entityId`                    | `entity_type`, `entity_id` ⚠️ |
| `details`                                    | `details` ✅ probable         |
| `ipAddress`                                  | à vérifier                    |

### Panel Corbeille

**Endpoint** : `GET /trash` 🟡 (non documenté, route montée)

### Panel Templates Documents/Messages

**Endpoint** : `GET /admin-features/templates` 🟡 + `GET /message-templates` 🟡

### Panel API Keys

**Endpoint** : `GET /api-keys` ✅ (documenté)

### Panel Rôles & Permissions

**Endpoint** : `GET /roles` + `GET /roles/permissions/list` ✅ (documentés)

---

## 5. COMPTABILITÉ (ComptaPage — 6 onglets)

### Onglet Factures

**Endpoint** : `GET /finance/invoices`

À investiguer : structure réponse (invoiceNumber, clientName, amount, status, dueDate, paidDate).

### Onglet Devis

**Endpoint** : `GET /finance/quotes` ✅

### Onglet Journal Écritures

**Endpoint** : `GET /finance/journal-entries` ✅

### Onglet Finance — Caisse

**Endpoint** : `GET /finance/cash-closings` ✅

### Onglet Finance — Banque

**Endpoint** : `GET /bank-transactions` 🟡 (non documenté, route montée)

Table `bank_accounts` existe en DB.

### Onglet Dépenses

**Endpoint** : `GET /finance/expenses` ✅

---

## 6. STOCK (StockPage — 5 onglets)

### Onglet Boîtiers GPS + BOX

**Endpoint** : `GET /devices` ✅

`GET /devices` retourne en une seule requête **devices + SIM cards combinés** (via `findAllDevices` + `findAllSimCards` en `Promise.all`). Discriminer côté frontend par `type`.

| Champ V2 attendu                            | Backend                          | Statut                          |
| ------------------------------------------- | -------------------------------- | ------------------------------- |
| `id`, `imei`, `model`, `status`             | ✅                               | ✅                              |
| `type` (`GPS_TRACKER` / `BOX` / `SIM`)      | `type`                           | ✅                              |
| `assignedVehicle`                           | `assigned_vehicle_id`            | ⚠️ snake_case                   |
| `location` (`CENTRAL` / `TECHNICIAN` / ...) | `location`                       | ✅                              |
| `technicianId`                              | `technician_id`                  | ⚠️ snake_case                   |
| `protocol`                                  | ❌ absent dans liste             | ⚠️ via `GET /devices/connected` |
| `lastSeen`                                  | ❌ absent dans liste             | ⚠️ via `GET /devices/connected` |
| `diagnostics`                               | `GET /devices/:imei/diagnostics` | ✅ appel séparé                 |

### Onglet SIM

**Endpoint** : `GET /devices` (même endpoint, sans filtre) ✅

**Réponse** : inclut les SIM (`type === 'SIM'`) depuis la table `sim_cards` (4 571 lignes).
**Filtrage côté frontend** : `rows.filter(d => d.type === 'SIM')`.

Table `sim_cards` exposée : `{ id, iccid, phone_number, operator, status, device_id, plan_type, activation_date, expiry_date, data_limit_mb }`.

### Onglet SAV / RMA

**Endpoint** : `GET /rma` 🟡 (non documenté, route montée)
`GET /rma/stats` 🟡

Table implicite RMA avec statuts : PENDING → APPROVED → IN_TRANSIT → RECEIVED → REPAIRED → REPLACED → CLOSED.

### Onglet Mouvements Stock

**Endpoint** : `GET /stock-movements` 🟡 (non documenté, route montée)

Table `stock_movements` : `{ id, tenant_id, device_id, date, type, from_location, to_location, from_status, to_status, user_id, details }`

---

## 7. AGENDA (AgendaPage — 3 onglets)

### Onglets Tous + Technique

**Plan** : réutiliser `useInterventionsData` déjà créé.

| Champ `AgdEvent` V2 | Source `Intervention`       | Statut        |
| ------------------- | --------------------------- | ------------- |
| `id`                | `id`                        | ✅            |
| `type: 'tech'`      | fixe                        | ✅            |
| `label`             | `type + ' - ' + vehicle`    | ⚠️ construire |
| `nature`            | `nature`                    | ✅            |
| `client`            | `client`                    | ✅            |
| `agent`             | tech name via `techs` array | ✅            |
| `status`            | mapper TI_STATUS inverse    | ⚠️            |
| `vehicle`           | `vehicle`                   | ✅            |
| `location`          | `address`                   | ✅            |
| `duration`          | `duration + 'h'`            | ⚠️ formatter  |
| `desc`              | `notes`                     | ✅            |
| `day` (int Avril)   | dériver de `scheduledDate`  | ⚠️            |

### Onglet Commercial

**Endpoint** : `GET /crm/tasks` ✅

| Champ `AgdEvent` V2 | Source CRM Task                | Statut      |
| ------------------- | ------------------------------ | ----------- |
| `label`             | `title` ou `subject`           | à vérifier  |
| `client`            | `lead.company_name` via leadId | ⚠️ JOIN     |
| `agent`             | `assigned_to` → user name      | ⚠️ JOIN     |
| `status`            | `status`                       | ✅          |
| `prio`              | `priority`                     | ✅ probable |

---

## 8. RAPPORTS (ReportsPage — 11 onglets)

### Rapports véhicule (km, alertes, carburant)

| Rapport                  | Endpoint                                    | Statut               |
| ------------------------ | ------------------------------------------- | -------------------- |
| Rapport véhicule PDF     | `POST /fleet/vehicles/:id/report` ✅        | ✅                   |
| Rapport intervention PDF | `POST /tech/interventions/:id/report` ✅    | ✅                   |
| Export trajets           | `GET /fleet/vehicles/:id/trips` → CSV front | ⚠️ export côté front |
| Analytics flotte         | `GET /fleet/analytics?period=30d` ✅        | ✅                   |
| Stats alertes            | `GET /monitoring/alerts/stats` ✅           | ✅                   |

### Rapports financiers (MRR, facturation)

| Rapport          | Endpoint                                       | Statut               |
| ---------------- | ---------------------------------------------- | -------------------- |
| MRR mensuel      | `GET /analytics/dashboard` → revenueByMonth ✅ | ✅                   |
| Factures période | `GET /finance/invoices?from=&to=`              | ⚠️ params à vérifier |
| Recouvrement     | `GET /recovery` 🟡                             | à explorer           |

---

## 9. SETTINGS (SettingsPage — 5 groupes)

### Profil utilisateur

**Endpoint** : `GET /settings/profile` + `PUT /settings/profile` + `PUT /settings/password` ✅

### Paramètres tenant (Entreprise)

**Endpoint** : `GET /settings/tenant` + `PUT /settings/tenant` ✅

### Gestion utilisateurs

**Endpoint** : `GET /users` + CRUD ✅

### Notifications

**Endpoint** : `GET /settings/notifications` + `PUT /settings/notifications` ✅

### Apparence (AppearanceProvider)

**Endpoint** : `GET /tenants/current` ✅ (déjà branché dans AppearanceContext)

---

## 10. MONITORING (MonitoringPage — 7 onglets)

| Onglet                | Endpoint                                             | Statut     |
| --------------------- | ---------------------------------------------------- | ---------- |
| Flotte (alertes)      | `GET /alerts` ✅                                     | ✅ branché |
| Pipeline GPS          | `GET /monitoring/gps-stats` ✅                       | ⏳ mock    |
| Alertes firing        | `GET /system/alerts/firing` ✅                       | ⏳ mock    |
| Hors ligne            | `GET /fleet/vehicles?status=OFFLINE` ✅              | ⏳ mock    |
| Anomalies GPS         | `GET /position-anomalies` ✅                         | ⏳ mock    |
| Système               | `GET /system/stats` + `/system/monitoring-health` ✅ | ⏳ mock    |
| Activité utilisateurs | `GET /monitoring/user-activity` ✅                   | ⏳ mock    |

---

## ENDPOINTS NON DOCUMENTÉS DANS API_ENDPOINTS.MD (🟡 à ajouter)

Ces routes sont montées dans v1Router mais absentes du fichier de documentation :

| Route                          | Fichier               | Usage V2                     |
| ------------------------------ | --------------------- | ---------------------------- |
| `GET /sales-pipeline`          | salesPipelineRoutes   | PréventePage Pipeline Kanban |
| `GET /lead-scoring`            | leadScoringRoutes     | PréventePage Scoring         |
| `GET /crm-activities`          | crmActivityRoutes     | CRM activités                |
| `GET /recovery`                | recoveryRoutes        | Vente Recouvrement           |
| `GET /credit-notes`            | creditNoteRoutes      | Comptabilité                 |
| `GET /supplier-invoices`       | supplierInvoiceRoutes | Comptabilité fournisseurs    |
| `GET /bank-transactions`       | bankTransactionRoutes | Comptabilité Banque          |
| `GET /budgets`                 | budgetRoutes          | Comptabilité                 |
| `GET /subscriptions`           | subscriptionRoutes    | Vente Abonnements            |
| `GET /resellers/stats/summary` | resellerStatsRoutes   | Admin Revendeurs             |
| `GET /audit-logs`              | auditRoutes           | Admin Audit                  |
| `GET /stock-movements`         | stockMovementRoutes   | Stock Mouvements             |
| `GET /rma`                     | rmaRoutes             | Stock SAV/RMA                |
| `GET /trash`                   | trashRoutes           | Admin Corbeille              |
| `GET /admin-features/...`      | adminFeatureRoutes    | Admin panels                 |
| `GET /branches`                | branchRoutes          | Map (déjà utilisé)           |
| `GET /eco-driving-profiles`    | ecoDrivingRoutes      | Fleet score conduite         |
| `GET /tech-settings`           | techSettingsRoutes    | Settings Tech                |
| `GET /ai`                      | aiRoutes              | IA Assistant                 |

---

---

## DONNÉES V2 SANS ENDPOINT BACKEND (🔴 à créer ou à décider)

> Analyse exhaustive des pages encore en mock. Ces données sont **affichées en V2** mais n'ont aucune source backend identifiée.

### Criticité

| Symbole | Signification                                  |
| ------- | ---------------------------------------------- |
| 🔴      | Bloquant — données métier core                 |
| 🟠      | Important — fonctionnalité attendue            |
| 🟡      | Nice-to-have — peut rester mock temporairement |

---

### VENTE — 13 données manquantes

| Donnée V2                                            | Onglet       | Criticité | Action suggérée                                    |
| ---------------------------------------------------- | ------------ | --------- | -------------------------------------------------- |
| Churn rate (%) + Retention rate (%)                  | Overview     | 🟠        | Calculer depuis contrats résiliés / total          |
| Segmentation client (VIP/Premium/Standard)           | Clients      | 🟡        | Ajouter champ `segment` dans tiers                 |
| Indicateur santé client (%)                          | Clients      | 🟡        | Calcul composite (paiements + activité)            |
| Probabilité closing deal (%)                         | Pipeline     | 🟠        | Ajouter sur lead ou stage pipeline                 |
| Type deal (NEW/RENEWAL/UPSELL)                       | Pipeline     | 🟠        | Ajouter champ `deal_type` sur lead                 |
| **Dossiers de recouvrement**                         | Recouvrement | 🔴        | Table `recovery_cases` + endpoint `/recovery`      |
| **Scoring risque client** (CRITICAL/HIGH/MEDIUM/LOW) | Recouvrement | 🔴        | Calcul ou endpoint `/recovery/:id/risk`            |
| **Historique relances** (count + dates)              | Recouvrement | 🔴        | Table `reminders` + `/reminders` (route montée ✅) |
| **Workflow actions recouvrement**                    | Recouvrement | 🔴        | `/recovery` à investiguer                          |
| Distribution temporelle factures (Gantt)             | Planning     | 🟡        | Calcul frontend depuis `/finance/invoices`         |
| Activité facturation live (flux)                     | Overview     | 🟡        | WebSocket ou polling                               |
| Revenue mix par offre/SKU                            | Overview     | 🟡        | `/finance/invoices` + segmentation                 |
| **Codes promo / remises volume**                     | —            | 🟡        | Pas prévu backend                                  |

---

### ADMIN — 28 données manquantes

| Donnée V2                                           | Panel          | Criticité | Action suggérée                              |
| --------------------------------------------------- | -------------- | --------- | -------------------------------------------- |
| **Solde + impayés revendeur**                       | Revendeurs     | 🔴        | `/resellers/:id/stats` (route montée 🟡)     |
| **DSO revendeur (jours retard)**                    | Revendeurs     | 🔴        | Calcul depuis factures revendeur             |
| **Logo / favicon / assets marque blanche**          | Marque blanche | 🔴        | `/upload` (route montée ✅) + champ tenant   |
| **Couleur accent tenant**                           | Marque blanche | 🔴        | `GET/PUT /settings/tenant` (à vérifier)      |
| **Police typographique**                            | Marque blanche | 🟠        | Idem                                         |
| **Densité UI**                                      | Marque blanche | 🟠        | Idem                                         |
| **Style sidebar**                                   | Marque blanche | 🟠        | Idem                                         |
| **Border radius preset**                            | Marque blanche | 🟠        | Idem                                         |
| Firmware version boîtier                            | Config devices | 🟡        | Champ non exposé dans `/devices`             |
| Configuration protocoles                            | Config devices | 🟡        | `/monitoring/gps-config` partiellement       |
| Ping interval + sleep mode                          | Config devices | 🟡        | Pas prévu backend                            |
| Métriques appels webhooks (last call, success rate) | Webhooks       | 🟠        | `/webhook-deliveries` (route montée 🟡)      |
| Paramètres système (fuseau, devise, format date)    | Système        | 🔴        | `/settings/tenant` ou `/settings/system`     |
| Config map provider                                 | Système        | 🟡        | Pas prévu                                    |
| Session TTL + 2FA                                   | Système        | 🟠        | `/settings/system` à créer                   |
| Rate limit API                                      | Système        | 🟡        | Pas prévu                                    |
| **Quotas (max users, max véhicules)**               | Organisation   | 🟠        | Champ tenant ou plan                         |
| Plan entreprise                                     | Organisation   | 🟠        | Via `/subscriptions` ou tenant               |
| **Gestion intégrations tierces**                    | Intégrations   | 🟠        | `/integration-credentials` (route montée 🟡) |
| Canaux support (WhatsApp/Email/Tel) + horaires      | Help center    | 🟡        | `/faq` + settings                            |
| Chatbot IA enabled                                  | Help center    | 🟡        | Pas prévu                                    |
| Statistiques utilisation templates                  | Templates      | 🟡        | Compteur à ajouter                           |

---

### PRÉVENTE — 5 données manquantes

| Donnée V2                               | Onglet          | Criticité | Action suggérée                                  |
| --------------------------------------- | --------------- | --------- | ------------------------------------------------ |
| Source lead par canal (top sources 30j) | Overview        | 🟠        | Calculer depuis `leads.source` (champ existe ✅) |
| **Catalogue produits/offres**           | Catalogue       | 🟠        | `/catalog` (route montée 🟡)                     |
| **Séquences email/SMS automatisées**    | Automatisations | 🟡        | `/crm/automation-rules` (route montée 🟡)        |
| Formulaires web entrants                | Inscriptions    | 🟡        | `/registration-requests` (route montée 🟡)       |
| Détail devis (liste + filtre)           | Devis           | 🟠        | `/finance/quotes` ✅ — juste à connecter         |

---

### STOCK — 13 données manquantes

| Donnée V2                                 | Onglet      | Criticité | Action suggérée                                         |
| ----------------------------------------- | ----------- | --------- | ------------------------------------------------------- |
| **Alertes stock sous seuil**              | Overview    | 🔴        | Calculer depuis devices + seuils configurés             |
| **Localisation entrepôt boîtier**         | Boîtiers    | 🟠        | Champ `location` dans devices ✅ (à afficher)           |
| **SIM : opérateur / expiration / MSISDN** | SIM         | 🔴        | `/devices` retourne SIM via `sim_cards` ✅ — à filtrer  |
| **Inventaire accessoires**                | Accessoires | 🔴        | Table `spare_parts` via `/tech/parts` (route montée ✅) |
| **Dossiers SAV/RMA**                      | SAV/RMA     | 🔴        | `/rma` (route montée 🟡)                                |
| Cause défaut / état RMA                   | SAV/RMA     | 🔴        | Idem                                                    |
| Délai RMA (days in repair)                | SAV/RMA     | 🟠        | Idem                                                    |
| Mouvements stock (historique)             | Mouvements  | 🟠        | `/stock-movements` (route montée 🟡)                    |

> ⚠️ Note : Accessoires ≠ boîtiers GPS. Les accessoires (câbles, relais, capteurs) sont dans `spare_parts` accessible via `GET /tech/parts`.

---

### RAPPORTS — 4 données manquantes

| Donnée V2                                | Criticité | Action suggérée                                                             |
| ---------------------------------------- | --------- | --------------------------------------------------------------------------- |
| **Exécution rapport à la demande**       | 🟠        | Endpoints PDF par module existent (`POST /fleet/vehicles/:id/report`, etc.) |
| **Envoi programmé par email**            | 🟠        | `/send` (route montée 🟡) + `/reminders`                                    |
| **Stockage/historique rapports générés** | 🟡        | Pas prévu backend                                                           |
| **Catalogue rapports avec métadonnées**  | 🟡        | Frontend uniquement (liste statique)                                        |

---

### RÉCAPITULATIF

| Page         | Champs sans endpoint | Priorité max                                   |
| ------------ | -------------------- | ---------------------------------------------- |
| **Admin**    | 22                   | 🔴 Marque blanche + Revendeurs solde + Système |
| **Vente**    | 13                   | 🔴 Recouvrement workflow                       |
| **Stock**    | 13                   | 🔴 Alertes + SIM + Accessoires + RMA           |
| **Prévente** | 5                    | 🟠 Catalogue + Devis                           |
| **Rapports** | 4                    | 🟠 Exécution + Envoi                           |
| **TOTAL**    | **57**               | —                                              |

> **Bonne nouvelle** : la majorité des 🟡 sont des routes déjà montées dans v1Router mais non documentées (`/rma`, `/stock-movements`, `/recovery`, `/resellers`, `/integration-credentials`, `/webhook-deliveries`, `/catalog`, `/crm/automation-rules`). Il suffit d'investiguer leur structure et de connecter.

## ENDPOINT MANQUANT BACKEND (🔴 à créer)

Aucun endpoint manquant identifié à ce stade — `GET /devices` couvre boîtiers + SIM en une seule requête.

---

## RÈGLES DE MAPPING GÉNÉRALES

### snake_case → camelCase

Le backend retourne les champs DB en snake_case pour `i.*` (SELECT direct). Les controllers qui construisent des objets explicitement retournent du camelCase.

**Pattern frontend** :

```typescript
// Toujours gérer les deux formes au cas où
const value = v.camelCase ?? v.snake_case ?? fallback;
```

### Enveloppes de réponse

```typescript
// Pattern universel (utilisé dans useFleetData, useTickets, etc.)
const raw = Array.isArray(data) ? data : ((data as any)?.data ?? []);
```

### Champs joints fréquents disponibles

- `client_name` : jointure tiers (déjà dans contracts.findAll, interventions.findAll)
- `reseller_name` : jointure tiers (disponible dans contracts)
- `vehicle_plate` : jointure objects (disponible dans interventions)
- `technician_name` : jointure users — **disponible dans `/tech/interventions/:id` mais PAS dans la liste**

---

_Mis à jour : 2026-04-28. Approfondir au cas par cas à chaque sprint._
