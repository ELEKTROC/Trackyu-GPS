// backend/src/gps-server/parsers/wialonIps.ts
// Parseur protocole Wialon IPS (texte ASCII, messages #L#, #D#, #B#)
// Standard : https://gurtam.com/files/gurtam/docs/wialon_ips_ru.pdf

import net from 'net';
import type { GpsParser, GpsData } from '../types';
import { crc16IBM } from '../utils';

// Map stateful : socket → IMEI (depuis le message #L#)
const socketImeiMap = new WeakMap<net.Socket, string>();

/**
 * Calcule le CRC Wialon IPS (CRC16 IBM sur le contenu du message, sans le #TYPE# header).
 */
function wialonCrc(payload: string): number {
  const buf = Buffer.from(payload, 'ascii');
  return crc16IBM(buf, 0, buf.length);
}

/**
 * Parse un timestamp Wialon "DDMMYY;HHmmss" ou "DDMMYYYY;HHmmss" → Date UTC.
 */
function parseWialonTime(dateStr: string, timeStr: string): Date {
  if (!dateStr || !timeStr) return new Date();
  const day    = parseInt(dateStr.slice(0, 2));
  const month  = parseInt(dateStr.slice(2, 4)) - 1;
  const yearRaw = dateStr.slice(4);
  const year   = yearRaw.length === 2 ? 2000 + parseInt(yearRaw) : parseInt(yearRaw);
  const hour   = parseInt(timeStr.slice(0, 2));
  const minute = parseInt(timeStr.slice(2, 4));
  const second = parseInt(timeStr.slice(4, 6));
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Convertit DDMM.MMMM (NMEA) en degrés décimaux.
 */
function nmeaToDeg(nmea: string, hemi: string): number {
  if (!nmea) return 0;
  const val = parseFloat(nmea);
  if (isNaN(val)) return 0;
  const deg = Math.floor(val / 100);
  const min = val - deg * 100;
  const result = deg + min / 60;
  return (hemi === 'S' || hemi === 'W') ? -result : result;
}

export class WialonIpsParser implements GpsParser {
  protocolName = 'WIALON_IPS';

  canParse(data: Buffer | string): boolean {
    const str = Buffer.isBuffer(data) ? data.toString('ascii') : data;
    return str.startsWith('#L#') || str.startsWith('#D#') || str.startsWith('#B#') || str.startsWith('#P#');
  }

  parse(data: Buffer | string, socket?: net.Socket): GpsData | null {
    try {
      const raw = Buffer.isBuffer(data) ? data.toString('ascii') : data;
      const line = raw.trim();

      // ─── MESSAGE LOGIN (#L#) ────────────────────────────────────────────
      if (line.startsWith('#L#')) {
        // Format : #L#<UID>;<password>\r\n  ou  #L#<IMEI>;<password>;CRC\r\n
        const body = line.slice(3); // après #L#
        const parts = body.split(';');
        const imei = parts[0];

        if (!/^\d{10,16}$/.test(imei)) {
          console.warn(`[WIALON] Login: IMEI invalide '${imei}'`);
          if (socket) socket.write('#AL#0\r\n'); // Refus
          return null;
        }

        if (socket) {
          socketImeiMap.set(socket, imei);
          console.log(`[WIALON] Login reçu — IMEI: ${imei}, envoi AL#1`);
          socket.write('#AL#1\r\n'); // ACK accepté
        }
        return null; // Pas de données GPS dans le login
      }

      // ─── PING (#P#) ─────────────────────────────────────────────────────
      if (line.startsWith('#P#')) {
        if (socket) socket.write('#AP#\r\n');
        return null;
      }

      // Récupérer l'IMEI pour les messages de données
      const imei = socket ? socketImeiMap.get(socket) : undefined;
      if (!imei) {
        console.warn('[WIALON] Message de données reçu sans login préalable');
        return null;
      }

      // ─── MESSAGE DONNÉES (#D#) ───────────────────────────────────────────
      if (line.startsWith('#D#')) {
        // Format : #D#<date>;<time>;<lat1>;<latH>;<lng1>;<lngH>;<speed>;<course>;<height>;<sats>;<hdop>;<inputs>;<outputs>;<adc>;<ibutton>;<params>\r\n
        const body = line.slice(3);

        // Vérification CRC si présent (certains firmware l'incluent)
        let payload = body;
        const crcSep = body.lastIndexOf(';');
        const possibleCrc = body.slice(crcSep + 1);
        if (/^[0-9A-Fa-f]{4}$/.test(possibleCrc)) {
          const expectedCrc = parseInt(possibleCrc, 16);
          const calculatedCrc = wialonCrc(body.slice(0, crcSep));
          if (expectedCrc !== calculatedCrc) {
            console.warn(`[WIALON] CRC invalide — attendu 0x${expectedCrc.toString(16)}, calculé 0x${calculatedCrc.toString(16)}`);
            return null;
          }
          payload = body.slice(0, crcSep);
        }

        const parts = payload.split(';');
        if (parts.length < 8) return null;

        const [dateStr, timeStr, lat1, latH, lng1, lngH, speedStr, courseStr, heightStr, satsStr] = parts;

        const timestamp = parseWialonTime(dateStr, timeStr);
        const latitude  = nmeaToDeg(lat1, latH);
        const longitude = nmeaToDeg(lng1, lngH);
        const speed     = parseFloat(speedStr) || 0;  // km/h
        const heading   = parseFloat(courseStr) || 0;
        const altitude  = parseFloat(heightStr) || 0;
        const satellites = parseInt(satsStr) || 0;

        // Paramètres additionnels (champ libre key=value)
        let acc: boolean | undefined;
        let externalVolt: number | undefined;
        let batteryPercent: number | undefined;
        if (parts.length > 15) {
          const paramStr = parts[15] || '';
          const params = paramStr.split(',');
          for (const p of params) {
            const [k, v] = p.split('=');
            if (!k || v === undefined) continue;
            if (k === 'acc' || k === 'ACC') acc = parseInt(v) === 1;
            if (k === 'volt' || k === 'extv') externalVolt = parseFloat(v) * 1000; // V → mV
            if (k === 'batt' || k === 'bat') batteryPercent = parseFloat(v);
          }
        }

        // Envoi ACK
        if (socket) socket.write('#AD#1\r\n');

        return {
          imei,
          timestamp,
          latitude,
          longitude,
          speed,
          heading,
          altitude,
          satellites,
          acc,
          externalVolt,
          batteryPercent,
          raw: line,
          protocol: 'WIALON_IPS',
        };
      }

      // ─── MESSAGES BATCH (#B#) ─────────────────────────────────────────────
      if (line.startsWith('#B#')) {
        // Batch de plusieurs records — on prend le premier
        const body = line.slice(3);
        const records = body.split('|');
        if (records.length === 0) return null;

        // Parser le premier record comme un #D#
        const firstRecord = '#D#' + records[0];
        if (socket) {
          const result = this.parse(firstRecord, socket);
          socket.write(`#AB#${records.length}\r\n`); // ACK batch
          return result;
        }
      }

      return null;
    } catch (error) {
      console.error('[WIALON] Erreur de parsing:', error);
      return null;
    }
  }
}
