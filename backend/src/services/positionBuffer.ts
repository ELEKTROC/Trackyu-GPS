// backend/src/services/positionBuffer.ts
// Buffer de positions GPS — Architecture 10k devices
//
// Capacité cible :
//   10 000 devices × 1 paquet/30s = 333 pkt/s soutenu
//   Pic (reconnexion simultanée) : ~2 000 pkt/s
//   DB throughput : 4 batches parallèles × 500 = 2 000 inserts/s
//
// Paramètres env :
//   GPS_BUFFER_BATCH    — taille d'un batch (défaut 500)
//   GPS_BUFFER_INTERVAL — fréquence flush ms (défaut 500)
//   GPS_BUFFER_MAX      — taille max buffer avant overflow (défaut 10000)
//   GPS_PARALLEL_FLUSH  — batches parallèles max (défaut 4)
//   GPS_WAL_PATH        — chemin WAL disque

import fs from 'fs';
import path from 'path';

interface PositionEntry {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: Date;
  fuelLiters?: number;
  ignition: boolean;
  rawData?: string;
}

const BATCH_SIZE      = parseInt(process.env.GPS_BUFFER_BATCH    || '500');
const FLUSH_INTERVAL  = parseInt(process.env.GPS_BUFFER_INTERVAL || '500');   // ms
const MAX_BUFFER_SIZE = parseInt(process.env.GPS_BUFFER_MAX      || '10000');
const MAX_PARALLEL    = parseInt(process.env.GPS_PARALLEL_FLUSH  || '4');
const WAL_PATH        = process.env.GPS_WAL_PATH || path.join(process.cwd(), 'backend/logs/positions.wal');

// Assurer répertoire WAL
try {
  const dir = path.dirname(WAL_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch {}

// ─── Métriques internes ───────────────────────────────────────────────────────
interface BufferMetrics {
  totalInserted: number;
  totalDropped: number;
  totalWalSaved: number;
  flushCount: number;
  lastFlushDuration: number; // ms
  parallelFlushPeak: number;
}

const metrics: BufferMetrics = {
  totalInserted: 0,
  totalDropped: 0,
  totalWalSaved: 0,
  flushCount: 0,
  lastFlushDuration: 0,
  parallelFlushPeak: 0,
};

class PositionBuffer {
  private buffer: PositionEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushingWal = false;
  private activeFlushes = 0;
  private db: any = null;

  constructor() {
    this.loadDb();
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL);
    // Replay WAL toutes les 30s
    setInterval(() => void this.replayWal(), 30_000);
    // Log métriques toutes les 60s
    setInterval(() => this.logMetrics(), 60_000);
  }

  private async loadDb() {
    try {
      const mod = await import('../config/database.js');
      this.db = mod.default;
    } catch {
      console.warn('[PositionBuffer] Module database non disponible');
    }
  }

  add(position: PositionEntry): void {
    // Backpressure : jeter les plus anciens si buffer saturé
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.shift(); // Supprimer le plus ancien
      metrics.totalDropped++;
      if (metrics.totalDropped % 100 === 1) {
        console.error(`[PositionBuffer] SURCHARGE — ${metrics.totalDropped} positions perdues. Augmenter MAX_BUFFER ou la capacité DB.`);
      }
    }
    this.buffer.push(position);

    // Flush urgent si buffer > 80% capacité
    if (this.buffer.length >= MAX_BUFFER_SIZE * 0.8 && this.activeFlushes < MAX_PARALLEL) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.db) return;

    // Calculer combien de batches on peut lancer en parallèle
    const available = MAX_PARALLEL - this.activeFlushes;
    if (available <= 0) return;

    const batchCount = Math.min(available, Math.ceil(this.buffer.length / BATCH_SIZE));
    const start = Date.now();

    const promises: Promise<void>[] = [];
    for (let i = 0; i < batchCount; i++) {
      if (this.buffer.length === 0) break;
      const batch = this.buffer.splice(0, BATCH_SIZE);
      this.activeFlushes++;
      metrics.parallelFlushPeak = Math.max(metrics.parallelFlushPeak, this.activeFlushes);

      promises.push(
        this.insertBatch(batch)
          .then(() => {
            metrics.totalInserted += batch.length;
            metrics.flushCount++;
          })
          .catch((err) => {
            console.error('[PositionBuffer] Échec batch, WAL:', (err as Error).message);
            this.writeToWal(batch);
          })
          .finally(() => {
            this.activeFlushes--;
          })
      );
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      metrics.lastFlushDuration = Date.now() - start;
    }
  }

  private async insertBatch(batch: PositionEntry[]): Promise<void> {
    const vehicleIds  = batch.map(p => p.vehicleId);
    const latitudes   = batch.map(p => p.latitude);
    const longitudes  = batch.map(p => p.longitude);
    const speeds      = batch.map(p => p.speed);
    const headings    = batch.map(p => p.heading);
    const timestamps  = batch.map(p => p.timestamp);
    const fuels       = batch.map(p => p.fuelLiters ?? null);
    const ignitions   = batch.map(p => p.ignition);
    const rawDataArr  = batch.map(p => p.rawData ?? null);

    await this.db.query(`
      INSERT INTO positions
        (vehicle_id, latitude, longitude, speed, heading, time, fuel_liters, ignition, raw_data)
      SELECT * FROM UNNEST(
        $1::text[],
        $2::double precision[],
        $3::double precision[],
        $4::double precision[],
        $5::double precision[],
        $6::timestamptz[],
        $7::decimal[],
        $8::boolean[],
        $9::text[]
      )
      ON CONFLICT DO NOTHING
    `, [vehicleIds, latitudes, longitudes, speeds, headings, timestamps, fuels, ignitions, rawDataArr]);
  }

  // ─── WAL disque (si DB down) ─────────────────────────────────────────────────

  private writeToWal(batch: PositionEntry[]): void {
    try {
      const lines = batch.map(p => JSON.stringify({
        ...p,
        timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp,
      })).join('\n') + '\n';
      fs.appendFileSync(WAL_PATH, lines, 'utf8');
      metrics.totalWalSaved += batch.length;
      console.info(`[PositionBuffer] ${batch.length} positions → WAL (total: ${metrics.totalWalSaved})`);
    } catch (walErr) {
      console.error('[PositionBuffer] CRITIQUE — WAL inaccessible:', walErr);
    }
  }

  async replayWal(): Promise<void> {
    if (this.isFlushingWal || !this.db) return;
    if (!fs.existsSync(WAL_PATH)) return;

    const stat = fs.statSync(WAL_PATH);
    if (stat.size === 0) return;

    this.isFlushingWal = true;
    try {
      const content = fs.readFileSync(WAL_PATH, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length === 0) {
        fs.writeFileSync(WAL_PATH, '', 'utf8');
        return;
      }

      console.info(`[PositionBuffer] Replay WAL: ${lines.length} positions`);

      // Replay en batches parallèles
      const batches: PositionEntry[][] = [];
      for (let i = 0; i < lines.length; i += BATCH_SIZE) {
        batches.push(
          lines.slice(i, i + BATCH_SIZE).map(l => {
            const p = JSON.parse(l);
            return { ...p, timestamp: new Date(p.timestamp) };
          })
        );
      }

      // Insérer par groupes de MAX_PARALLEL
      for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
        const group = batches.slice(i, i + MAX_PARALLEL);
        await Promise.allSettled(group.map(b => this.insertBatch(b)));
      }

      fs.writeFileSync(WAL_PATH, '', 'utf8');
      metrics.totalInserted += lines.length;
      console.info(`[PositionBuffer] WAL rejoué — ${lines.length} positions restaurées`);

    } catch (err) {
      console.error('[PositionBuffer] Erreur replay WAL:', (err as Error).message);
    } finally {
      this.isFlushingWal = false;
    }
  }

  private logMetrics(): void {
    const queueDepth = this.buffer.length;
    const pressure = Math.round(queueDepth / MAX_BUFFER_SIZE * 100);
    console.info(
      `[PositionBuffer] Queue=${queueDepth}/${MAX_BUFFER_SIZE} (${pressure}%) | ` +
      `Inserted=${metrics.totalInserted} | Dropped=${metrics.totalDropped} | ` +
      `WAL=${metrics.totalWalSaved} | ParallelPeak=${metrics.parallelFlushPeak} | ` +
      `LastFlush=${metrics.lastFlushDuration}ms`
    );
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.buffer.length > 0) {
      console.info(`[PositionBuffer] Shutdown — flush final de ${this.buffer.length} positions`);
      // Forcer flush synchrone en mode shutdown
      const batch = this.buffer.splice(0);
      try {
        // Découper en batches et insérer
        for (let i = 0; i < batch.length; i += BATCH_SIZE) {
          await this.insertBatch(batch.slice(i, i + BATCH_SIZE));
        }
      } catch {
        this.writeToWal(batch);
      }
    }
  }

  get bufferSize(): number { return this.buffer.length; }
  get walExists(): boolean {
    return fs.existsSync(WAL_PATH) && fs.statSync(WAL_PATH).size > 0;
  }
  get bufferMetrics(): BufferMetrics { return { ...metrics }; }
  get queuePressure(): number {
    return Math.round(this.buffer.length / MAX_BUFFER_SIZE * 100);
  }
}

export const positionBuffer = new PositionBuffer();

process.on('SIGTERM', () => { void positionBuffer.shutdown(); });
process.on('SIGINT',  () => { void positionBuffer.shutdown(); });
