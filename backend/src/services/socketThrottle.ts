// backend/src/services/socketThrottle.ts
// Throttle prioritaire des émissions Socket.IO — Architecture 10k véhicules
//
// Tiers de priorité (latence UI vs charge serveur) :
//   REALTIME  — véhicule sélectionné par un utilisateur     → 500ms
//   MOVING    — véhicule en mouvement (speed > 5 km/h)      → 1 500ms
//   IDLE      — moteur allumé, vitesse nulle                 → 4 000ms
//   PARKED    — moteur coupé                                 → 10 000ms
//
// Calcul charge 10k véhicules / 1500 users :
//   MOVING (30%) = 3000 × 1500ms = 2 000 events/s
//   IDLE   (20%) = 2000 × 4000ms =   500 events/s
//   PARKED (50%) = 5000 × 10000ms=   500 events/s
//   Total estimé : ~3 000 events/s (contre 5 000/s sans tiers)

export type VehicleThrottlePriority = 'REALTIME' | 'MOVING' | 'IDLE' | 'PARKED';

interface ThrottleEntry {
  lastEmit: number;
  priority: VehicleThrottlePriority;
}

const THROTTLE_MS: Record<VehicleThrottlePriority, number> = {
  REALTIME: parseInt(process.env.THROTTLE_REALTIME || '500'),
  MOVING:   parseInt(process.env.THROTTLE_MOVING   || '1500'),
  IDLE:     parseInt(process.env.THROTTLE_IDLE     || '4000'),
  PARKED:   parseInt(process.env.THROTTLE_PARKED   || '10000'),
};

class SocketThrottleService {
  private entries = new Map<string, ThrottleEntry>();

  /**
   * Détermine la priorité d'un véhicule à partir de son état actuel.
   */
  static getPriority(speed: number, ignition: boolean): VehicleThrottlePriority {
    if (speed > 5)            return 'MOVING';
    if (ignition && speed <= 5) return 'IDLE';
    return 'PARKED';
  }

  /**
   * Retourne true si ce vehicleId peut émettre maintenant.
   * @param vehicleId   identifiant du véhicule
   * @param speed       vitesse actuelle (km/h)
   * @param ignition    état contact
   */
  shouldEmit(vehicleId: string, speed = 0, ignition = false): boolean {
    const now = Date.now();
    const priority = SocketThrottleService.getPriority(speed, ignition);
    const throttleMs = THROTTLE_MS[priority];

    const entry = this.entries.get(vehicleId);
    if (!entry || now - entry.lastEmit >= throttleMs) {
      this.entries.set(vehicleId, { lastEmit: now, priority });
      return true;
    }
    return false;
  }

  /**
   * Force l'émission immédiate pour ce véhicule
   * (ex: alerte critique, sélection par utilisateur).
   */
  forceEmit(vehicleId: string): void {
    this.entries.delete(vehicleId);
  }

  /**
   * Passer un véhicule en mode REALTIME (sélectionné par un user).
   * Valide pendant 30 secondes puis revient au mode normal.
   */
  setRealtime(vehicleId: string, durationMs = 30_000): void {
    const now = Date.now();
    this.entries.set(vehicleId, { lastEmit: now - THROTTLE_MS.REALTIME, priority: 'REALTIME' });
    // Retour automatique au mode normal
    setTimeout(() => {
      const entry = this.entries.get(vehicleId);
      if (entry?.priority === 'REALTIME') {
        this.entries.delete(vehicleId); // Prochain shouldEmit recalcule la priorité
      }
    }, durationMs);
  }

  /**
   * Statistiques courantes (monitoring)
   */
  getStats(): {
    tracked: number;
    byPriority: Record<VehicleThrottlePriority, number>;
    throttleConfig: typeof THROTTLE_MS;
  } {
    const byPriority: Record<VehicleThrottlePriority, number> = {
      REALTIME: 0, MOVING: 0, IDLE: 0, PARKED: 0,
    };
    for (const entry of this.entries.values()) {
      byPriority[entry.priority]++;
    }
    return { tracked: this.entries.size, byPriority, throttleConfig: THROTTLE_MS };
  }

  // Nettoyage des véhicules inactifs (>5min sans émission)
  cleanup(maxAgeMs = 300_000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, entry] of this.entries.entries()) {
      if (entry.lastEmit < cutoff) this.entries.delete(id);
    }
  }

  get trackedCount(): number { return this.entries.size; }
}

export const socketThrottle = new SocketThrottleService();

// Nettoyage toutes les 60s
setInterval(() => socketThrottle.cleanup(), 60_000);
