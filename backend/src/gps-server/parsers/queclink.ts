// backend/src/gps-server/parsers/queclink.ts
// Parseur protocole Queclink (GV300, GV500, GV600, GL300, GL500...)
//
// Format TCP ASCII :
//   +RESP:<type>,<ver>,<imei>,<name>,...,<send_time>,<count>$
//   +BUFF:<type>,... (même structure, paquet bufferisé)
//   +ACK:<type>,...  (acquittement)
//
// Types de messages supportés :
//   GTFRI — Regular fix (périodique)
//   GTIGN — Ignition ON
//   GTIGF — Ignition OFF
//   GTSTT — State change
//   GTSOS — SOS
//   GTPNA — Power on
//   GTPFA — Power off
//   GTHBM — Heartbeat
//   GTIOB — IO data avec carburant analogique
//
// Référence : Queclink AT Commands Manual v3.x

import type { GpsParser, GpsData } from '../types';

/**
 * Parse un timestamp Queclink "YYYYMMDDHHmmss" → Date UTC.
 */
function parseQueclinkTime(ts: string): Date {
  if (!ts || ts.length < 14) return new Date();
  const year   = parseInt(ts.slice(0, 4));
  const month  = parseInt(ts.slice(4, 6)) - 1;
  const day    = parseInt(ts.slice(6, 8));
  const hour   = parseInt(ts.slice(8, 10));
  const minute = parseInt(ts.slice(10, 12));
  const second = parseInt(ts.slice(12, 14));
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Extrait les champs GPS d'un bloc de position Queclink.
 * Structure bloc GPS (commun à tous les types) :
 *   ...,<accuracy>,<speed>,<azimuth>,<altitude>,<longitude>,<latitude>,<gps_time>,...
 */
interface QueclinkGpsBlock {
  accuracy: number;
  speed: number;
  heading: number;
  altitude: number;
  lat: number;
  lng: number;
  timestamp: Date;
}

function extractGpsBlock(fields: string[], startIdx: number): QueclinkGpsBlock | null {
  // Minimum 7 fields pour un bloc GPS complet
  if (fields.length < startIdx + 7) return null;

  const accuracy = parseFloat(fields[startIdx] || '0');
  const speed    = parseFloat(fields[startIdx + 1] || '0');
  const heading  = parseFloat(fields[startIdx + 2] || '0');
  const altitude = parseFloat(fields[startIdx + 3] || '0');
  const lng      = parseFloat(fields[startIdx + 4] || '0'); // LONGITUDE en premier chez Queclink
  const lat      = parseFloat(fields[startIdx + 5] || '0'); // LATITUDE en second
  const gpsTime  = parseQueclinkTime(fields[startIdx + 6] || '');

  if (isNaN(lat) || isNaN(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { accuracy, speed, heading, altitude, lat, lng, timestamp: gpsTime };
}

export class QueclinkParser implements GpsParser {
  protocolName = 'QUECLINK';

  canParse(data: Buffer | string): boolean {
    const str = Buffer.isBuffer(data) ? data.slice(0, 10).toString('ascii') : data.slice(0, 10);
    return str.startsWith('+RESP:') || str.startsWith('+BUFF:') || str.startsWith('+ACK:');
  }

  parse(data: Buffer | string): GpsData | null {
    try {
      const raw = (Buffer.isBuffer(data) ? data.toString('ascii') : data).trim();

      // Rejeter si pas un message de position (ACK seul, HBMM, etc.)
      if (!raw.startsWith('+RESP:') && !raw.startsWith('+BUFF:')) return null;

      // Supprimer le préfixe et le suffixe '$'
      const inner = raw.replace(/^\+(?:RESP|BUFF):/, '').replace(/\$$/, '');
      const fields = inner.split(',');

      // fields[0] = type (GTFRI, GTSOS, etc.)
      // fields[1] = version protocole (ex: 020301)
      // fields[2] = IMEI (15 chiffres)
      // fields[3] = nom appareil (peut être vide)
      const msgType = fields[0] || '';
      const imei    = fields[2] || '';

      if (!/^\d{15}$/.test(imei)) {
        console.warn(`[QUECLINK] IMEI invalide: "${imei}"`);
        return null;
      }

      // Messages sans données GPS → ignorer
      if (msgType === 'GTHBM' || msgType === 'GTPNA' || msgType === 'GTPFA' ||
          msgType === 'GTPDP' || msgType === 'GTCFG') {
        return null;
      }

      let gps: QueclinkGpsBlock | null = null;
      let acc: boolean | undefined;
      let sos = false;
      let harshBraking = false;
      let harshAccel = false;
      let odometer: number | undefined;
      let fuelLevel: number | undefined;
      let batteryPercent: number | undefined;

      // ── GTFRI — Rapport périodique ──────────────────────────────────────────
      // Format: GTFRI,ver,imei,name,op,val,num,accuracy,speed,az,alt,lng,lat,gps_time,
      //         mcc,mnc,lac,cell,reserved,mileage,hours,input_count,adc1,...,send_time,count$
      if (msgType === 'GTFRI' || msgType === 'GTSTT' || msgType === 'GTIOB') {
        // Champ [4]=reserved [5]=reserved [6]=number_of_records
        // Bloc GPS commence à [7]
        gps = extractGpsBlock(fields, 7);

        // Mileage (km) → convertir en mètres
        const mileageField = fields[18] || '';
        if (mileageField && mileageField !== '') {
          odometer = parseFloat(mileageField) * 1000;
        }

        // ADC analogique [21+] — peut contenir niveau carburant selon config
        const adcCount = parseInt(fields[20] || '0');
        if (adcCount > 0 && fields[21]) {
          const adcVal = parseFloat(fields[21]);
          if (!isNaN(adcVal)) {
            // Conversion tension ADC → % carburant (calibration standard 0-3.3V = 0-100%)
            // Override possible via vehicle.calibrationTable côté worker
            fuelLevel = Math.max(0, Math.min(100, (adcVal / 3.3) * 100));
          }
        }
      }

      // ── GTIGN / GTIGF — Ignition ON/OFF ────────────────────────────────────
      // Format: GTIGN,ver,imei,name,ign_duration,accuracy,speed,az,alt,lng,lat,gps_time,...
      else if (msgType === 'GTIGN') {
        acc = true;
        gps = extractGpsBlock(fields, 5);
      } else if (msgType === 'GTIGF') {
        acc = false;
        gps = extractGpsBlock(fields, 5);
      }

      // ── GTSOS — Urgence ─────────────────────────────────────────────────────
      // Format: GTSOS,ver,imei,name,accuracy,speed,az,alt,lng,lat,gps_time,...
      else if (msgType === 'GTSOS') {
        sos = true;
        gps = extractGpsBlock(fields, 4);
      }

      // ── GTCRA — Crash / GTHBM — Harsh ──────────────────────────────────────
      else if (msgType === 'GTCRA') {
        gps = extractGpsBlock(fields, 4);
      } else if (msgType === 'GTHBM') {
        // Harsh behavior : type [4] = 0 harshAccel, 1 harshBraking, 2 sharpTurn
        const behaviorType = parseInt(fields[4] || '-1');
        harshBraking = behaviorType === 1;
        harshAccel   = behaviorType === 0;
        gps = extractGpsBlock(fields, 5);
      }

      // ── Autres messages avec bloc GPS en position 4 (fallback) ─────────────
      else {
        gps = extractGpsBlock(fields, 4);
      }

      if (!gps) return null;
      if (gps.lat === 0 && gps.lng === 0) return null;

      // Timestamp d'envoi (dernier champ avant le count) comme fallback si gps_time vide
      const sendTimeField = fields[fields.length - 2] || '';
      const sendTime = parseQueclinkTime(sendTimeField);
      const timestamp = gps.timestamp.getFullYear() > 2000 ? gps.timestamp : sendTime;

      return {
        imei,
        timestamp,
        latitude:  gps.lat,
        longitude: gps.lng,
        speed:     gps.speed,
        heading:   gps.heading,
        altitude:  gps.altitude,
        acc,
        sos,
        harshBraking,
        harshAccel,
        odometer,
        fuelLevel,
        batteryPercent,
        raw,
        protocol: 'QUECLINK',
      };

    } catch (err) {
      console.error('[QUECLINK] Erreur parsing:', err);
      return null;
    }
  }
}
