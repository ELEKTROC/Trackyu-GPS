/**
 * TrackYu Mobile — Circuit Breaker
 *
 * Évite d'enchaîner des dizaines de requêtes pendant 30s chacune quand
 * le serveur est down. Après FAILURE_THRESHOLD erreurs consécutives
 * (réseau ou 5xx), le circuit s'ouvre et les requêtes suivantes sont
 * rejetées immédiatement avec une erreur locale — sans attendre le timeout.
 *
 * États :
 *   CLOSED   → fonctionnement normal
 *   OPEN     → requêtes rejetées sans appel réseau
 *   HALF_OPEN → une requête test laissée passer pour vérifier la reprise
 *
 *  CLOSED ──(N échecs)──► OPEN ──(RESET_MS)──► HALF_OPEN
 *    ▲                                              │
 *    └─────────────(succès)────────────────────────┘
 *    OPEN ◄───────────────(échec)──────────────────┘
 */

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Nombre d'échecs consécutifs avant ouverture du circuit */
const FAILURE_THRESHOLD = 5;

/** Durée d'ouverture du circuit avant passage en HALF_OPEN (30s) */
const RESET_MS = 30_000;

let state: State = 'CLOSED';
let failures = 0;
let openedAt = 0;

/** Réinitialise le circuit (fermeture + remise à zéro des compteurs) */
function close() {
  state = 'CLOSED';
  failures = 0;
}

/**
 * Vérifie si une requête peut être envoyée.
 * Lance une erreur si le circuit est OPEN.
 */
export function checkCircuit(): void {
  if (state === 'CLOSED' || state === 'HALF_OPEN') return;

  // OPEN : vérifier si le délai de reset est écoulé
  if (Date.now() - openedAt >= RESET_MS) {
    state = 'HALF_OPEN';
    return; // laisser cette requête test passer
  }

  const remaining = Math.ceil((RESET_MS - (Date.now() - openedAt)) / 1000);
  const err = new Error(`Serveur indisponible — réessai dans ${remaining}s`);
  (err as Error & { isCircuitOpen: boolean }).isCircuitOpen = true;
  throw err;
}

/**
 * À appeler sur chaque réponse réussie.
 * Referme le circuit si on était en HALF_OPEN.
 */
export function recordSuccess(): void {
  if (state !== 'CLOSED') close();
}

/**
 * À appeler sur chaque erreur réseau ou 5xx.
 * Incrémente le compteur et ouvre le circuit si le seuil est atteint.
 *
 * Les erreurs 4xx (dont 401, 429) NE doivent PAS être comptées —
 * elles indiquent une réponse valide du serveur, pas une panne.
 */
export function recordFailure(): void {
  if (state === 'HALF_OPEN') {
    // La requête test a échoué → circuit re-ouvert
    state = 'OPEN';
    openedAt = Date.now();
    return;
  }

  if (state === 'OPEN') return; // déjà ouvert

  failures += 1;
  if (failures >= FAILURE_THRESHOLD) {
    state = 'OPEN';
    openedAt = Date.now();
  }
}

/** État courant du circuit (pour debug/monitoring) */
export function getCircuitState(): { state: State; failures: number } {
  return { state, failures };
}

/** Force la fermeture du circuit (ex: reconnexion réseau détectée) */
export function resetCircuit(): void {
  close();
}
