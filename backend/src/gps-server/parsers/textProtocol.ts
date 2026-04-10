// backend/src/gps-server/parsers/textProtocol.ts
// Protocole texte simple : IMEI,LAT,LNG,SPEED,HEADING,FUEL[,ACC]
// Format minimal pour firmware custom ou tests

import type { GpsParser, GpsData } from '../types';

export class TextProtocolParser implements GpsParser {
  protocolName = 'TEXT_SIMPLE';

  canParse(data: Buffer | string): boolean {
    const str = Buffer.isBuffer(data) ? data.toString('utf8').trim() : data.trim();
    // IMEI (15 chiffres), virgule, latitude numérique
    return /^\d{10,16},-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?/.test(str);
  }

  parse(data: Buffer | string): GpsData | null {
    try {
      const str = (Buffer.isBuffer(data) ? data.toString('utf8') : data).trim();
      const parts = str.split(',');
      if (parts.length < 5) return null;

      const imei    = parts[0].trim();
      const lat     = parseFloat(parts[1]);
      const lng     = parseFloat(parts[2]);
      const speed   = parseFloat(parts[3]) || 0;
      const heading = parseFloat(parts[4]) || 0;
      const fuel    = parts[5] ? parseFloat(parts[5]) : undefined;
      const acc     = parts[6] ? parts[6].trim() === '1' : undefined;

      if (!/^\d{10,16}$/.test(imei)) return null;

      return {
        imei,
        timestamp: new Date(),
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        fuelLevel: isNaN(fuel as number) ? undefined : fuel,
        acc,
        raw: str,
        protocol: 'TEXT_SIMPLE',
      };
    } catch {
      return null;
    }
  }
}
