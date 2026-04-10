// backend/src/gps-server/parsers/meitrack.ts
// Parseur protocole Meitrack (texte ASCII, format $$...*)
// Standard : https://www.meitrack.com/support/protocol/

import type { GpsParser, GpsData } from '../types';

/**
 * Calcule le checksum Meitrack (XOR de tous les bytes entre $$ et *).
 */
function meitrackChecksum(payload: string): string {
  let cs = 0;
  for (let i = 0; i < payload.length; i++) {
    cs ^= payload.charCodeAt(i);
  }
  return cs.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Parse un timestamp Meitrack "YYMMDDHHmmss" → Date UTC.
 */
function parseMeitrackTime(ts: string): Date {
  if (ts.length < 12) return new Date();
  const year   = 2000 + parseInt(ts.slice(0, 2));
  const month  = parseInt(ts.slice(2, 4)) - 1;
  const day    = parseInt(ts.slice(4, 6));
  const hour   = parseInt(ts.slice(6, 8));
  const minute = parseInt(ts.slice(8, 10));
  const second = parseInt(ts.slice(10, 12));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

export class MeitrackParser implements GpsParser {
  protocolName = 'MEITRACK';

  canParse(data: Buffer | string): boolean {
    const str = Buffer.isBuffer(data) ? data.toString('ascii') : data;
    return str.startsWith('$$') && str.includes('*');
  }

  parse(data: Buffer | string): GpsData | null {
    try {
      const raw = Buffer.isBuffer(data) ? data.toString('ascii') : data;
      const line = raw.trim();

      // Format : $$<flag><length>,<IMEI>,<event>,<timestamp>,<validity>,<lat>,<lng>,<speed>,<heading>,...*<checksum>\r\n
      if (!line.startsWith('$$') || !line.includes('*')) return null;

      // Vérification checksum
      const starIdx = line.lastIndexOf('*');
      const payload = line.slice(2, starIdx); // Entre $$ et *
      const checksum = line.slice(starIdx + 1, starIdx + 3);
      const calculated = meitrackChecksum(payload);
      if (checksum.toUpperCase() !== calculated) {
        console.warn(`[MEITRACK] Checksum invalide — attendu ${calculated}, reçu ${checksum}`);
        return null;
      }

      // Split sur virgule
      const parts = payload.split(',');
      if (parts.length < 9) return null;

      // Les 2 premiers chars sont flag+length, pas séparés → on commence à parts[0]
      // Selon le firmware Meitrack, structure variable. On cherche l'IMEI (15 chiffres).
      let imeiIdx = -1;
      for (let i = 0; i < Math.min(parts.length, 4); i++) {
        if (/^\d{15}$/.test(parts[i].replace(/^\$\$[A-Z]?\d+/, ''))) {
          imeiIdx = i;
          break;
        }
      }

      // Extraction plus robuste : chercher le pattern IMEI dans la ligne
      const imeiMatch = line.match(/\b(\d{15})\b/);
      if (!imeiMatch) {
        console.warn('[MEITRACK] IMEI non trouvé dans le paquet');
        return null;
      }
      const imei = imeiMatch[1];

      // Localiser les champs après l'IMEI
      const imeiPos = payload.indexOf(imei);
      const afterImei = payload.slice(imeiPos + imei.length + 1).split(',');
      if (afterImei.length < 7) return null;

      // Format post-IMEI : event,timestamp,validity,lat,lng,speed,heading,...
      const eventCode  = afterImei[0];
      const timestamp  = parseMeitrackTime(afterImei[1] || '');
      const validity   = afterImei[2];   // 'A' = valid, 'V' = invalid
      const latStr     = afterImei[3];
      const lngStr     = afterImei[4];
      const speedStr   = afterImei[5];
      const headingStr = afterImei[6];

      if (validity === 'V') {
        console.log(`[MEITRACK] Fix GPS invalide pour IMEI ${imei}`);
        return null;
      }

      // Les coordonnées Meitrack sont en degrés décimaux × 1e6 ou en DDMM.MMMM
      let lat: number;
      let lng: number;

      if (latStr.includes('.')) {
        // Format DDMM.MMMM → degrés
        const latAbs = Math.abs(parseFloat(latStr));
        const latDeg = Math.floor(latAbs / 100);
        lat = latDeg + (latAbs - latDeg * 100) / 60;
        if (parseFloat(latStr) < 0) lat = -lat;

        const lngAbs = Math.abs(parseFloat(lngStr));
        const lngDeg = Math.floor(lngAbs / 100);
        lng = lngDeg + (lngAbs - lngDeg * 100) / 60;
        if (parseFloat(lngStr) < 0) lng = -lng;
      } else {
        // Format entier (degrés × 1e6)
        lat = parseInt(latStr) / 1e6;
        lng = parseInt(lngStr) / 1e6;
      }

      const speed   = parseFloat(speedStr) || 0;   // km/h
      const heading = parseFloat(headingStr) || 0; // degrés

      // Champs optionnels
      let acc: boolean | undefined;
      let sos = false;
      let crash = false;

      // Event codes Meitrack
      if (eventCode === 'SOS') sos = true;
      if (eventCode === 'ACC' || eventCode === '1') acc = true;
      if (eventCode === '16' || eventCode === '64') crash = true;

      return {
        imei,
        timestamp,
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        acc,
        sos,
        crash,
        raw: line,
        protocol: 'MEITRACK',
      };
    } catch (error) {
      console.error('[MEITRACK] Erreur de parsing:', error);
      return null;
    }
  }
}
