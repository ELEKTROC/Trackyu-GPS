// backend/src/gps-server/parsers/gt06.ts
// Parseur protocole GT06/Concox (binaire, marqueurs 0x78 0x78)
// BUG FIX : IMEI extrait depuis le login packet (0x01) — plus de hardcoding 'GT06-DEVICE'
// BUG FIX : Validation CRC16 IBM activée

import net from 'net';
import type { GpsParser, GpsData } from '../types';
import { bcdToString, crc16IBM, parseTime } from '../utils';

// Map stateful : socket → IMEI (libérée automatiquement à la déconnexion)
const socketImeiMap = new WeakMap<net.Socket, string>();

/**
 * Construit l'ACK GT06 standard pour le login packet (protocol 0x01).
 * Structure : 78 78 | 05 | 01 | serial(2) | CRC(2) | 0D 0A
 */
function buildLoginAck(serial: number): Buffer {
  const buf = Buffer.alloc(10);
  buf[0] = 0x78; buf[1] = 0x78; // Start marker
  buf[2] = 0x05;                  // Length (protocol + serial + CRC)
  buf[3] = 0x01;                  // Protocol: Login ACK
  buf.writeUInt16BE(serial, 4);   // Numéro de série du paquet
  const crc = crc16IBM(buf, 2, 6);
  buf.writeUInt16BE(crc, 6);      // CRC16 IBM sur length + protocol + serial
  buf[8] = 0x0d; buf[9] = 0x0a;  // Stop marker
  return buf;
}

export class GT06Parser implements GpsParser {
  protocolName = 'GT06';

  canParse(data: Buffer | string): boolean {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');
    // Le protocole GT06 commence toujours par 0x78 0x78
    return buf.length >= 2 && buf[0] === 0x78 && buf[1] === 0x78;
  }

  parse(data: Buffer | string, socket?: net.Socket): GpsData | null {
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');

      // Structure minimale : Start(2) | Length(1) | Protocol(1) | Content(N) | Serial(2) | CRC(2) | Stop(2)
      if (buf.length < 10) return null;

      const length = buf[2];
      const protocol = buf[3];

      // Vérification CRC16 IBM
      // Le CRC couvre : Length + Protocol + Content (sans les 2 stop bytes et sans start/crc)
      // Position CRC = buf.length - 4 (avant 0x0D 0x0A)
      const crcOffset = buf.length - 4;
      if (crcOffset > 4) {
        const expectedCrc = buf.readUInt16BE(crcOffset);
        const calculatedCrc = crc16IBM(buf, 2, crcOffset);
        if (expectedCrc !== calculatedCrc) {
          console.warn(`[GT06] CRC invalide — attendu 0x${expectedCrc.toString(16)}, calculé 0x${calculatedCrc.toString(16)}`);
          return null;
        }
      }

      const serialNumber = buf.readUInt16BE(buf.length - 4);

      // ─── LOGIN PACKET (0x01) : extraction de l'IMEI réel ───────────────────
      if (protocol === 0x01) {
        if (buf.length < 16) {
          console.warn('[GT06] Login packet trop court');
          return null;
        }
        // L'IMEI est encodé en BCD sur 8 bytes à partir de l'offset 4
        // 8 bytes BCD → 15 chiffres IMEI (le 16e nibble est ignoré)
        const imeiStr = bcdToString(buf, 4, 8).slice(0, 15);
        if (!/^\d{15}$/.test(imeiStr)) {
          console.warn(`[GT06] IMEI invalide dans login packet: ${imeiStr}`);
          return null;
        }
        // Mémorisation socket → IMEI
        if (socket) {
          socketImeiMap.set(socket, imeiStr);
          console.log(`[GT06] Login reçu — IMEI: ${imeiStr}, envoi ACK`);
          // Envoyer l'ACK au boîtier
          socket.write(buildLoginAck(serialNumber));
        }
        // Le login packet ne contient pas de données GPS → retourner null
        return null;
      }

      // ─── HEARTBEAT (0x13 ou 0x23) : pas de données GPS ────────────────────
      if (protocol === 0x13 || protocol === 0x23 || protocol === 0x46) {
        // Optionnel : envoyer ACK heartbeat
        return null;
      }

      // ─── PACKET GPS LOCATION (0x12 = ancien, 0x22 = nouveau, 0x19 = alarm) ─
      if (protocol !== 0x12 && protocol !== 0x22 && protocol !== 0x19 && protocol !== 0x16) {
        console.log(`[GT06] Protocol non supporté: 0x${protocol.toString(16)}`);
        return null;
      }

      // Récupérer l'IMEI mémorisé pour ce socket
      let imei = socket ? socketImeiMap.get(socket) : undefined;
      if (!imei) {
        console.warn('[GT06] Pas d\'IMEI mémorisé pour ce socket — login packet manqué?');
        return null;
      }

      // ─── PARSING DATE/HEURE (6 bytes à partir de l'offset 4) ─────────────
      if (buf.length < 4 + 6 + 11) return null; // Taille minimale

      const dateOffset = 4;
      const year   = buf[dateOffset];
      const month  = buf[dateOffset + 1];
      const day    = buf[dateOffset + 2];
      const hour   = buf[dateOffset + 3];
      const minute = buf[dateOffset + 4];
      const second = buf[dateOffset + 5];
      const timestamp = parseTime(year, month, day, hour, minute, second);

      // ─── PARSING DONNÉES GPS (après les 6 bytes date) ────────────────────
      const gpsStart = dateOffset + 6;

      // Byte satellites/validity
      const satByte  = buf[gpsStart];
      const satellites = (satByte >> 4) & 0x0f;  // 4 bits hauts = nb satellites
      const gpsValid   = (satByte & 0x01) === 1;   // bit 0 = validité fix

      if (!gpsValid) {
        console.log(`[GT06] Fix GPS invalide pour IMEI ${imei}`);
        return null;
      }

      // Coordonnées brutes sur 4 bytes chacune
      const latRaw = buf.readUInt32BE(gpsStart + 1);
      const lngRaw = buf.readUInt32BE(gpsStart + 5);
      const speedRaw = buf[gpsStart + 9];          // km/h
      const courseStatus = buf.readUInt16BE(gpsStart + 10);

      // Conversion coordonnées GT06 : valeur / 1800000 (minutes × 10000 → degrés)
      let lat = latRaw / 1800000.0;
      let lng = lngRaw / 1800000.0;

      // Byte de statut (byte haut du course)
      const statusByte = (courseStatus >> 8) & 0xff;
      const heading    = courseStatus & 0x3ff; // 10 bits bas = cap (0-360)

      // Bit 2 (0x04) : 0 = Sud, 1 = Nord
      if (!((statusByte & 0x04) >> 2)) lat = -lat;
      // Bit 3 (0x08) : 0 = Est, 1 = Ouest
      if ((statusByte & 0x08) >> 3) lng = -lng;

      const speed = speedRaw;

      // ─── DONNÉES ADDITIONNELLES (Information Content) ─────────────────────
      let acc: boolean | undefined;
      let externalVolt: number | undefined;
      let batteryPercent: number | undefined;
      let sos = false;
      let harshBraking = false;
      let harshAccel = false;
      let crash = false;

      // Le protocol 0x19 (Alarm) contient un byte d'alarme après le bloc GPS
      if (protocol === 0x19 && buf.length > gpsStart + 12) {
        const alarmByte = buf[gpsStart + 12];
        if (alarmByte === 0x01) sos = true;
        if (alarmByte === 0x09) crash = true;
        if (alarmByte === 0x0b) harshBraking = true;
        if (alarmByte === 0x0c) harshAccel = true;
      }

      // Status byte de courseStatus
      acc = (statusByte & 0x20) !== 0; // Bit 5 = ACC (contact/ignition)

      return {
        imei,
        timestamp,
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        satellites,
        acc,
        externalVolt,
        batteryPercent,
        sos,
        crash,
        harshBraking,
        harshAccel,
        raw: buf.toString('hex'),
        protocol: 'GT06',
      };
    } catch (error) {
      console.error('[GT06] Erreur de parsing:', error);
      return null;
    }
  }
}
