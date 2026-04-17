/**
 * @jest-environment node
 *
 * Tests unitaires — src/utils/pLimit.ts
 * Couverture : runWithConcurrency, mapWithConcurrency
 *
 * Points critiques :
 *  - La limite de concurrence est respectée (pas plus de N tâches en vol)
 *  - L'ordre des résultats est préservé (mapWithConcurrency)
 *  - Les erreurs propagent correctement
 *  - Comportement sur listes vides
 */
import { runWithConcurrency, mapWithConcurrency } from '../utils/pLimit';

// ── Helpers de test ────────────────────────────────────────────────────────────

/** Crée une promesse qui se résout après `ms` ms */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Compteur de concurrence max observée pendant l'exécution */
function concurrencyTracker() {
  let current = 0;
  let max = 0;
  return {
    enter() {
      current++;
      if (current > max) max = current;
    },
    leave() {
      current--;
    },
    getMax() {
      return max;
    },
  };
}

// ── runWithConcurrency ─────────────────────────────────────────────────────────

describe('runWithConcurrency', () => {
  it('résout sans erreur sur une liste vide', async () => {
    await expect(runWithConcurrency([], 5)).resolves.toBeUndefined();
  });

  it('exécute toutes les tâches', async () => {
    const executed: number[] = [];
    const tasks = [1, 2, 3, 4, 5].map((n) => async () => {
      executed.push(n);
    });
    await runWithConcurrency(tasks, 3);
    expect(executed.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('respecte la limite de concurrence (max 2)', async () => {
    const tracker = concurrencyTracker();
    const tasks = Array.from({ length: 10 }, () => async () => {
      tracker.enter();
      await delay(10);
      tracker.leave();
    });
    await runWithConcurrency(tasks, 2);
    expect(tracker.getMax()).toBeLessThanOrEqual(2);
  });

  it('respecte la limite de concurrence (max 5)', async () => {
    const tracker = concurrencyTracker();
    const tasks = Array.from({ length: 20 }, () => async () => {
      tracker.enter();
      await delay(5);
      tracker.leave();
    });
    await runWithConcurrency(tasks, 5);
    expect(tracker.getMax()).toBeLessThanOrEqual(5);
  });

  it('fonctionne avec concurrence = 1 (séquentiel)', async () => {
    const order: number[] = [];
    const tasks = [1, 2, 3].map((n) => async () => {
      await delay(10);
      order.push(n);
    });
    await runWithConcurrency(tasks, 1);
    expect(order).toEqual([1, 2, 3]);
  });

  it('fonctionne quand concurrence > nombre de tâches', async () => {
    const executed: number[] = [];
    const tasks = [1, 2].map((n) => async () => {
      executed.push(n);
    });
    await runWithConcurrency(tasks, 10);
    expect(executed.sort()).toEqual([1, 2]);
  });

  it("n'attend pas si une tâche lance une erreur (propagation)", async () => {
    const tasks = [
      async () => {},
      async () => {
        throw new Error('tâche échouée');
      },
      async () => {},
    ];
    await expect(runWithConcurrency(tasks, 3)).rejects.toThrow('tâche échouée');
  });

  it('cas réel : 30 tâches avec concurrence 5 (générateur kilométrage)', async () => {
    const tracker = concurrencyTracker();
    const results: number[] = [];
    const tasks = Array.from({ length: 30 }, (_, i) => async () => {
      tracker.enter();
      await delay(1);
      results.push(i);
      tracker.leave();
    });
    await runWithConcurrency(tasks, 5);
    expect(results).toHaveLength(30);
    expect(tracker.getMax()).toBeLessThanOrEqual(5);
  });
});

// ── mapWithConcurrency ─────────────────────────────────────────────────────────

describe('mapWithConcurrency', () => {
  it('retourne un tableau vide pour une liste vide', async () => {
    const result = await mapWithConcurrency([], async (x: number) => x * 2);
    expect(result).toEqual([]);
  });

  it('transforme chaque élément', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], async (n) => n * 10);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("PRÉSERVE L'ORDRE des résultats même avec des durées variables", async () => {
    // Les tâches se terminent dans le désordre (durées différentes)
    const durations = [50, 10, 30, 5, 20];
    const result = await mapWithConcurrency(
      durations,
      async (ms) => {
        await delay(ms);
        return ms;
      },
      3
    );
    // L'ordre doit correspondre à l'ordre des items d'entrée, pas à l'ordre de résolution
    expect(result).toEqual(durations);
  });

  it('respecte la limite de concurrence', async () => {
    const tracker = concurrencyTracker();
    await mapWithConcurrency(
      Array.from({ length: 15 }, (_, i) => i),
      async (n) => {
        tracker.enter();
        await delay(10);
        tracker.leave();
        return n;
      },
      4
    );
    expect(tracker.getMax()).toBeLessThanOrEqual(4);
  });

  it('fonctionne avec concurrence = 1 (traitement séquentiel)', async () => {
    const order: number[] = [];
    const result = await mapWithConcurrency(
      [3, 1, 2],
      async (n) => {
        await delay(n * 5);
        order.push(n);
        return n * 100;
      },
      1
    );
    // Séquentiel → ordre de traitement = ordre d'entrée
    expect(order).toEqual([3, 1, 2]);
    // Résultats dans l'ordre des inputs
    expect(result).toEqual([300, 100, 200]);
  });

  it('propage les erreurs', async () => {
    const items = [1, 2, 3];
    await expect(
      mapWithConcurrency(
        items,
        async (n) => {
          if (n === 2) throw new Error('erreur item 2');
          return n;
        },
        2
      )
    ).rejects.toThrow('erreur item 2');
  });

  it("fonctionne quand concurrence > nombre d'items", async () => {
    const result = await mapWithConcurrency([10, 20], async (n) => n + 1, 100);
    expect(result).toEqual([11, 21]);
  });

  it('cas réel : 30 véhicules, retour tableau de stats (valeurs nulles si erreur attrapée)', async () => {
    const vehicles = Array.from({ length: 30 }, (_, i) => ({ id: `v${i}`, name: `V${i}` }));
    const result = await mapWithConcurrency(
      vehicles,
      async (v) => {
        await delay(1);
        return { vehicleId: v.id, km: Math.random() * 100 };
      },
      5
    );
    expect(result).toHaveLength(30);
    expect(result[0].vehicleId).toBe('v0');
    expect(result[29].vehicleId).toBe('v29');
  });
});
