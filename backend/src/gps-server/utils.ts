// backend/src/gps-server/utils.ts
// Utilitaires partagés : calcul distance, CRC, encodage BCD, validation

import type { GpsData, GpsValidationResult } from './types';

const EARTH_RADIUS_KM = 6371.0;

/**
 * Distance Haversine entre deux points GPS (retourne des mètres).
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

/**
 * Décodage BCD (Binary Coded Decimal) → chaîne de chiffres.
 * Utilisé pour l'extraction IMEI dans les protocoles GT06 et JT808.
 * Ex: 0x12 0x34 → "1234"
 */
export function bcdToString(buf: Buffer, offset: number, length: number): string {
  let result = '';
  for (let i = offset; i < offset + length && i < buf.length; i++) {
    result += ((buf[i] >> 4) & 0x0f).toString();
    result += (buf[i] & 0x0f).toString();
  }
  return result;
}

/**
 * CRC16 IBM (polynomial 0x8005) — utilisé par GT06/Concox.
 * Calcule le CRC sur la portion de contenu entre Start Marker et CRC field.
 */
export function crc16IBM(buf: Buffer, start: number, end: number): number {
  let crc = 0;
  for (let i = start; i < end; i++) {
    crc ^= buf[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x8005;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

/**
 * CRC XOR BCC — utilisé par JT808.
 * XOR de tous les bytes entre les délimiteurs 0x7e.
 */
export function crcXorBcc(buf: Buffer, start: number, end: number): number {
  let crc = 0;
  for (let i = start; i < end; i++) {
    crc ^= buf[i];
  }
  return crc;
}

/**
 * CRC16/CCITT (polynomial 0x1021, init 0x0000) — utilisé par Teltonika Codec 8.
 */
export function crc16Ccitt(buf: Buffer, start: number, end: number): number {
  let crc = 0x0000;
  for (let i = start; i < end; i++) {
    crc ^= buf[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

/**
 * Unescape pour JT808 : 0x7d 0x02 → 0x7e, 0x7d 0x01 → 0x7d
 */
export function unescapeJt808(buf: Buffer): Buffer {
  const result: number[] = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === 0x7d && i + 1 < buf.length) {
      if (buf[i + 1] === 0x02) { result.push(0x7e); i += 2; continue; }
      if (buf[i + 1] === 0x01) { result.push(0x7d); i += 2; continue; }
    }
    result.push(buf[i]);
    i++;
  }
  return Buffer.from(result);
}

/**
 * Validation complète des données GPS.
 * Rejette tout paquet avec des valeurs hors-bornes physiquement impossibles.
 */
export function validateGpsData(data: GpsData): GpsValidationResult {
  if (!data.imei || !/^\d{10,16}$/.test(data.imei)) {
    return { valid: false, reason: `IMEI invalide: '${data.imei}'` };
  }
  if (isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90) {
    return { valid: false, reason: `latitude hors bornes: ${data.latitude}` };
  }
  if (isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180) {
    return { valid: false, reason: `longitude hors bornes: ${data.longitude}` };
  }
  // Position 0,0 = "Null Island" = boîtier sans fix GPS valide
  if (data.latitude === 0 && data.longitude === 0) {
    return { valid: false, reason: 'coordonnées 0,0 — pas de fix GPS valide' };
  }
  if (isNaN(data.speed) || data.speed < 0 || data.speed > 400) {
    return { valid: false, reason: `vitesse hors bornes: ${data.speed} km/h` };
  }
  if (isNaN(data.heading) || data.heading < 0 || data.heading > 360) {
    return { valid: false, reason: `cap hors bornes: ${data.heading}°` };
  }
  if (data.timestamp) {
    const now = Date.now();
    const ts = data.timestamp.getTime();
    // Rejet si timestamp > 10 minutes dans le futur ou > 24h dans le passé
    if (ts > now + 10 * 60 * 1000) {
      return { valid: false, reason: `timestamp dans le futur: ${data.timestamp.toISOString()}` };
    }
    if (ts < now - 24 * 60 * 60 * 1000) {
      return { valid: false, reason: `timestamp trop ancien: ${data.timestamp.toISOString()}` };
    }
  }
  if (data.fuelLevel !== undefined && (data.fuelLevel < 0 || data.fuelLevel > 10000)) {
    return { valid: false, reason: `niveau carburant hors bornes: ${data.fuelLevel}` };
  }
  return { valid: true };
}

/**
 * Parse un timestamp GPS en Date UTC.
 * Gère les formats BCD (Buffer) et les entiers décimaux.
 */
export function parseTime(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number
): Date {
  // Les années sont souvent encodées en offset depuis 2000
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(Date.UTC(fullYear, month - 1, day, hour, minute, second));
}
