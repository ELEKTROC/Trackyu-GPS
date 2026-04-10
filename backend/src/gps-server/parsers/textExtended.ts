// backend/src/gps-server/parsers/textExtended.ts
// Protocole texte étendu : :::IMEI=xxx;LAT=xxx;LNG=xxx;...###
// Format key=value pour firmware custom avec champs riches

import type { GpsParser, GpsData } from '../types';

export class TextExtendedParser implements GpsParser {
  protocolName = 'TEXT_EXTENDED';

  canParse(data: Buffer | string): boolean {
    const str = Buffer.isBuffer(data) ? data.toString('utf8').trim() : data.trim();
    return str.startsWith(':::') && str.includes('###');
  }

  parse(data: Buffer | string): GpsData | null {
    try {
      const str = (Buffer.isBuffer(data) ? data.toString('utf8') : data).trim();
      const start = str.indexOf(':::');
      const end   = str.indexOf('###');
      if (start === -1 || end === -1) return null;

      const body = str.slice(start + 3, end);
      const pairs: Record<string, string> = {};
      for (const part of body.split(';')) {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) continue;
        const key = part.slice(0, eqIdx).trim().toLowerCase();
        const val = part.slice(eqIdx + 1).trim();
        pairs[key] = val;
      }

      const imei    = pairs['imei'] || pairs['id'] || '';
      const lat     = parseFloat(pairs['lat'] || pairs['latitude'] || '');
      const lng     = parseFloat(pairs['lng'] || pairs['longitude'] || '');
      const speed   = parseFloat(pairs['speed'] || pairs['spd'] || '0') || 0;
      const heading = parseFloat(pairs['heading'] || pairs['course'] || pairs['hdg'] || '0') || 0;
      const fuel    = pairs['fuel'] !== undefined ? parseFloat(pairs['fuel']) : undefined;
      const acc     = pairs['acc'] !== undefined ? pairs['acc'] === '1' : undefined;
      const sos     = pairs['sos'] === '1';
      const batteryPercent = pairs['bat'] !== undefined ? parseFloat(pairs['bat']) : undefined;
      const externalVolt   = pairs['volt'] !== undefined ? parseFloat(pairs['volt']) * 1000 : undefined; // V → mV

      if (!/^\d{10,16}$/.test(imei)) return null;
      if (isNaN(lat) || isNaN(lng)) return null;

      // Timestamp optionnel
      let timestamp = new Date();
      if (pairs['ts'] || pairs['timestamp'] || pairs['time']) {
        const tsVal = pairs['ts'] || pairs['timestamp'] || pairs['time'];
        const parsed = new Date(tsVal);
        if (!isNaN(parsed.getTime())) timestamp = parsed;
      }

      return {
        imei,
        timestamp,
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        fuelLevel: isNaN(fuel as number) ? undefined : fuel,
        acc,
        sos,
        batteryPercent,
        externalVolt,
        raw: str,
        protocol: 'TEXT_EXTENDED',
      };
    } catch {
      return null;
    }
  }
}
