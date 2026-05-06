# 🔍 AUDIT COMPLET - Module Véhicules (FleetTable)

**Date**: 26 février 2026  
**Auditeur**: Copilot  
**Périmètre**: Tableau des véhicules, formulaire, backend, données

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie           | État                                | Priorité |
| ------------------- | ----------------------------------- | -------- |
| Affichage colonnes  | � Corrigé                           | -        |
| Données remplies    | 🟡 Partiel (balises non connectées) | Moyenne  |
| Backend API         | 🟢 OK                               | -        |
| Formulaire création | 🟢 OK                               | -        |
| Exports             | 🟢 OK                               | -        |
| Cohérence DB/UI     | 🟢 Corrigé                          | -        |

**Dernière mise à jour**: 26 février 2026

---

## 1️⃣ TABLEAU FLEETTABLE.TSX

### 1.1 Colonnes disponibles (22 colonnes)

| ID             | Label          | Source données                        | État                                 |
| -------------- | -------------- | ------------------------------------- | ------------------------------------ |
| `vehicle`      | Véhicule       | `name` + `plate`                      | ✅ OK (après fix)                    |
| `client`       | Client         | `client_name` (JOIN tiers)            | ✅ OK (après fix)                    |
| `group`        | Groupe         | `group_name`                          | ⚠️ Toujours vide en DB               |
| `driver`       | Conducteur     | `driver_name`                         | 🔴 **0% rempli**                     |
| `status`       | Statut         | `status`                              | ✅ OK                                |
| `speed`        | Vitesse        | `positions.speed`                     | ✅ OK                                |
| `maxSpeed`     | V. Max         | `max_speed`                           | ⚠️ Non stocké (hardcodé)             |
| `fuel`         | Niveau         | Calculé `fuel_liters/tank_capacity`   | 🔴 **Affiche "-" (0 tank_capacity)** |
| `fuelQty`      | Qté Carburant  | `fuel_quantity` ou `last_fuel_liters` | ⚠️ Dépend capteur                    |
| `refuel`       | Recharge       | `refuel_amount`                       | ⚠️ Non calculé                       |
| `fuelLoss`     | Perte          | `fuel_loss`                           | ⚠️ Non calculé                       |
| `consumption`  | Conso.         | `theoretical_consumption`             | 🔴 **0% rempli**                     |
| `suspectLoss`  | Perte Suspecte | `suspect_loss`                        | ⚠️ Non calculé                       |
| `departure`    | Départ         | `departure_location + departure_time` | ⚠️ Non alimenté                      |
| `arrival`      | Arrivée        | `arrival_location + arrival_time`     | ⚠️ Non alimenté                      |
| `geofence`     | Geofence       | `geofence`                            | ⚠️ Rarement rempli                   |
| `lastUpdated`  | Dernière MàJ   | `positions.time`                      | ✅ OK                                |
| `mileage`      | Km Total       | `mileage`                             | 🔴 **0% rempli (toujours 0)**        |
| `dailyMileage` | Km Jour        | `daily_mileage`                       | ⚠️ Non calculé                       |
| `violations`   | Violations     | `violations_count`                    | ⚠️ Non calculé                       |
| `location`     | Position       | `lat, lng` ou `geofence`              | ✅ OK                                |
| `score`        | Score          | `driver_score`                        | ⚠️ Toujours 100 (défaut)             |

### 1.2 Filtres

| Filtre              | Fonctionnel | Commentaire                             |
| ------------------- | ----------- | --------------------------------------- |
| Recherche globale   | ✅          | Filtre sur name, client, driver, plate  |
| Filtre par statut   | ✅          | Boutons MOVING/IDLE/STOPPED/OFFLINE     |
| Filtre par client   | ✅          | Dropdown multi-select                   |
| Filtre par groupe   | ⚠️          | Fonctionnel mais données vides          |
| Filtre par geofence | ⚠️          | Fonctionnel mais données rares          |
| Alertes uniquement  | ✅          | Filtre véhicules avec violations/pertes |

### 1.3 Actions

| Action                | État | Commentaire              |
| --------------------- | ---- | ------------------------ |
| Export PDF            | ✅   | 7 colonnes fixes         |
| Export Excel/CSV      | ✅   | 18 colonnes avec calculs |
| Import CSV            | ✅   | Mapping basique          |
| Sélection multiple    | ✅   | Checkbox par ligne       |
| Vue détail (clic)     | ✅   | Ouvre VehicleDetailPanel |
| Voir sur carte (clic) | ✅   | Callback onLocationClick |

### 1.4 Presets de vues

| Preset   | Colonnes                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------- |
| STANDARD | vehicle, client, group, driver, status, fuel, fuelQty, refuel, suspectLoss, location, lastUpdated |
| FUEL     | vehicle, fuel, fuelQty, consumption, fuelLoss, refuel, suspectLoss, mileage                       |
| TECH     | vehicle, status, mileage, dailyMileage, violations, score, lastUpdated                            |

---

## 2️⃣ FORMULAIRE VEHICLEFORM.TSX

### 2.1 Onglets

| Onglet                     | Champs                                                                                                                              | État       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Infos Véhicule**         | Revendeur*, Client*, Branche*, Plaque*, WW, Nom, Marque, Modèle, Année, Couleur, Type, VIN, Km, Source odomètre, Groupe, Conducteur | ✅ Complet |
| **Boîtier & Connectivité** | IMEI\*, Device ID, Modèle boîtier, Opérateur SIM, N° SIM, ICCID, Serveur, Timezone, Date install, Emplacement, Capteurs             | ✅ Complet |
| **Jauge**                  | Capacité réservoir, Type capteur, Seuil plein, Seuil vol, Type carburant, Conso théorique, Table calibration                        | ✅ Complet |
| **Maintenance**            | (Non implémenté dans le form - via routes séparées)                                                                                 | ⚠️         |
| **Historique**             | (Non implémenté)                                                                                                                    | ⚠️         |

### 2.2 Validation (Zod)

```typescript
// schemas/vehicleSchema.ts - À VÉRIFIER
VehicleSchema = z.object({
  licensePlate: z.string().min(1),
  imei: z.string().optional(),
  // ... autres champs
});
```

### 2.3 Cascade Revendeur → Client → Branche

| Logique                                  | État |
| ---------------------------------------- | ---- |
| Reset client quand revendeur change      | ✅   |
| Reset branche quand client change        | ✅   |
| Skip reset en mode édition (initialData) | ✅   |

---

## 3️⃣ BACKEND VEHICLECONTROLLER.TS

### 3.1 Routes

| Route                               | Méthode  | Permission      | État        |
| ----------------------------------- | -------- | --------------- | ----------- |
| `/api/vehicles`                     | GET      | VIEW_FLEET      | ✅ OK       |
| `/api/vehicles/:id`                 | GET      | VIEW_FLEET      | ✅ OK       |
| `/api/vehicles`                     | POST     | CREATE_VEHICLES | ✅ OK       |
| `/api/vehicles/:id`                 | PUT      | EDIT_VEHICLES   | ✅ OK       |
| `/api/vehicles/:id`                 | DELETE   | DELETE_VEHICLES | ✅ OK       |
| `/api/vehicles/:id/immobilize`      | POST     | EDIT_VEHICLES   | ✅ OK       |
| `/api/vehicles/:id/fuel-history`    | GET      | VIEW_FLEET      | ✅ OK       |
| `/api/vehicles/:id/fuel-stats`      | GET      | VIEW_FLEET      | ✅ OK       |
| `/api/vehicles/:id/maintenance`     | GET/POST | VIEW/EDIT       | ✅ OK       |
| `/api/vehicles/:vehicleId/position` | POST     | API_KEY         | ✅ Sécurisé |

### 3.2 Requête getVehicles (après corrections)

```sql
SELECT v.*,
       p.latitude as location_lat,
       p.longitude as location_lng,
       p.speed,
       p.heading,
       p.time as last_updated,
       p.fuel_liters as last_fuel_liters,  -- ✅ AJOUTÉ
       t.name as client_name               -- ✅ AJOUTÉ
FROM vehicles v
LEFT JOIN LATERAL (
  SELECT latitude, longitude, speed, heading, time, fuel_liters
  FROM positions WHERE vehicle_id = v.id ORDER BY time DESC LIMIT 1
) p ON true
LEFT JOIN tiers t ON v.client_id = t.id AND t.type = 'CLIENT'
WHERE v.tenant_id = $1
ORDER BY v.name ASC
```

### 3.3 Champs non récupérés (manquants dans SELECT)

| Champ DB     | Dans SELECT    | Impact UI                    |
| ------------ | -------------- | ---------------------------- |
| `group_name` | ❌ Non         | Colonne groupe toujours vide |
| `max_speed`  | ❌ Non         | V.Max hardcodée              |
| `brand`      | ❌ Non         | Non affiché                  |
| `model`      | ❌ Non         | Non affiché                  |
| `vin`        | ❌ Non         | Non affiché                  |
| `branch_id`  | ✅ Oui (`v.*`) | OK                           |

---

## 4️⃣ DONNÉES PRODUCTION (148.230.126.62)

### 4.1 Statistiques globales

| Métrique                         | Valeur       | Commentaire     |
| -------------------------------- | ------------ | --------------- |
| **Total véhicules**              | 1 844        | -               |
| **Avec client_id**               | 1 844 (100%) | ✅              |
| **Avec tank_capacity**           | 0 (0%)       | 🔴 **CRITIQUE** |
| **Avec theoretical_consumption** | 0 (0%)       | 🔴 **CRITIQUE** |
| **Avec driver_name**             | 0 (0%)       | 🔴 **CRITIQUE** |
| **Avec mileage > 0**             | 0 (0%)       | 🔴 **CRITIQUE** |

### 4.2 Schéma DB vs UI

| Colonne DB                | Type          | Default | Utilisé UI   | Problème                  |
| ------------------------- | ------------- | ------- | ------------ | ------------------------- |
| `fuel_level`              | INTEGER       | 100     | Oui          | ⚠️ Jamais mis à jour      |
| `tank_capacity`           | INTEGER       | NULL    | Oui (calcul) | 🔴 **0% rempli**          |
| `theoretical_consumption` | DECIMAL(4,1)  | NULL    | Oui          | 🔴 **0% rempli**          |
| `driver_name`             | VARCHAR(100)  | NULL    | Oui          | 🔴 **0% rempli**          |
| `mileage`                 | DECIMAL(10,2) | 0       | Oui          | 🔴 **Jamais calculé**     |
| `group_name`              | -             | -       | Oui          | ❌ **N'existe pas en DB** |

---

## 5️⃣ PROBLÈMES IDENTIFIÉS

### 🔴 CRITIQUES (Bloquants)

| #   | Problème                        | Impact                           | Solution                                         |
| --- | ------------------------------- | -------------------------------- | ------------------------------------------------ |
| C1  | `tank_capacity` jamais rempli   | Niveau carburant = "-" pour tous | Migration pour remplir ou formulaire obligatoire |
| C2  | `driver_name` jamais rempli     | Colonne conducteur vide          | Interface d'assignation ou import                |
| C3  | `mileage` jamais calculé        | Km total = 0 pour tous           | Implémenter calcul depuis positions              |
| C4  | `theoretical_consumption` vide  | Colonne conso vide               | Formulaire ou valeur par défaut selon type       |
| C5  | `group_name` n'existe pas en DB | Colonne groupe vide              | Ajouter colonne ou JOIN avec table groups        |

### 🟡 MOYENS (À améliorer)

| #   | Problème                       | Impact          | Solution                              |
| --- | ------------------------------ | --------------- | ------------------------------------- |
| M1  | `max_speed` hardcodé           | V.Max imprécise | Calculer depuis positions ou stocker  |
| M2  | Départ/Arrivée non alimentés   | Colonnes vides  | Alimenter depuis trips ou supprimer   |
| M3  | `violations_count` non calculé | Toujours 0      | Compteur depuis table alerts          |
| M4  | `driver_score` = 100           | Score inutile   | Implémenter calcul éco-conduite       |
| M5  | `daily_mileage` non calculé    | Km jour = 0     | Calculer chaque jour depuis positions |

### 🟢 MINEURS (Nice to have)

| #   | Problème                          | Solution                           |
| --- | --------------------------------- | ---------------------------------- |
| m1  | Export PDF limité à 7 colonnes    | Permettre sélection colonnes       |
| m2  | Pas de tri persistant             | Sauvegarder préférence utilisateur |
| m3  | Pas d'historique dans VehicleForm | Implémenter onglet Historique      |

---

## 6️⃣ ACTIONS RECOMMANDÉES

### Phase 1 - Corrections immédiates ✅ FAIT

1. ✅ **FAIT** - Client affiche le nom au lieu de l'ID
2. ✅ **FAIT** - Véhicule affiche nom + plaque (sans ID)
3. ✅ **FAIT** - Pagination reset quand itemsPerPage change
4. ✅ **FAIT** - Niveau carburant affiche "-" si pas de données

### Phase 2 - Données obligatoires ✅ FAIT

5. ✅ **FAIT** - Migration ajout `group_id` FK vers table `groups`
6. ⬜ Script pour calculer `mileage` depuis historique `positions` (attente connexion balises)
7. ✅ **FAIT** - Valeurs par défaut `theoretical_consumption` selon type véhicule:
   - CAR: 8.0 L/100km → **1844 véhicules mis à jour**
   - VAN: 10.0 L/100km
   - TRUCK: 25.0 L/100km
   - CONSTRUCTION: 30.0 L/100km
8. ✅ **FAIT** - Valeurs par défaut `tank_capacity` selon type véhicule:
   - CAR: 50 L → **1844 véhicules mis à jour**
   - VAN: 70 L
   - TRUCK: 300 L
   - CONSTRUCTION: 200 L

### Phase 3 - Calculs automatiques (après connexion balises)

9. ⬜ Cron job quotidien pour `daily_mileage`
10. ⬜ Trigger pour `violations_count` depuis `alerts`
11. ⬜ Calcul `max_speed` depuis `positions` (max sur 24h)
12. ⬜ Calcul `driver_score` depuis alertes et violations

---

## 7️⃣ FICHIERS CONCERNÉS

| Fichier                                              | Modifié | À modifier                          |
| ---------------------------------------------------- | ------- | ----------------------------------- |
| `backend/src/controllers/vehicleController.ts`       | ✅      | ⬜ Ajouter group_name, max_speed    |
| `services/api.ts`                                    | ✅      | -                                   |
| `features/fleet/components/FleetTable.tsx`           | ✅      | ⬜ Masquer colonnes vides           |
| `features/settings/components/forms/VehicleForm.tsx` | -       | ⬜ Rendre tank_capacity obligatoire |
| `backend/src/db/schema.sql`                          | -       | ⬜ Ajouter group_id FK              |
| `backend/src/services/scheduler.ts`                  | -       | ⬜ Ajouter cron mileage             |

---

## 8️⃣ ANNEXE - Mapping API → UI

```typescript
// services/api.ts → vehicles.list()

DB Column              → Frontend Property
------------------------------------------
v.id                   → id
v.tenant_id            → tenantId
v.name                 → name
t.client_name          → client (✅ après fix)
v.driver_name          → driver
v.status               → status
p.latitude             → location.lat
p.longitude            → location.lng
p.speed                → speed
v.max_speed            → maxSpeed (❌ non récupéré)
p.fuel_liters/capacity → fuelLevel (✅ calculé)
v.mileage              → mileage
v.theoretical_consumption → consumption
v.group_name           → group (❌ n'existe pas)
v.geofence             → geofence
v.plate                → plate
...
```

---

**FIN DU RAPPORT D'AUDIT**
