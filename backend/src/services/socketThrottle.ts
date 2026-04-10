// backend/src/services/socketThrottle.ts
// Throttle des émissions Socket.IO vers le frontend
// Évite de spammer le frontend à 1 position/sec × N véhicules

const DEFAULT_THROTTLE_MS = parseInt(process.env.SOCKET_THROTTLE_MS || '2000');

class SocketThrottleService {
  private lastEmit = new Map<string, number>();

  /**
   * Retourne true si ce vehicleId peut émettre maintenant (throttle respecté).
   */
  shouldEmit(vehicleId: string, throttleMs = DEFAULT_THROTTLE_MS): boolean {
    const now = Date.now();
    const last = this.lastEmit.get(vehicleId) || 0;
    if (now - last >= throttleMs) {
      this.lastEmit.set(vehicleId, now);
      return true;
    }
    return false;
  }

  /**
   * Force l'émission immédiate pour ce véhicule (ex: alerte, commande).
   */
  forceEmit(vehicleId: string): void {
    this.lastEmit.delete(vehicleId);
  }

  get trackedCount(): number {
    return this.lastEmit.size;
  }

  // Nettoyage périodique des véhicules inactifs
  cleanup(maxAgeMs = 300_000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, ts] of this.lastEmit.entries()) {
      if (ts < cutoff) this.lastEmit.delete(id);
    }
  }
}

export const socketThrottle = new SocketThrottleService();
setInterval(() => socketThrottle.cleanup(), 60_000);
