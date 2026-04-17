/**
 * @jest-environment node
 *
 * Tests unitaires — src/utils/circuitBreaker.ts
 *
 * La machine d'états :
 *   CLOSED ──(5 échecs)──► OPEN ──(30s)──► HALF_OPEN
 *     ▲                                        │
 *     └──────────(succès)─────────────────────┘
 *     OPEN ◄────────────(échec)───────────────┘
 *
 * Attention : le circuit breaker utilise un état global de module.
 * Chaque test DOIT appeler resetCircuit() en beforeEach pour partir d'un état propre.
 */
import { checkCircuit, recordSuccess, recordFailure, getCircuitState, resetCircuit } from '../utils/circuitBreaker';

// Constantes calquées sur l'implémentation
const FAILURE_THRESHOLD = 5;
const RESET_MS = 30_000;

// Helper : ouvre le circuit en enregistrant N échecs
function openCircuit(n = FAILURE_THRESHOLD): void {
  for (let i = 0; i < n; i++) recordFailure();
}

describe('circuitBreaker', () => {
  beforeEach(() => {
    resetCircuit();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── État initial ───────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('démarre en CLOSED avec 0 échec', () => {
      expect(getCircuitState()).toEqual({ state: 'CLOSED', failures: 0 });
    });

    it("checkCircuit ne lance pas d'erreur en CLOSED", () => {
      expect(() => checkCircuit()).not.toThrow();
    });
  });

  // ── Transition CLOSED → OPEN ───────────────────────────────────────────────

  describe('CLOSED → OPEN', () => {
    it("reste CLOSED avant d'atteindre le seuil", () => {
      for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) recordFailure();
      expect(getCircuitState().state).toBe('CLOSED');
      expect(getCircuitState().failures).toBe(FAILURE_THRESHOLD - 1);
    });

    it('passe en OPEN exactement au seuil (5 échecs)', () => {
      openCircuit();
      expect(getCircuitState().state).toBe('OPEN');
    });

    it('ne compte pas au-delà du seuil une fois OPEN', () => {
      openCircuit();
      recordFailure(); // 6ème échec → ignoré (déjà OPEN)
      recordFailure(); // 7ème
      expect(getCircuitState().state).toBe('OPEN');
      // failures reste à FAILURE_THRESHOLD (le compteur ne s'incrémente plus)
    });
  });

  // ── checkCircuit en OPEN ───────────────────────────────────────────────────

  describe('checkCircuit en OPEN', () => {
    beforeEach(() => openCircuit());

    it('lance une erreur avec isCircuitOpen=true', () => {
      expect(() => checkCircuit()).toThrow();
      try {
        checkCircuit();
      } catch (e) {
        expect((e as Error & { isCircuitOpen?: boolean }).isCircuitOpen).toBe(true);
        expect((e as Error).message).toMatch(/Serveur indisponible/);
      }
    });

    it('le message indique le temps restant', () => {
      // Avancer de 10s sur les 30s → 20s restantes
      jest.advanceTimersByTime(10_000);
      try {
        checkCircuit();
      } catch (e) {
        expect((e as Error).message).toMatch(/\d+s/);
      }
    });
  });

  // ── Transition OPEN → HALF_OPEN ────────────────────────────────────────────

  describe('OPEN → HALF_OPEN après RESET_MS', () => {
    beforeEach(() => openCircuit());

    it("reste OPEN avant l'expiration du reset", () => {
      jest.advanceTimersByTime(RESET_MS - 1);
      expect(() => checkCircuit()).toThrow(); // toujours OPEN
    });

    it('passe en HALF_OPEN après RESET_MS', () => {
      jest.advanceTimersByTime(RESET_MS);
      expect(() => checkCircuit()).not.toThrow(); // laisse passer la requête test
      expect(getCircuitState().state).toBe('HALF_OPEN');
    });
  });

  // ── HALF_OPEN + succès → CLOSED ────────────────────────────────────────────

  describe('HALF_OPEN + succès → CLOSED', () => {
    beforeEach(() => {
      openCircuit();
      jest.advanceTimersByTime(RESET_MS);
      checkCircuit(); // passe en HALF_OPEN
    });

    it('remet le circuit en CLOSED après un succès en HALF_OPEN', () => {
      recordSuccess();
      expect(getCircuitState()).toEqual({ state: 'CLOSED', failures: 0 });
    });

    it('les requêtes passent normalement après fermeture', () => {
      recordSuccess();
      expect(() => checkCircuit()).not.toThrow();
    });
  });

  // ── HALF_OPEN + échec → OPEN ───────────────────────────────────────────────

  describe('HALF_OPEN + échec → re-ouverture', () => {
    beforeEach(() => {
      openCircuit();
      jest.advanceTimersByTime(RESET_MS);
      checkCircuit(); // passe en HALF_OPEN
    });

    it('re-ouvre le circuit si la requête test échoue', () => {
      recordFailure(); // échec en HALF_OPEN → re-OPEN
      expect(getCircuitState().state).toBe('OPEN');
    });

    it('les requêtes sont à nouveau bloquées après re-ouverture', () => {
      recordFailure();
      expect(() => checkCircuit()).toThrow();
    });
  });

  // ── recordSuccess en CLOSED ────────────────────────────────────────────────

  describe('recordSuccess en CLOSED', () => {
    it("ne change pas l'état si déjà CLOSED", () => {
      recordSuccess();
      expect(getCircuitState()).toEqual({ state: 'CLOSED', failures: 0 });
    });

    it('réinitialise les compteurs si en OPEN (forçage externe)', () => {
      openCircuit();
      recordSuccess();
      expect(getCircuitState()).toEqual({ state: 'CLOSED', failures: 0 });
    });
  });

  // ── resetCircuit ───────────────────────────────────────────────────────────

  describe('resetCircuit', () => {
    it("remet le circuit à CLOSED depuis n'importe quel état", () => {
      openCircuit();
      expect(getCircuitState().state).toBe('OPEN');
      resetCircuit();
      expect(getCircuitState()).toEqual({ state: 'CLOSED', failures: 0 });
    });

    it('le circuit accepte de nouvelles requêtes après reset', () => {
      openCircuit();
      resetCircuit();
      expect(() => checkCircuit()).not.toThrow();
    });
  });

  // ── Scénario de reprise complète ───────────────────────────────────────────

  describe('scénario complet — panne puis reprise', () => {
    it('cycle complet CLOSED→OPEN→HALF_OPEN→CLOSED', () => {
      // 1. Fonctionnement normal
      expect(() => checkCircuit()).not.toThrow();

      // 2. Panne : 5 erreurs consécutives
      openCircuit();
      expect(getCircuitState().state).toBe('OPEN');

      // 3. Circuit bloque les requêtes
      expect(() => checkCircuit()).toThrow();

      // 4. Après 30s, une requête test passe
      jest.advanceTimersByTime(RESET_MS);
      expect(() => checkCircuit()).not.toThrow();
      expect(getCircuitState().state).toBe('HALF_OPEN');

      // 5. La requête test réussit → circuit fermé
      recordSuccess();
      expect(getCircuitState()).toEqual({ state: 'CLOSED', failures: 0 });

      // 6. Retour au fonctionnement normal
      expect(() => checkCircuit()).not.toThrow();
    });

    it('cycle CLOSED→OPEN→HALF_OPEN→OPEN (deux pannes successives)', () => {
      openCircuit(); // OPEN
      jest.advanceTimersByTime(RESET_MS);
      checkCircuit(); // HALF_OPEN
      recordFailure(); // OPEN à nouveau
      expect(getCircuitState().state).toBe('OPEN');

      // Deuxième reset
      jest.advanceTimersByTime(RESET_MS);
      checkCircuit(); // HALF_OPEN
      recordSuccess(); // CLOSED
      expect(getCircuitState().state).toBe('CLOSED');
    });
  });
});
