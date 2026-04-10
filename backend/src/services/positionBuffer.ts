// backend/src/services/positionBuffer.ts
// Buffer de positions GPS avec insertion batch PostgreSQL + WAL disque
//
// P1 FIX : Si la DB est down, les positions sont sauvegardées dans un fichier
// JSONL (write-ahead log) et rejouées automatiquement à la reconnexion.

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

const BATCH_SIZE      = parseInt(process.env.GPS_BUFFER_BATCH || '100');
const FLUSH_INTERVAL  = parseInt(process.env.GPS_BUFFER_INTERVAL || '1000'); // ms
const MAX_BUFFER_SIZE = 500;
const WAL_PATH        = process.env.GPS_WAL_PATH || path.join(process.cwd(), 'backend/logs/positions.wal');

// S'assurer que le répertoire WAL existe
try {
  const walDir = path.dirname(WAL_PATH);
  if (!fs.existsSync(walDir)) fs.mkdirSync(walDir, { recursive: true });
} catch {}

class PositionBuffer {
  private buffer: PositionEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushingWal = false;

  private db: any = null;

  constructor() {
    this.loadDb();
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    // Rejouer le WAL toutes les 30s si des entrées y sont en attente
    setInterval(() => this.replayWal(), 30_000);
  }

  private async loadDb() {
    try {
      const mod = await import('../config/database.js');
      this.db = mod.default;
    } catch {
      console.warn('[PositionBuffer] Impossible de charger le module database');
    }
  }

  add(position: PositionEntry): void {
    this.buffer.push(position);
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    if (!this.db) return;

    const batch = this.buffer.splice(0, BATCH_SIZE);

    try {
      await this.insertBatch(batch);
    } catch (err) {
      console.error('[PositionBuffer] Échec insertion batch, écriture WAL:', (err as Error).message);
      this.writeToWal(batch);
      // Remettre ce qui n'a pas été inséré dans le buffer (sans créer de boucle infinie)
      if (this.buffer.length < MAX_BUFFER_SIZE) {
        this.buffer.unshift(...batch.slice(BATCH_SIZE)); // Garder le surplus
      }
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

  // ─── Write-Ahead Log (WAL) disque ─────────────────────────────────────────

  private writeToWal(batch: PositionEntry[]): void {
    try {
      const lines = batch.map(p => JSON.stringify({
        ...p,
        timestamp: p.timestamp.toISOString(),
      })).join('\n') + '\n';
      fs.appendFileSync(WAL_PATH, lines, 'utf8');
      console.info(`[PositionBuffer] ${batch.length} positions sauvegardées dans WAL (${WAL_PATH})`);
    } catch (walErr) {
      console.error('[PositionBuffer] CRITIQUE — Impossible d\'écrire dans le WAL:', walErr);
    }
  }

  async replayWal(): Promise<void> {
    if (this.isFlushingWal) return;
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

      console.info(`[PositionBuffer] Replay WAL: ${lines.length} positions en attente`);

      // Traiter par batches de 100
      for (let i = 0; i < lines.length; i += BATCH_SIZE) {
        const batchLines = lines.slice(i, i + BATCH_SIZE);
        const batch: PositionEntry[] = batchLines.map(l => {
          const p = JSON.parse(l);
          return { ...p, timestamp: new Date(p.timestamp) };
        });
        await this.insertBatch(batch);
      }

      // Vider le WAL après replay réussi
      fs.writeFileSync(WAL_PATH, '', 'utf8');
      console.info(`[PositionBuffer] WAL rejoué et vidé (${lines.length} positions)`);

    } catch (err) {
      console.error('[PositionBuffer] Erreur replay WAL:', (err as Error).message);
    } finally {
      this.isFlushingWal = false;
    }
  }

  // Pour les tests / shutdown gracieux
  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.buffer.length > 0) {
      console.info(`[PositionBuffer] Shutdown — flush final de ${this.buffer.length} positions`);
      await this.flush();
    }
  }

  get bufferSize(): number {
    return this.buffer.length;
  }

  get walExists(): boolean {
    return fs.existsSync(WAL_PATH) && fs.statSync(WAL_PATH).size > 0;
  }
}

export const positionBuffer = new PositionBuffer();

// Shutdown gracieux
process.on('SIGTERM', () => { void positionBuffer.shutdown(); });
process.on('SIGINT',  () => { void positionBuffer.shutdown(); });
