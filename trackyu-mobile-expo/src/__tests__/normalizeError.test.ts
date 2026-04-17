/**
 * @jest-environment node
 */

// Simule l'environnement production par défaut (messages génériques)
(global as unknown as Record<string, unknown>).__DEV__ = false;

import { normalizeError } from '../utils/errorTypes';

describe('normalizeError — entrées non-objet', () => {
  it('retourne UNKNOWN pour null', () => {
    const result = normalizeError(null);
    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBeTruthy();
  });

  it('retourne UNKNOWN pour undefined', () => {
    expect(normalizeError(undefined).code).toBe('UNKNOWN');
  });

  it('retourne UNKNOWN pour une string', () => {
    expect(normalizeError('erreur').code).toBe('UNKNOWN');
  });

  it('retourne UNKNOWN pour un nombre', () => {
    expect(normalizeError(42).code).toBe('UNKNOWN');
  });
});

describe('normalizeError — timeout', () => {
  it('retourne TIMEOUT pour ECONNABORTED', () => {
    const result = normalizeError({ code: 'ECONNABORTED' });
    expect(result.code).toBe('TIMEOUT');
    expect(result.message).toMatch(/expir/i);
  });
});

describe('normalizeError — réseau absent', () => {
  it('retourne NETWORK quand request présent mais pas response', () => {
    const result = normalizeError({ request: {}, response: undefined });
    expect(result.code).toBe('NETWORK');
    expect(result.message).toMatch(/serveur/i);
  });

  it('ne retourne pas NETWORK si response est présente', () => {
    const result = normalizeError({ request: {}, response: { status: 500, data: {} } });
    expect(result.code).not.toBe('NETWORK');
  });
});

describe('normalizeError — codes HTTP', () => {
  it('retourne AUTH pour 401', () => {
    const result = normalizeError({ response: { status: 401, data: {} } });
    expect(result.code).toBe('AUTH');
    expect(result.status).toBe(401);
  });

  it('retourne NOT_FOUND pour 404', () => {
    const result = normalizeError({ response: { status: 404, data: {} } });
    expect(result.code).toBe('NOT_FOUND');
    expect(result.status).toBe(404);
  });

  it('retourne SERVER pour 500', () => {
    const result = normalizeError({ response: { status: 500, data: {} } });
    expect(result.code).toBe('SERVER');
    expect(result.status).toBe(500);
  });

  it('retourne SERVER pour 503', () => {
    const result = normalizeError({ response: { status: 503, data: {} } });
    expect(result.code).toBe('SERVER');
  });

  it('retourne UNKNOWN pour 400', () => {
    const result = normalizeError({ response: { status: 400, data: {} } });
    expect(result.code).toBe('UNKNOWN');
    expect(result.status).toBe(400);
  });

  it('retourne UNKNOWN pour 422', () => {
    const result = normalizeError({ response: { status: 422, data: { message: 'Données invalides' } } });
    expect(result.code).toBe('UNKNOWN');
  });
});

describe('normalizeError — messages selon __DEV__', () => {
  afterEach(() => {
    // Remettre en prod après chaque test qui change __DEV__
    (global as unknown as Record<string, unknown>).__DEV__ = false;
  });

  it('message SERVER générique en prod', () => {
    (global as unknown as Record<string, unknown>).__DEV__ = false;
    const result = normalizeError({ response: { status: 500, data: { message: 'Stack trace interne' } } });
    expect(result.message).not.toContain('Stack trace interne');
    expect(result.message).toMatch(/erreur serveur/i);
  });

  it('message SERVER détaillé en dev', () => {
    (global as unknown as Record<string, unknown>).__DEV__ = true;
    const result = normalizeError({ response: { status: 500, data: { message: 'Stack trace interne' } } });
    expect(result.message).toBe('Stack trace interne');
  });

  it('message UNKNOWN générique en prod quand serverMessage présent', () => {
    (global as unknown as Record<string, unknown>).__DEV__ = false;
    const result = normalizeError({ response: { status: 400, data: { message: 'Détail interne' } } });
    expect(result.message).toBe('Une erreur est survenue.');
  });

  it('message UNKNOWN détaillé en dev', () => {
    (global as unknown as Record<string, unknown>).__DEV__ = true;
    const result = normalizeError({ response: { status: 400, data: { message: 'Détail interne' } } });
    expect(result.message).toBe('Détail interne');
  });
});

describe('normalizeError — status absent', () => {
  it('status undefined quand pas de response', () => {
    const result = normalizeError({ code: 'ECONNABORTED' });
    expect(result.status).toBeUndefined();
  });

  it('status présent quand response existe', () => {
    const result = normalizeError({ response: { status: 401, data: {} } });
    expect(result.status).toBe(401);
  });
});
