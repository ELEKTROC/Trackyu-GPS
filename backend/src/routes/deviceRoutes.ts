// backend/src/routes/deviceRoutes.ts
// Routes API pour la gestion des boîtiers GPS
// Inclut les endpoints de monitoring et diagnostics pour le staff

import { Router, Request, Response } from 'express';
import { getGpsStats, activeConnections, sendCommandToDevice } from '../gps-server/server.js';
import { getFullMetrics } from '../services/metricsService.js';
import { buildCommand, getSupportedCommands } from '../gps-server/commandFactory.js';
import type { Protocol, CommandType } from '../gps-server/commandFactory.js';

const router = Router();

// Middleware simplifié (remplacer par votre middleware d'auth réel)
function requireAdmin(req: Request, res: Response, next: Function) {
  // TODO: Intégrer avec votre système d'authentification
  next();
}

// ─── GET /api/admin/gps-stats ──────────────────────────────────────────────
// Métriques en temps réel du pipeline GPS (pour section "Pipeline GPS" du monitoring)
router.get('/gps-stats', requireAdmin, (_req: Request, res: Response) => {
  try {
    const metrics = getFullMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération métriques GPS' });
  }
});

// ─── GET /api/admin/gps-connections ────────────────────────────────────────
// Liste des boîtiers actuellement connectés au serveur TCP
router.get('/gps-connections', requireAdmin, (_req: Request, res: Response) => {
  const connections = Array.from(activeConnections.entries()).map(([imei, socket]) => ({
    imei,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    isAlive: !socket.destroyed,
  }));
  res.json({ count: connections.length, connections });
});

// ─── GET /api/admin/devices/:imei/diagnostics ──────────────────────────────
// Diagnostic complet d'un boîtier par IMEI
router.get('/devices/:imei/diagnostics', requireAdmin, async (req: Request, res: Response) => {
  const { imei } = req.params;

  if (!/^\d{10,16}$/.test(imei)) {
    return res.status(400).json({ error: 'Format IMEI invalide' });
  }

  let pool: any;
  try {
    const mod = await import('../config/database.js');
    pool = mod.default;
  } catch {
    return res.status(503).json({ error: 'Base de données indisponible' });
  }

  try {
    // Dernières positions
    const posResult = await pool.query(
      `SELECT p.latitude, p.longitude, p.speed, p.time,
              (p.raw_data::json->>'satellites')::int AS satellites,
              (p.raw_data::json->>'batteryMv')::int AS battery_mv,
              p.raw_data::json->>'protocol' AS protocol
       FROM positions p
       JOIN vehicles v ON v.id = p.vehicle_id
       JOIN device_stock ds ON ds.assigned_vehicle_id = v.id
       WHERE ds.imei = $1
       ORDER BY p.time DESC
       LIMIT 1`,
      [imei]
    );

    // Nombre de paquets aujourd'hui
    const countResult = await pool.query(
      `SELECT COUNT(*) AS packets_today
       FROM positions p
       JOIN vehicles v ON v.id = p.vehicle_id
       JOIN device_stock ds ON ds.assigned_vehicle_id = v.id
       WHERE ds.imei = $1
         AND p.time >= CURRENT_DATE`,
      [imei]
    );

    // Infos boîtier en stock
    const deviceResult = await pool.query(
      `SELECT ds.model, ds.status, v.name AS vehicle_name, v.plate
       FROM device_stock ds
       LEFT JOIN vehicles v ON ds.assigned_vehicle_id = v.id
       WHERE ds.imei = $1`,
      [imei]
    );

    const lastPos = posResult.rows[0] || null;
    const packetsToday = parseInt(countResult.rows[0]?.packets_today || '0');
    const deviceInfo = deviceResult.rows[0] || null;
    const isConnected = activeConnections.has(imei);

    // Qualité signal basée sur les satellites
    let signalQuality: string = 'UNKNOWN';
    if (lastPos?.satellites !== null && lastPos?.satellites !== undefined) {
      const sats = lastPos.satellites;
      if (sats >= 8) signalQuality = 'EXCELLENT';
      else if (sats >= 6) signalQuality = 'GOOD';
      else if (sats >= 4) signalQuality = 'FAIR';
      else signalQuality = 'POOR';
    }

    // Stats du pipeline pour cet IMEI
    const gpsStats = getGpsStats();
    const unknownEntry = gpsStats.unknownImeis[imei];

    res.json({
      imei,
      protocol: lastPos?.protocol || null,
      vehicleName: deviceInfo?.vehicle_name || null,
      vehiclePlate: deviceInfo?.plate || null,
      deviceModel: deviceInfo?.model || null,
      deviceStatus: deviceInfo?.status || null,
      isConnected,
      lastFix: lastPos?.time || null,
      lastPosition: lastPos ? { lat: lastPos.latitude, lng: lastPos.longitude } : null,
      lastSpeed: lastPos?.speed || null,
      batteryMv: lastPos?.battery_mv || null,
      satellites: lastPos?.satellites || null,
      signalQuality,
      packetsToday,
      isUnknownImei: !!unknownEntry,
      unknownPacketCount: unknownEntry?.count || 0,
    });

  } catch (err) {
    console.error('[DeviceRoutes] Erreur diagnostics:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des diagnostics' });
  }
});

// ─── POST /api/admin/devices/:imei/command ─────────────────────────────────
// Envoie une commande à un boîtier connecté
router.post('/devices/:imei/command', requireAdmin, async (req: Request, res: Response) => {
  const { imei } = req.params;
  const { type, protocol, params = {} } = req.body;

  if (!/^\d{10,16}$/.test(imei)) {
    return res.status(400).json({ error: 'Format IMEI invalide' });
  }
  if (!type || !protocol) {
    return res.status(400).json({ error: 'type et protocol requis' });
  }

  if (!activeConnections.has(imei)) {
    return res.status(409).json({
      error: 'Boîtier non connecté',
      message: 'Le boîtier doit être en ligne pour recevoir des commandes GPRS',
    });
  }

  const command = buildCommand(protocol as Protocol, type as CommandType, params);
  if (!command) {
    return res.status(400).json({
      error: 'Commande non supportée',
      supported: getSupportedCommands(protocol as Protocol),
    });
  }

  const result = await sendCommandToDevice(imei, command.payload);

  // Log de la commande en base
  try {
    const mod = await import('../config/database.js');
    await mod.default.query(
      `INSERT INTO device_commands (imei, type, protocol, payload_hex, sent_at, success, error_msg)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
      [imei, type, protocol, command.payload.toString('hex'), result.success, result.error || null]
    );
  } catch {}

  if (result.success) {
    res.json({ success: true, description: command.description });
  } else {
    res.status(502).json({ success: false, error: result.error });
  }
});

// ─── GET /api/admin/devices/:imei/command-history ──────────────────────────
// Historique des commandes envoyées à un boîtier
router.get('/devices/:imei/command-history', requireAdmin, async (req: Request, res: Response) => {
  const { imei } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string || '50'), 200);

  let pool: any;
  try {
    const mod = await import('../config/database.js');
    pool = mod.default;
  } catch {
    return res.status(503).json({ error: 'Base de données indisponible' });
  }

  const result = await pool.query(
    `SELECT id, type, protocol, sent_at, success, error_msg
     FROM device_commands
     WHERE imei = $1
     ORDER BY sent_at DESC
     LIMIT $2`,
    [imei, limit]
  ).catch(() => ({ rows: [] }));

  res.json({ imei, history: result.rows });
});

// ─── GET /api/admin/devices/:imei/supported-commands ──────────────────────
router.get('/devices/:imei/supported-commands', requireAdmin, async (req: Request, res: Response) => {
  const { imei } = req.params;
  let pool: any;
  try {
    const mod = await import('../config/database.js');
    pool = mod.default;
  } catch {
    return res.status(503).json({ error: 'Base de données indisponible' });
  }

  // Récupérer le protocole du dernier paquet connu
  const result = await pool.query(
    `SELECT DISTINCT p.raw_data::json->>'protocol' AS protocol
     FROM positions p
     JOIN vehicles v ON v.id = p.vehicle_id
     JOIN device_stock ds ON ds.assigned_vehicle_id = v.id
     WHERE ds.imei = $1
       AND p.time > NOW() - INTERVAL '7 days'
     ORDER BY protocol
     LIMIT 1`,
    [imei]
  ).catch(() => ({ rows: [] }));

  const protocol = result.rows[0]?.protocol as Protocol | null;
  const supported = protocol ? getSupportedCommands(protocol) : [];

  res.json({ imei, protocol, supportedCommands: supported });
});

export default router;
