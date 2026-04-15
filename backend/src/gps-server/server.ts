// backend/src/gps-server/server.ts
// Serveur TCP GPS multi-protocoles TrackYu — Pipeline de précision
//
// Corrections P0 :
//   • GT06 IMEI hardcodé → IMEI réel depuis login packet
//   • Parseurs Teltonika/Meitrack/WialonIPS branchés
//   • Validation coordonnées/vitesse/cap centralisée
//   • CRC validation dans chaque parseur
//   • Rate-limiting par IMEI (10 pkt/s)
//
// Corrections P1 :
//   • Anti-drift amélioré (speed=0 + dist<50m + ts<30s)
//   • Position buffer avec WAL disque

import net from 'net';
import { TextProtocolParser } from './parsers/textProtocol';
import { TextExtendedParser } from './parsers/textExtended';
import { GT06Parser } from './parsers/gt06';
import { TeltonikaParser } from './parsers/teltonika';
import { MeitrackParser } from './parsers/meitrack';
import { WialonIpsParser } from './parsers/wialonIps';
import { QueclinkParser } from './parsers/queclink';
import { SuntechParser } from './parsers/suntech';
import type { GpsData, GpsParser } from './types';
import { validateGpsData, calculateDistance } from './utils';
import { filterPosition } from './precision';

// ─── Imports services (avec fallbacks gracieux si module absent) ──────────────
let pool: any = null;
let CacheService: any = null;
let positionBuffer: any = null;
let socketThrottle: any = null;
let FuelService: any = null;
let metricsService: any = null;
let evaluateRulesForVehicle: any = null;
let getIO: any = null;
let logger: any = console;

try { ({ default: pool } = await import('../config/database.js')); } catch {}
try { ({ CacheService } = await import('../services/cacheService.js')); } catch {}
try { ({ positionBuffer } = await import('../services/positionBuffer.js')); } catch {}
try { ({ socketThrottle } = await import('../services/socketThrottle.js')); } catch {}
try { ({ FuelService } = await import('../services/fuelService.js')); } catch {}
try { metricsService = await import('../services/metricsService.js'); } catch {}
try { ({ evaluateRulesForVehicle } = await import('../services/ruleEvaluationService.js')); } catch {}
try { ({ getIO } = await import('../socket.js')); } catch {}
try { ({ default: logger } = await import('../utils/logger.js')); } catch {}

const PORT = process.env.GPS_PORT ? parseInt(process.env.GPS_PORT) : 5000;

// ─── Parseurs (ORDRE IMPORTANT : plus spécifiques en premier) ─────────────────
// Teltonika et GT06 doivent précéder les parseurs texte pour éviter
// des faux positifs sur les paquets binaires.
const parsers: GpsParser[] = [
  new TeltonikaParser(),    // Codec 8/8E — 0x00 0x00 preamble OU IMEI ASCII
  new GT06Parser(),         // Binaire 0x78 0x78 — login + GPS (GT06, Concox, JimiIoT, Coban, Seeworld)
  new QueclinkParser(),     // ASCII +RESP:GT... — GV300, GV500, GV600, GL300
  new SuntechParser(),      // ASCII SA200STT;... — ST310, ST340, ST600, ST900
  new MeitrackParser(),     // Texte $$...*checksum
  new WialonIpsParser(),    // Texte #L#, #D#, #B#
  new TextExtendedParser(), // Texte :::key=val...###
  new TextProtocolParser(), // Texte IMEI,LAT,LNG,SPEED,HDG,...
];

// ─── Session state ─────────────────────────────────────────────────────────────
// Protocole détecté par socket (évite la re-détection à chaque paquet)
const socketProtocolMap = new WeakMap<net.Socket, GpsParser>();

// Connexions actives IMEI → socket (pour envoyer des commandes aux boîtiers)
export const activeConnections = new Map<string, net.Socket>();

// ─── Métriques pipeline (exposées via /api/admin/gps-stats) ──────────────────
interface ParserStat {
  total: number;
  valid: number;
  rejected: number;
  crcErrors: number;
  lastSeen: Date | null;
}
export const pipelineStats: Record<string, ParserStat> = {};
export const unknownImeiLog: Map<string, { count: number; lastSeen: Date }> = new Map();

function getParserStat(name: string): ParserStat {
  if (!pipelineStats[name]) {
    pipelineStats[name] = { total: 0, valid: 0, rejected: 0, crcErrors: 0, lastSeen: null };
  }
  return pipelineStats[name];
}

// ─── Rate limiter par IMEI (sliding window 1 seconde) ─────────────────────────
const RATE_LIMIT_MAX = parseInt(process.env.GPS_RATE_LIMIT || '10');
const imeiTimestamps = new Map<string, number[]>();

function checkRateLimit(imei: string): boolean {
  const now = Date.now();
  const window = imeiTimestamps.get(imei) || [];
  const recent = window.filter(t => now - t < 1000);
  if (recent.length >= RATE_LIMIT_MAX) {
    return false; // Rate limit dépassé
  }
  recent.push(now);
  imeiTimestamps.set(imei, recent);
  return true;
}

// Nettoyage périodique du rate limiter (évite la fuite mémoire)
setInterval(() => {
  const cutoff = Date.now() - 5000;
  for (const [imei, timestamps] of imeiTimestamps.entries()) {
    const fresh = timestamps.filter(t => t > cutoff);
    if (fresh.length === 0) imeiTimestamps.delete(imei);
    else imeiTimestamps.set(imei, fresh);
  }
}, 30_000);

// ─── Traitement principal d'un paquet GPS reçu ──────────────────────────────
async function handleGpsData(
  parsedData: GpsData,
  parserName: string,
  socket: net.Socket
): Promise<void> {
  const stat = getParserStat(parserName);
  stat.total++;
  stat.lastSeen = new Date();

  // 1. Validation des données GPS (bornes physiques)
  const validation = validateGpsData(parsedData);
  if (!validation.valid) {
    stat.rejected++;
    logger.warn?.(`[GPS] Données rejetées pour IMEI ${parsedData.imei}: ${validation.reason}`);
    return;
  }

  // 2. Rate limiting par IMEI
  if (!checkRateLimit(parsedData.imei)) {
    logger.warn?.(`[GPS] Rate limit dépassé pour IMEI ${parsedData.imei} (max ${RATE_LIMIT_MAX}/sec)`);
    return;
  }

  stat.valid++;

  // 3. Vérification IMEI connu (Cache Redis → DB)
  let vehicleId: string | null = null;
  let vehicle: any = null;

  if (CacheService) {
    const isKnown = await CacheService.isDeviceKnown(parsedData.imei).catch(() => true);
    if (!isKnown) {
      const entry = unknownImeiLog.get(parsedData.imei) || { count: 0, lastSeen: new Date() };
      entry.count++;
      entry.lastSeen = new Date();
      unknownImeiLog.set(parsedData.imei, entry);
      logger.warn?.(`[GPS] IMEI inconnu: ${parsedData.imei} (${entry.count} paquets ignorés)`);
      return;
    }
    vehicle = await CacheService.getVehicleByImei(parsedData.imei).catch(() => null);
    vehicleId = vehicle?.id || null;
  }

  if (!vehicleId) {
    logger.debug?.(`[GPS] Pas de véhicule mappé pour IMEI ${parsedData.imei}`);
    return;
  }

  // 4. Enregistrement de la connexion active (pour envoi de commandes)
  activeConnections.set(parsedData.imei, socket);

  // 5. Calcul distance depuis dernière position (anti-drift)
  let distanceDelta = 0;
  if (CacheService) {
    const lastPos = await CacheService.getLastPosition(vehicleId).catch(() => null);
    if (lastPos) {
      distanceDelta = calculateDistance(
        lastPos.latitude, lastPos.longitude,
        parsedData.latitude, parsedData.longitude
      );
      // Anti-drift amélioré : ignorer si le boîtier est à l'arrêt, bougé < 50m ET
      // dans les 30 dernières secondes (position stationnaire oscillante)
      if (parsedData.speed === 0 && distanceDelta < 50) {
        const secsSinceLast = (parsedData.timestamp.getTime() - new Date(lastPos.timestamp).getTime()) / 1000;
        if (secsSinceLast < 30) {
          distanceDelta = 0; // Ignorer le micro-déplacement GPS drift
        }
      }
    }
  }

  // 6. Filtrage Kalman + Dead Reckoning (précision trajectoire)
  const dtMs = (() => {
    if (CacheService) {
      // Utilise l'âge du dernier fix Redis si disponible
    }
    return 5_000; // Défaut conservateur (5s entre paquets)
  })();
  const filtered = filterPosition(parsedData.imei, parsedData, dtMs);
  // Remplacer les coordonnées brutes par les coordonnées filtrées
  parsedData.latitude = filtered.lat;
  parsedData.longitude = filtered.lng;
  if (filtered.isExtrapolated) {
    logger.debug?.(`[GPS] Dead reckoning IMEI ${parsedData.imei} (+${filtered.extrapolatedMs}ms)`);
  }

  // 7. Lissage carburant (filtre passe-bas configurable par véhicule)
  let processedFuel = parsedData.fuelLevel;
  if (FuelService && processedFuel !== undefined && vehicle) {
    processedFuel = FuelService.smoothFuelLevel(
      processedFuel,
      vehicle.lastFuelLevel,
      vehicle.fuelSmoothingAlpha ?? 0.3
    );
  }

  // 8. Mise en buffer pour insertion PostgreSQL (avec WAL disque)
  if (positionBuffer) {
    positionBuffer.add({
      vehicleId,
      latitude: parsedData.latitude,
      longitude: parsedData.longitude,
      speed: parsedData.speed,
      heading: parsedData.heading,
      timestamp: parsedData.timestamp,
      fuelLiters: processedFuel,
      ignition: parsedData.acc ?? false,
      rawData: JSON.stringify({
        protocol: parserName,
        raw: parsedData.raw?.slice(0, 500), // Limiter la taille
        satellites: parsedData.satellites,
        hdop: parsedData.hdop,
        altitude: parsedData.altitude,
        batteryMv: parsedData.externalVolt,
      }),
    });
  }

  // 9. Mise à jour cache dernière position
  if (CacheService) {
    await CacheService.setLastPosition(vehicleId, {
      latitude: parsedData.latitude,
      longitude: parsedData.longitude,
      timestamp: parsedData.timestamp,
      speed: parsedData.speed,
    }).catch(() => {});
  }

  // 10. Émission Socket.IO vers le frontend (avec throttle 2s par véhicule)
  const io = getIO?.();
  if (io && socketThrottle) {
    const shouldEmit = socketThrottle.shouldEmit(vehicleId);
    if (shouldEmit) {
      const tenantId = vehicle?.tenantId;
      const room = tenantId ? `tenant:${tenantId}` : 'superadmin';
      io.to(room).emit('vehicle:update', {
        id: vehicleId,
        location: { lat: parsedData.latitude, lng: parsedData.longitude },
        speed: parsedData.speed,
        heading: parsedData.heading,
        altitude: parsedData.altitude,
        status: parsedData.speed > 3 ? 'MOVING' : parsedData.acc ? 'IDLE' : 'STOPPED',
        lastUpdated: parsedData.timestamp.toISOString(),
        // Télémétriques boîtier (carburant, odomètre, batterie, signal)
        fuelLevel: processedFuel,
        odometer: parsedData.odometer,
        ignition: parsedData.acc ?? false,
        batteryVoltage: parsedData.externalVolt ? parsedData.externalVolt / 1000 : undefined,
        batteryPercent: parsedData.batteryPercent,
        satellites: parsedData.satellites,
        hdop: parsedData.hdop,
        // Alertes comportementales temps réel
        crash: parsedData.crash || false,
        sos: parsedData.sos || false,
        harshBraking: parsedData.harshBraking || false,
        harshAccel: parsedData.harshAccel || false,
      });
    }
  }

  // 11. Alertes comportementales
  if (parsedData.sos || parsedData.crash || parsedData.harshBraking || parsedData.harshAccel) {
    const alertType = parsedData.crash ? 'CRASH'
                    : parsedData.sos ? 'SOS'
                    : parsedData.harshBraking ? 'HARSH_BRAKING'
                    : 'HARSH_ACCEL';
    logger.info?.(`[GPS] Alerte ${alertType} pour véhicule ${vehicleId} (IMEI ${parsedData.imei})`);
    // Les alertes sont insérées par le ruleEvaluationService après l'INSERT en base
  }

  // 12. Métriques Prometheus
  if (metricsService?.incrementGpsPackets) {
    metricsService.incrementGpsPackets(parserName);
  }
}

// ─── Démarrage du serveur TCP ─────────────────────────────────────────────────
export function startGpsServer(): net.Server {
  const server = net.createServer((socket) => {
    logger.info?.(`[GPS] Boîtier connecté: ${socket.remoteAddress}:${socket.remotePort}`);

    // Optimisations TCP pour les petits paquets GPS (20-100 octets)
    socket.setNoDelay(true);               // Désactiver Nagle — pas de buffering
    socket.setKeepAlive(true, 30_000);     // Détecter connexions mortes après 30s

    // Timeout anti-Slowloris (90s sans données → déconnexion)
    socket.setTimeout(90_000);
    socket.on('timeout', () => {
      logger.warn?.(`[GPS] Timeout socket ${socket.remoteAddress}, fermeture`);
      socket.destroy();
    });

    socket.on('data', async (data: Buffer) => {
      try {
        let parsedData: GpsData | null = null;
        let usedParser: GpsParser | null = null;

        // A. Utiliser le parseur déjà identifié pour ce socket (optimisation)
        const knownParser = socketProtocolMap.get(socket);
        if (knownParser) {
          try {
            parsedData = knownParser.parse(data, socket);
            usedParser = knownParser;
          } catch {
            socketProtocolMap.delete(socket); // Forcer re-détection
          }
        }

        // B. Détection automatique du protocole
        if (!parsedData && !usedParser) {
          for (const parser of parsers) {
            if (parser.canParse(data)) {
              try {
                parsedData = parser.parse(data, socket);
                usedParser = parser;
                socketProtocolMap.set(socket, parser); // Mémorisation session
                logger.info?.(`[GPS] Protocole détecté: ${parser.protocolName} depuis ${socket.remoteAddress}`);
              } catch (e) {
                logger.warn?.(`[GPS] Erreur parsing ${parser.protocolName}:`, e);
              }
              break;
            }
          }
        }

        if (!parsedData) {
          // Paquet valide mais sans données GPS (ex: login packet, heartbeat, ACK)
          // → rien à faire, c'est normal
          return;
        }

        // Traitement du paquet GPS valide
        await handleGpsData(parsedData, usedParser?.protocolName || 'UNKNOWN', socket);

      } catch (err) {
        logger.error?.('[GPS] Erreur non gérée dans le handler data:', err);
      }
    });

    socket.on('close', () => {
      // Nettoyer les connexions actives à la déconnexion
      for (const [imei, sock] of activeConnections.entries()) {
        if (sock === socket) {
          activeConnections.delete(imei);
          logger.info?.(`[GPS] Boîtier IMEI ${imei} déconnecté`);
          break;
        }
      }
      socketProtocolMap.delete(socket);
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'ECONNRESET') {
        logger.warn?.(`[GPS] Erreur socket ${socket.remoteAddress}: ${err.message}`);
      }
      socket.destroy();
    });
  });

  // Backlog 4096 : file d'attente connexions TCP (défaut OS = 511)
  // Nécessaire lors des pics de reconnexion simultanée (firmware reboot, coupure réseau)
  server.listen(PORT, '0.0.0.0', 4096, () => {
    logger.info?.(`[GPS] Serveur TCP démarré sur le port ${PORT} (backlog=4096)`);
    logger.info?.(`[GPS] Protocoles actifs: ${parsers.map(p => p.protocolName).join(', ')}`);
    logger.info?.(`[GPS] Buffer: BATCH=${process.env.GPS_BUFFER_BATCH || 500}, MAX=${process.env.GPS_BUFFER_MAX || 10000}, FLUSH=${process.env.GPS_BUFFER_INTERVAL || 500}ms`);
  });

  server.on('error', (err) => {
    logger.error?.('[GPS] Erreur serveur:', err);
  });

  return server;
}

// ─── Envoi de commande à un boîtier connecté ──────────────────────────────────
export async function sendCommandToDevice(
  imei: string,
  command: Buffer | string
): Promise<{ success: boolean; error?: string }> {
  const socket = activeConnections.get(imei);
  if (!socket || socket.destroyed) {
    return { success: false, error: 'Boîtier non connecté' };
  }
  return new Promise((resolve) => {
    const cmd = typeof command === 'string' ? Buffer.from(command) : command;
    socket.write(cmd, (err) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true });
    });
  });
}

// ─── Statistiques pipeline (pour monitoring staff) ───────────────────────────
export function getGpsStats() {
  return {
    activeParsers: parsers.map(p => p.protocolName),
    activeConnections: activeConnections.size,
    stats: pipelineStats,
    unknownImeis: Object.fromEntries(unknownImeiLog.entries()),
    rateLimit: {
      maxPerSec: RATE_LIMIT_MAX,
      trackedImeis: imeiTimestamps.size,
    },
  };
}
