/**
 * TrackYu Mobile — Limiteur de concurrence asynchrone
 *
 * Remplace Promise.all() dans les générateurs de rapports pour éviter
 * les crashes lorsque plusieurs dizaines de requêtes partent simultanément
 * (ex : kilométrage 30 engins = 30 appels getTrips en parallèle).
 *
 * Usage :
 *   await runWithConcurrency(
 *     vehicles.map((v) => () => fetchData(v.id).catch(() => {})),
 *     5  // max 5 requêtes en vol simultanément
 *   );
 */
/** Exécute des tâches sans valeur de retour avec concurrence limitée. */
export async function runWithConcurrency(tasks: (() => Promise<unknown>)[], concurrency = 5): Promise<void> {
  if (tasks.length === 0) return;

  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const idx = cursor++;
      await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
}

/**
 * Remplace Promise.all(items.map(fn)) avec concurrence limitée.
 * Retourne les résultats dans le même ordre que `items`.
 */
export async function mapWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 5): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
