# Skill — Diagnostic balise GPS

Procédure complète pour diagnostiquer une balise GPS connectée au serveur TrackYu.

## 1. Identifier le véhicule en base

```sql
-- Via Docker container postgres
docker exec trackyu-gps-postgres-1 psql 'postgres://fleet_user:fleet_password@localhost:5432/fleet_db' \
  -c "SELECT id, name, imei, protocol FROM objects WHERE imei='<IMEI>' OR name ILIKE '%<NOM>%';"
```

## 2. Vérifier les positions reçues

```sql
SELECT COUNT(*) as total, COUNT(fuel_liters) as with_fuel,
       MIN(time) as first_pos, MAX(time) as last_pos
FROM positions WHERE object_id='<ID>';
```

## 3. Lire les données brutes (raw_data)

```sql
SELECT time, speed, fuel_liters, raw_data::text
FROM positions WHERE object_id='<ID>'
ORDER BY time DESC LIMIT 5;
```

Le champ `raw_data` contient le JSON parsé par le serveur GPS. Vérifier :

- `fuel` présent → le capteur envoie le carburant
- `fuel_liters` NULL en DB → bug pipeline (positionWorker n'a pas persisté)
- `latitude/longitude` absents → trame GPS sans fix satellite

## 4. Protocoles supportés

| Protocole    | Trame de login | Notes                                         |
| ------------ | -------------- | --------------------------------------------- |
| GT06/JT700   | `7e 01 ...`    | Famille la plus courante, IMEI en BCD 8 bytes |
| CONCOX/COBAN | `7e 02 ...`    | Variante GT06, champ `fuel` dans raw_data     |
| Meitrack     | `$$...` ASCII  | IMEI 15 chiffres dans le texte                |
| Queclink     | `+RESP:...`    | Format CSV textuel                            |
| Suntech      | `SA...`        | IMEI 14-15 chiffres                           |

## 5. Fuel pipeline — chemin complet

```
Balise → TCP port 5000 → gps-server/server.js → parsers/<protocol>.js
  → Redis queue (gps_incoming_queue)
  → workers/positionWorker.js
      → data.fuel → fuelLiters (ligne ~379)
      → positionRow.fuel_liters = fuelLiters
      → flushPositions() → INSERT INTO positions (... fuel_liters ...)
  → API /objects/:id/fuel/history?duration=24h
  → Frontend FuelBlock / FuelModalContent
```

**Point de défaillance fréquent :** `flushPositions()` omet `fuel_liters` dans l'INSERT → champ NULL en base même si `raw_data` contient `fuel`.

## 6. Logs temps réel

```bash
docker logs trackyu-gps-backend-1 --tail 100 -f | grep -i "<IMEI>\|fuel\|Worker"
```

## 7. Vérifier la table `discovered_devices`

Si une balise se connecte avec un IMEI inconnu (non enregistré dans `objects`), elle atterrit dans `discovered_devices` sans créer de position.

```sql
SELECT * FROM discovered_devices ORDER BY created_at DESC LIMIT 10;
```

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/modules/gps/`.

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
