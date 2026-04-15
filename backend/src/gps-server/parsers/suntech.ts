// backend/src/gps-server/parsers/suntech.ts
// Parseur protocole Suntech (ST310, ST340, ST600, ST650, ST900...)
//
// Format ASCII TCP :
//   SA200STT;IMEI;SEQ;YYYYMMDD;HHMMSS;VALID;FIXSTATUS;LAT;LON;SPD;CRS;HDOP;ALT;BATVOLT;EXTVOLT;...
//
// Identifiers (premiers 6 chars) :
//   SA200STT — State Tracking (périodique)
//   SA200EMG — Emergency (SOS)
//   SA200ALT — Alerte (speeding, geofence, etc.)
//   SA200SRT — Start/stop report (ignition)
//   SA200HBT — Heartbeat (sans position)
//   SA200EPB — Panic button
//   SA200ALC — Alert (choc, tamper)
//
// Référence : Suntech ST310 Integration Manual v4.x

import type { GpsParser, GpsData } from '../types';

/**
 * Parse date + heure Suntech "YYYYMMDD" + "HHMMSS" → Date UTC.
 */
function parseSuntechTime(dateStr: string, timeStr: string): Date {
  if (!dateStr || dateStr.length < 8 || !timeStr || timeStr.length < 6) return new Date();
  const year   = parseInt(dateStr.slice(0, 4));
  const month  = parseInt(dateStr.slice(4, 6)) - 1;
  const day    = parseInt(dateStr.slice(6, 8));
  const hour   = parseInt(timeStr.slice(0, 2));
  const minute = parseInt(timeStr.slice(2, 4));
  const second = parseInt(timeStr.slice(4, 6));
  if (isNaN(year) || isNaN(month)) return new Date();
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Détermine le type de message Suntech depuis l'identifiant.
 */
function getSuntechMsgType(id: string): string {
  const known: Record<string, string> = {
    'SA200STT': 'TRACK',
    'SA200EMG': 'SOS',
    'SA200ALT': 'ALERT',
    'SA200SRT': 'IGNITION',
    'SA200HBT': 'HEARTBEAT',
    'SA200EPB': 'PANIC',
    'SA200ALC': 'SHOCK',
  };
  return known[id] || 'UNKNOWN';
}

export class SuntechParser implements GpsParser {
  protocolName = 'SUNTECH';

  canParse(data: Buffer | string): boolean {
    const str = Buffer.isBuffer(data) ? data.slice(0, 6).toString('ascii') : data.slice(0, 6);
    // Tous les messages Suntech commencent par "SA" suivi de 3 chiffres
    return /^SA\d{3}/.test(str);
  }

  parse(data: Buffer | string): GpsData | null {
    try {
      const raw = (Buffer.isBuffer(data) ? data.toString('ascii') : data).trim();

      const fields = raw.split(';');
      if (fields.length < 6) return null;

      // fields[0] = identifiant message (SA200STT, SA200EMG, etc.)
      // fields[1] = IMEI
      // fields[2] = numéro séquence
      // fields[3] = date (YYYYMMDD)
      // fields[4] = heure (HHMMSS)
      const msgId   = fields[0] || '';
      const imei    = fields[1] || '';
      const dateStr = fields[3] || '';
      const timeStr = fields[4] || '';

      if (!/^\d{14,15}$/.test(imei)) {
        console.warn(`[SUNTECH] IMEI invalide: "${imei}"`);
        return null;
      }

      const msgType = getSuntechMsgType(msgId);

      // Heartbeat → pas de position
      if (msgType === 'HEARTBEAT') return null;

      // ── Champs de position communs à tous les messages avec fix GPS ──────────
      // Positions selon spécification SA200STT :
      // [5]=validity [6]=fixstatus [7]=lat [8]=lon [9]=speed [10]=course [11]=hdop [12]=altitude
      // [13]=batvolt [14]=extvolt [15]=mode [16]=status [17]=io_status [18]=adc1 [19]=adc2
      //
      // Variation selon le modèle : certains ont moins de champs (ST600 vs ST310)
      // On essaie de parser de façon défensive.

      if (fields.length < 10) return null;

      const validField  = fields[5] || '';
      const fixField    = fields[6] || '';
      const latStr      = fields[7] || '';
      const lngStr      = fields[8] || '';
      const speedStr    = fields[9] || '';
      const courseStr   = fields[10] || '';
      const hdopStr     = fields[11] || '';
      const altStr      = fields[12] || '';
      const batVoltStr  = fields[13] || '';
      const extVoltStr  = fields[14] || '';

      // Validité GPS : '1' = valid, '0' = no fix
      const isValid = validField === '1' || fixField === '1';

      const lat     = parseFloat(latStr);
      const lng     = parseFloat(lngStr);
      const speed   = parseFloat(speedStr) || 0;   // km/h
      const heading = parseFloat(courseStr) || 0;  // degrés
      const hdop    = parseFloat(hdopStr) || undefined;
      const altitude = parseFloat(altStr) || undefined;

      // Si pas de fix GPS valide, on peut quand même retourner les données
      // (le worker filtrera via assessGpsQuality)
      if (!isValid || isNaN(lat) || isNaN(lng)) {
        console.log(`[SUNTECH] IMEI ${imei} — fix GPS invalide (valid=${validField})`);
        return null;
      }

      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      if (lat === 0 && lng === 0) return null;

      // Tension batterie (mV) — souvent en Volts dans le protocole, conversion
      let externalVolt: number | undefined;
      let batteryPercent: number | undefined;

      const extVolt = parseFloat(extVoltStr);
      if (!isNaN(extVolt) && extVolt > 0) {
        // Suntech envoie en Volts (ex: 12.85) → convertir en mV
        externalVolt = extVolt < 100 ? Math.round(extVolt * 1000) : Math.round(extVolt);
      }

      const batVolt = parseFloat(batVoltStr);
      if (!isNaN(batVolt) && batVolt > 0) {
        // Batterie interne : plage typique 3.4V (0%) → 4.2V (100%) Li-ion
        if (batVolt < 100) { // En Volts
          const pct = Math.max(0, Math.min(100, ((batVolt - 3.4) / 0.8) * 100));
          batteryPercent = Math.round(pct);
        }
      }

      // Status & IO
      let acc: boolean | undefined;
      let sos = false;
      let harshBraking = false;
      let harshAccel = false;

      // Mode champ [15] ou status champ [16]
      const statusField = fields[16] || '';

      if (msgType === 'SOS' || msgType === 'PANIC') sos = true;

      if (msgType === 'IGNITION') {
        // SRT report : fields[5] = event type ('1'=start, '0'=stop)
        acc = validField === '1';
      }

      if (msgType === 'SHOCK' || msgType === 'ALERT') {
        // Alert type dans fields[5] pour SA200ALT
        const alertCode = parseInt(validField || '0');
        harshBraking = alertCode === 15;  // Codes selon spécification Suntech
        harshAccel   = alertCode === 14;
      }

      // IO Status (champ [17]) — bit 0 = ignition dans la plupart des modèles
      const ioStatus = parseInt(fields[17] || '0');
      if (!isNaN(ioStatus) && acc === undefined) {
        acc = (ioStatus & 0x01) === 1;
      }

      const timestamp = parseSuntechTime(dateStr, timeStr);

      return {
        imei,
        timestamp,
        latitude:  lat,
        longitude: lng,
        speed,
        heading,
        altitude,
        hdop,
        externalVolt,
        batteryPercent,
        acc,
        sos,
        harshBraking,
        harshAccel,
        raw,
        protocol: 'SUNTECH',
      };

    } catch (err) {
      console.error('[SUNTECH] Erreur parsing:', err);
      return null;
    }
  }
}
