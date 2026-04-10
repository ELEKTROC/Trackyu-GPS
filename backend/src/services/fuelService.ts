// backend/src/services/fuelService.ts
// Service de gestion du carburant GPS
// P1 FIX : Alpha de lissage configurable par véhicule (vehicle.fuelSmoothingAlpha)

export interface FuelAnomaly {
  type: 'REFILL' | 'THEFT';
  deltaPercent: number;
  previousLiters: number;
  currentLiters: number;
}

export class FuelService {
  /**
   * Filtre passe-bas exponentiel pour lisser les variations du capteur carburant.
   *
   * formule : smoothed = alpha × raw + (1 - alpha) × previous
   *
   * @param rawLevel    Valeur brute du capteur (litres)
   * @param prevLevel   Dernière valeur lissée (null si première lecture)
   * @param alpha       Coefficient [0.1, 1.0] — défaut 0.3
   *                    0.1 = très lisse / lent (capteurs très bruités)
   *                    0.5 = équilibré (recommandé réservoirs normaux)
   *                    1.0 = pas de lissage (capteur CAN fiable)
   */
  static smoothFuelLevel(
    rawLevel: number,
    prevLevel: number | null | undefined,
    alpha = 0.3
  ): number {
    if (prevLevel == null) return rawLevel;
    const clampedAlpha = Math.max(0.05, Math.min(1.0, alpha));
    return clampedAlpha * rawLevel + (1 - clampedAlpha) * prevLevel;
  }

  /**
   * Détecte les anomalies carburant (vol ou remplissage) entre deux lectures.
   *
   * @param currentLiters   Valeur actuelle lissée
   * @param previousLiters  Valeur précédente lissée
   * @param tankCapacity    Capacité du réservoir en litres
   * @param refillThreshold % minimum de variation positive pour déclencher REFILL (défaut 5%)
   * @param theftThreshold  % minimum de variation négative pour déclencher THEFT (défaut 3%)
   */
  static detectAnomalies(
    currentLiters: number,
    previousLiters: number,
    tankCapacity: number,
    refillThreshold = 5,
    theftThreshold = 3
  ): FuelAnomaly | null {
    if (tankCapacity <= 0 || previousLiters < 0) return null;
    const delta = currentLiters - previousLiters;
    const deltaPercent = Math.abs(delta) / tankCapacity * 100;

    if (delta > 0 && deltaPercent >= refillThreshold) {
      return { type: 'REFILL', deltaPercent, previousLiters, currentLiters };
    }
    if (delta < 0 && deltaPercent >= theftThreshold) {
      return { type: 'THEFT', deltaPercent, previousLiters, currentLiters };
    }
    return null;
  }

  /**
   * Convertit une valeur brute du capteur (tension, résistance, hauteur) en litres
   * via la table de calibration du véhicule.
   *
   * @param rawValue      Valeur brute (ex: mV tension capteur)
   * @param calibTable    Tableau de points [[rawValue, liters], ...] trié par rawValue croissant
   * @returns Litres interpolés linéairement
   */
  static calibrateToLiters(rawValue: number, calibTable: [number, number][]): number {
    if (!calibTable || calibTable.length === 0) return rawValue;

    const sorted = [...calibTable].sort((a, b) => a[0] - b[0]);

    if (rawValue <= sorted[0][0]) return sorted[0][1];
    if (rawValue >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];

    for (let i = 0; i < sorted.length - 1; i++) {
      const [x1, y1] = sorted[i];
      const [x2, y2] = sorted[i + 1];
      if (rawValue >= x1 && rawValue <= x2) {
        // Interpolation linéaire
        const ratio = (rawValue - x1) / (x2 - x1);
        return y1 + ratio * (y2 - y1);
      }
    }
    return rawValue;
  }
}
