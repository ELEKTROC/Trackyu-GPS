// backend/src/gps-server/parsers/teltonika.ts
// Parseur protocole Teltonika Codec 8 / Codec 8 Extended
// Gère le handshake IMEI ASCII + les AVL records binaires
// Standard : https://wiki.teltonika-gps.com/view/Codec

import net from 'net';
import type { GpsParser, GpsData } from '../types';
import { crc16Ccitt } from '../utils';

// Map stateful : socket → IMEI (handshake en 2 étapes)
const socketImeiMap = new WeakMap<net.Socket, string>();

/**
 * Décode un enregistrement AVL Teltonika Codec 8.
 * Structure AVL record :
 *   Timestamp (8B) | Priority (1B) | GPS (15B) | IO Data
 */
function decodeAvlRecord(buf: Buffer, offset: number): {
  record: Partial<GpsData>;
  bytesRead: number;
} | null {
  if (buf.length < offset + 24) return null;

  // Timestamp : millisecondes Unix sur 8 bytes
  const tsHigh = buf.readUInt32BE(offset);
  const tsLow  = buf.readUInt32BE(offset + 4);
  const tsMs   = tsHigh * 0x100000000 + tsLow;
  const timestamp = new Date(tsMs);

  // Priority (1 byte) : 0=Low, 1=High, 2=Panic
  const priority = buf[offset + 8];

  // Bloc GPS (15 bytes)
  const lngRaw = buf.readInt32BE(offset + 9);  // Signed, × 1e-7
  const latRaw = buf.readInt32BE(offset + 13); // Signed, × 1e-7
  const altRaw = buf.readUInt16BE(offset + 17); // Mètres
  const heading = buf.readUInt16BE(offset + 19); // 0–360
  const satellites = buf[offset + 21];
  const speedKmh = buf.readUInt16BE(offset + 22); // km/h

  const longitude = lngRaw / 1e7;
  const latitude  = latRaw / 1e7;
  const altitude  = altRaw;
  const speed     = speedKmh;

  let bytesRead = 24; // 8 ts + 1 prio + 15 gps

  // ─── IO Data (Codec 8) ────────────────────────────────────────────────────
  // Event IO ID (1B) + Total IO (1B) + groupes par taille
  if (buf.length < offset + bytesRead + 2) {
    return { record: { timestamp, latitude, longitude, altitude, heading, satellites, speed }, bytesRead };
  }

  const eventIoId = buf[offset + bytesRead];
  const totalIoCount = buf[offset + bytesRead + 1];
  bytesRead += 2;

  let acc: boolean | undefined;
  let externalVolt: number | undefined;
  let batteryPercent: number | undefined;
  let harshBraking = false;
  let harshAccel = false;
  let crash = false;

  // Groupes : 1B × N, 2B × N, 4B × N, 8B × N
  const sizes = [1, 2, 4, 8];
  for (const size of sizes) {
    if (buf.length < offset + bytesRead + 1) break;
    const count = buf[offset + bytesRead];
    bytesRead += 1;
    for (let i = 0; i < count; i++) {
      if (buf.length < offset + bytesRead + 1 + size) break;
      const ioId = buf[offset + bytesRead];
      bytesRead += 1;
      const value = size === 1 ? buf.readUInt8(offset + bytesRead)
                  : size === 2 ? buf.readUInt16BE(offset + bytesRead)
                  : size === 4 ? buf.readUInt32BE(offset + bytesRead)
                  : buf.readUInt32BE(offset + bytesRead); // 8B: lire les 4 bytes hauts (suffisant pour volts)
      bytesRead += size;

      // IO IDs Teltonika standard (FMB120/FMB920)
      switch (ioId) {
        case 239: acc = value === 1; break;             // Ignition
        case 66:  externalVolt = value; break;           // External Voltage (mV)
        case 67:  batteryPercent = Math.min(100, Math.round(value / 10)); break; // Battery (%)
        case 247: harshBraking = value === 1; break;    // Harsh Braking
        case 248: harshAccel = value === 1; break;      // Harsh Acceleration
        case 249: crash = value === 1; break;            // Crash Detection
      }
    }
  }

  return {
    record: {
      timestamp,
      latitude,
      longitude,
      altitude,
      heading,
      satellites,
      speed,
      acc,
      externalVolt,
      batteryPercent,
      harshBraking,
      harshAccel,
      crash,
    },
    bytesRead,
  };
}

export class TeltonikaParser implements GpsParser {
  protocolName = 'TELTONIKA';

  canParse(data: Buffer | string): boolean {
    if (typeof data === 'string') {
      // Étape 1 du handshake : l'IMEI est envoyé en ASCII avec 2 bytes de longueur
      // Format : 0x00 0x0F suivi de 15 chiffres ASCII
      const buf = Buffer.from(data.replace(/\r?\n$/, ''));
      if (buf.length >= 2) {
        const len = buf.readUInt16BE(0);
        if (len >= 10 && len <= 16 && buf.length === len + 2) {
          const imeiStr = buf.slice(2).toString('ascii');
          if (/^\d{10,16}$/.test(imeiStr)) return true;
        }
      }
      return false;
    }
    const buf = data;
    // Étape 1 : IMEI (2B length + ASCII digits)
    if (buf.length >= 12 && buf.length <= 18) {
      const len = buf.readUInt16BE(0);
      if (len >= 10 && len <= 16 && buf.length === len + 2) {
        const imeiStr = buf.slice(2).toString('ascii');
        if (/^\d{10,16}$/.test(imeiStr)) return true;
      }
    }
    // Étape 2 : Paquet AVL (commence par 0x00 0x00 0x00 0x00 — preamble)
    if (buf.length > 12 &&
        buf[0] === 0x00 && buf[1] === 0x00 &&
        buf[2] === 0x00 && buf[3] === 0x00) {
      return true;
    }
    return false;
  }

  parse(data: Buffer | string, socket?: net.Socket): GpsData | null {
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as string, 'binary');

      // ─── ÉTAPE 1 : Paquet IMEI ──────────────────────────────────────────
      if (buf.length <= 18 && buf[0] === 0x00) {
        const len = buf.readUInt16BE(0);
        const imeiStr = buf.slice(2, 2 + len).toString('ascii').trim();
        if (/^\d{10,16}$/.test(imeiStr)) {
          if (socket) {
            socketImeiMap.set(socket, imeiStr);
            console.log(`[TELTONIKA] IMEI reçu: ${imeiStr} — envoi ACK 0x01`);
            socket.write(Buffer.from([0x01])); // ACK : accepter l'appareil
          }
          return null; // Pas de données GPS dans le paquet IMEI
        }
      }

      // ─── ÉTAPE 2 : Paquet AVL Data ──────────────────────────────────────
      const imei = socket ? socketImeiMap.get(socket) : undefined;
      if (!imei) {
        console.warn('[TELTONIKA] Paquet AVL reçu sans IMEI préalable');
        return null;
      }

      // Structure : Preamble(4B) | DataLength(4B) | CodecID(1B) | RecordCount(1B) | Records | RecordCount2(1B) | CRC(4B)
      if (buf.length < 12) return null;

      const dataLength = buf.readUInt32BE(4);
      const codecId    = buf[8];
      const recordCount = buf[9];

      if (codecId !== 0x08 && codecId !== 0x8e) { // Codec 8 ou Codec 8 Extended
        console.warn(`[TELTONIKA] Codec ID non supporté: 0x${codecId.toString(16)}`);
        return null;
      }

      // Validation CRC16/CCITT (sur les bytes DataLength + CodecID + Records, excluant Preamble et CRC)
      const crcStart = 8; // après preamble (4B)
      const crcEnd   = buf.length - 4;
      if (crcEnd > crcStart) {
        const expectedCrc = buf.readUInt32BE(buf.length - 4) & 0xffff;
        const calculatedCrc = crc16Ccitt(buf, crcStart, crcEnd);
        if (expectedCrc !== calculatedCrc) {
          console.warn(`[TELTONIKA] CRC invalide — attendu 0x${expectedCrc.toString(16)}, calculé 0x${calculatedCrc.toString(16)}`);
          return null;
        }
      }

      // Envoi ACK : nombre de records reçus
      if (socket) {
        const ack = Buffer.alloc(4);
        ack.writeUInt32BE(recordCount, 0);
        socket.write(ack);
      }

      // Décoder le premier record GPS (le plus récent en cas de multiples)
      const firstRecord = decodeAvlRecord(buf, 10);
      if (!firstRecord) return null;

      const { record } = firstRecord;

      return {
        imei,
        timestamp:  record.timestamp ?? new Date(),
        latitude:   record.latitude  ?? 0,
        longitude:  record.longitude ?? 0,
        speed:      record.speed     ?? 0,
        heading:    record.heading   ?? 0,
        altitude:   record.altitude,
        satellites: record.satellites,
        acc:        record.acc,
        externalVolt:   record.externalVolt,
        batteryPercent: record.batteryPercent,
        harshBraking:   record.harshBraking,
        harshAccel:     record.harshAccel,
        crash:          record.crash,
        raw: buf.toString('hex'),
        protocol: 'TELTONIKA',
      };
    } catch (error) {
      console.error('[TELTONIKA] Erreur de parsing:', error);
      return null;
    }
  }
}
