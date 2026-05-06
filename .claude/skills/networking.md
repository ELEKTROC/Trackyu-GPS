# Skill — Réseau & Protocoles GPS TrackYu

## Ports en écoute

| Port   | Protocole      | Usage                          |
| ------ | -------------- | ------------------------------ |
| 80/443 | HTTP/HTTPS     | nginx → frontend               |
| 3001   | HTTP/WebSocket | Backend API + Socket.io        |
| 5000   | TCP            | GPS server (réception balises) |
| 5432   | TCP            | PostgreSQL (interne Docker)    |
| 6379   | TCP            | Redis (interne Docker)         |

## Protocoles GPS binaires

### GT06 / JT700 (le plus répandu)

```
Trame login : 7e [len] 01 [8 bytes IMEI BCD] [serial] [crc] 7e
Trame position : 7e [len] 22 [date] [lat] [lng] [speed] [status] [serial] [crc] 7e

Délimiteur : 0x7e
IMEI : encodé BCD 8 octets → slice(0,15) → strip leading zeros + trailing 'f'
CRC : ISO-HDLC sur les octets entre délimiteurs
```

### CONCOX / COBAN (variante GT06 étendue)

```
Même structure GT06, supporte en plus :
- 0x13 : ExternalVoltage (ADC carburant en mV)
- 0x94 : données étendues (fuel, temp, accéléromètre)
- Champ "fuel" dans raw_data parsé = litres directs
```

### Meitrack

```
Format ASCII : $$[len],[IMEI],[cmd],[data]*[checksum]\r\n
IMEI : 15 chiffres dans le texte (regex \b(\d{15})\b)
```

### Queclink

```
Format CSV : +RESP:[cmd],[version],[IMEI],[data]*[checksum]<CR><LF>
IMEI : fields[2]
```

### Suntech

```
Format ASCII : SA[type];[IMEI];[data]
IMEI : 14-15 chiffres
```

## Formule carburant ADC (CONCOX GT800 / X3)

```
extMv (mV) → fuelLiters
= (extMv / 5000) × tankCapacity  [formule linéaire sans table]

Avec table de calibration (calibration_table JSON) :
= interpolation linéaire entre les points {voltage: mV, liters: L}

Guard : si extMv > 5100 → valeur aberrante, ignorer
```

## WebSocket temps réel

- Socket.io sur port 3001
- Rooms par `tenant_id` et par `vehicle_id`
- `perMessageDeflate` activé (threshold 512B, level 6) → ~60% réduction trafic
- Throttle adaptatif via `socketThrottle.ts` : MOVING=1s, IDLE=3s, STOPPED=8s
- Events : `vehicle:update` (18 champs), `alert:new`

### Payload `vehicle:update` (18 champs)

`id, location{lat,lng}, speed, heading, status, lastUpdated, fuelLevel, altitude, odometer, ignition, batteryVoltage, batteryPercent, satellites, hdop, crash, sos, harshBraking, harshAccel`

## Rate limiting GPS

- 300 messages/min max par IMEI (configurable `GPS_RATE_LIMIT_PER_MIN`)
- 200 connexions max par IP (`GPS_MAX_CONNS_PER_IP`)
- 5 paquets sans IMEI valide → déconnexion socket

## Redis queue GPS

```
Key : gps_incoming_queue (liste FIFO)
Producer : gps-server/server.js (LPUSH)
Consumer : workers/positionWorker.ts (BRPOP, polling 100ms)
Monitoring : LLEN gps_incoming_queue > 100 → warning log
```

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/modules/gps/` (protocoles, CRC, variants).

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
