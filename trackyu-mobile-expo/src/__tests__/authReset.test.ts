/**
 * @jest-environment node
 *
 * Tests unitaires — src/utils/authReset.ts
 * Couverture : setAuthResetHandler, setSessionExpiredHandler, setRefreshHandler,
 *              triggerAuthReset, triggerSessionExpired, attemptTokenRefresh
 *
 * Module isolé à chaque describe via jest.resetModules() pour repartir
 * d'un état clean (handlers tous null).
 */

// Helper : obtenir une instance fraîche du module pour chaque groupe de tests
function freshModule() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../utils/authReset') as typeof import('../utils/authReset');
}

// ── triggerAuthReset ────────────────────────────────────────────────────────────

describe('triggerAuthReset', () => {
  it('est une no-op silencieuse si aucun handler enregistré', () => {
    const { triggerAuthReset } = freshModule();
    expect(() => triggerAuthReset()).not.toThrow();
  });

  it('appelle le handler enregistré via setAuthResetHandler', () => {
    const mod = freshModule();
    const handler = jest.fn();
    mod.setAuthResetHandler(handler);
    mod.triggerAuthReset();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('le handler peut être remplacé', () => {
    const mod = freshModule();
    const first = jest.fn();
    const second = jest.fn();
    mod.setAuthResetHandler(first);
    mod.setAuthResetHandler(second);
    mod.triggerAuthReset();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('handler appelé sans arguments', () => {
    const mod = freshModule();
    let calledWith: unknown[] = [];
    mod.setAuthResetHandler((...args: unknown[]) => {
      calledWith = args;
    });
    mod.triggerAuthReset();
    expect(calledWith).toHaveLength(0);
  });
});

// ── triggerSessionExpired ───────────────────────────────────────────────────────

describe('triggerSessionExpired', () => {
  it('est une no-op silencieuse si aucun handler enregistré', () => {
    const { triggerSessionExpired } = freshModule();
    expect(() => triggerSessionExpired()).not.toThrow();
  });

  it('appelle le handler enregistré via setSessionExpiredHandler', () => {
    const mod = freshModule();
    const handler = jest.fn();
    mod.setSessionExpiredHandler(handler);
    mod.triggerSessionExpired();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('triggerAuthReset et triggerSessionExpired sont des handlers indépendants', () => {
    const mod = freshModule();
    const resetFn = jest.fn();
    const expiredFn = jest.fn();
    mod.setAuthResetHandler(resetFn);
    mod.setSessionExpiredHandler(expiredFn);

    mod.triggerAuthReset();
    expect(resetFn).toHaveBeenCalledTimes(1);
    expect(expiredFn).not.toHaveBeenCalled();

    mod.triggerSessionExpired();
    expect(expiredFn).toHaveBeenCalledTimes(1);
    expect(resetFn).toHaveBeenCalledTimes(1); // pas d'appel supplémentaire
  });

  it('peut être déclenché plusieurs fois', () => {
    const mod = freshModule();
    const handler = jest.fn();
    mod.setSessionExpiredHandler(handler);
    mod.triggerSessionExpired();
    mod.triggerSessionExpired();
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

// ── attemptTokenRefresh ─────────────────────────────────────────────────────────

describe('attemptTokenRefresh', () => {
  it('rejette avec "refresh_not_registered" si aucun handler enregistré', async () => {
    const { attemptTokenRefresh } = freshModule();
    await expect(attemptTokenRefresh()).rejects.toThrow('refresh_not_registered');
  });

  it('appelle le handler refresh et retourne le token', async () => {
    const mod = freshModule();
    const refreshFn = jest.fn().mockResolvedValue('new-access-token-xyz');
    mod.setRefreshHandler(refreshFn);
    const token = await mod.attemptTokenRefresh();
    expect(token).toBe('new-access-token-xyz');
    expect(refreshFn).toHaveBeenCalledTimes(1);
  });

  it('propage le rejet du handler refresh', async () => {
    const mod = freshModule();
    mod.setRefreshHandler(() => Promise.reject(new Error('token_expired')));
    await expect(mod.attemptTokenRefresh()).rejects.toThrow('token_expired');
  });

  it('handler refresh peut être remplacé', async () => {
    const mod = freshModule();
    const first = jest.fn().mockResolvedValue('token-v1');
    const second = jest.fn().mockResolvedValue('token-v2');
    mod.setRefreshHandler(first);
    mod.setRefreshHandler(second);
    const token = await mod.attemptTokenRefresh();
    expect(token).toBe('token-v2');
    expect(first).not.toHaveBeenCalled();
  });

  it('plusieurs appels parallèles delèguent chacun au handler', async () => {
    const mod = freshModule();
    let callCount = 0;
    mod.setRefreshHandler(async () => {
      callCount++;
      return `token-${callCount}`;
    });
    const [t1, t2, t3] = await Promise.all([
      mod.attemptTokenRefresh(),
      mod.attemptTokenRefresh(),
      mod.attemptTokenRefresh(),
    ]);
    expect(callCount).toBe(3);
    expect(t1).toBe('token-1');
    expect(t2).toBe('token-2');
    expect(t3).toBe('token-3');
  });
});
