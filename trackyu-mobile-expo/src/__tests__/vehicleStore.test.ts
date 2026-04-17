/**
 * @jest-environment node
 *
 * Tests du store Zustand vehicleStore.
 * Pas de mocks nécessaires : store purement mémoire, aucune dépendance native.
 *
 * Comportements critiques testés :
 *   1. setAllVehicles — population initiale, isInitialized, getVehicleList
 *   2. setAllVehicles — merge REST/WS : les champs live (position, statut, vitesse)
 *      issus du WS sont préservés lors d'un re-chargement REST
 *   3. updateVehicle — mise à jour ciblée d'un véhicule
 *   4. deleteVehicle — suppression d'un véhicule
 *   5. getVehicle — lookup par ID
 *   6. Comportement sur store vide / IDs inconnus
 */

import { useVehicleStore } from '../store/vehicleStore';
import type { Vehicle } from '../api/vehicles';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    name: 'Camion Alpha',
    plate: 'AB-123-CD',
    type: 'truck',
    status: 'stopped',
    latitude: 5.35,
    longitude: -4.0,
    speed: 0,
    lastUpdate: '2026-04-10T08:00:00.000Z',
    imei: '123456789012345',
    isImmobilized: false,
    ...overrides,
  } as Vehicle;
}

function resetStore() {
  useVehicleStore.setState({
    vehicles: new Map(),
    isInitialized: false,
  });
}

beforeEach(resetStore);

// ── setAllVehicles — population initiale ──────────────────────────────────────

describe('setAllVehicles — population initiale', () => {
  it('popule le store avec la liste fournie', () => {
    const v1 = makeVehicle({ id: 'v1' });
    const v2 = makeVehicle({ id: 'v2', name: 'Moto Beta' });

    useVehicleStore.getState().setAllVehicles([v1, v2]);

    const list = useVehicleStore.getState().getVehicleList();
    expect(list).toHaveLength(2);
    expect(list.find((v) => v.id === 'v1')).toBeDefined();
    expect(list.find((v) => v.id === 'v2')).toBeDefined();
  });

  it('passe isInitialized à true', () => {
    expect(useVehicleStore.getState().isInitialized).toBe(false);
    useVehicleStore.getState().setAllVehicles([makeVehicle()]);
    expect(useVehicleStore.getState().isInitialized).toBe(true);
  });

  it("remplace completement les vehicules lors d'un second appel", () => {
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v1' })]);
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v2' }), makeVehicle({ id: 'v3' })]);

    const list = useVehicleStore.getState().getVehicleList();
    expect(list).toHaveLength(2);
    expect(list.find((v) => v.id === 'v1')).toBeUndefined();
  });

  it('accepte un tableau vide sans erreur', () => {
    useVehicleStore.getState().setAllVehicles([]);
    expect(useVehicleStore.getState().getVehicleList()).toHaveLength(0);
    expect(useVehicleStore.getState().isInitialized).toBe(true);
  });
});

// ── setAllVehicles — merge REST/WS (comportement critique) ────────────────────

describe('setAllVehicles — merge REST/WS', () => {
  it("conserve les champs live WS lors d'un refresh REST", () => {
    // 1. Un update WS arrive en premier
    const wsVehicle = makeVehicle({
      id: 'v1',
      latitude: 48.85,
      longitude: 2.35,
      status: 'moving',
      speed: 72,
      lastUpdate: '2026-04-10T09:30:00.000Z',
    });
    useVehicleStore.getState().updateVehicle(wsVehicle);

    // 2. Le REST recharge les métadonnées (position stale, status stopped)
    const restVehicle = makeVehicle({
      id: 'v1',
      name: 'Camion Alpha — Renommé',
      latitude: 5.35,
      longitude: -4.0,
      status: 'stopped',
      speed: 0,
      lastUpdate: '2026-04-10T08:00:00.000Z',
    });
    useVehicleStore.getState().setAllVehicles([restVehicle]);

    const merged = useVehicleStore.getState().getVehicle('v1')!;

    // Les métadonnées REST sont prioritaires
    expect(merged.name).toBe('Camion Alpha — Renommé');
    // Les données live WS sont conservées
    expect(merged.latitude).toBe(48.85);
    expect(merged.longitude).toBe(2.35);
    expect(merged.status).toBe('moving');
    expect(merged.speed).toBe(72);
    expect(merged.lastUpdate).toBe('2026-04-10T09:30:00.000Z');
  });

  it("utilise les données REST si aucun update WS n'existe pour le véhicule", () => {
    const restVehicle = makeVehicle({ id: 'v1', status: 'offline', speed: 0 });
    useVehicleStore.getState().setAllVehicles([restVehicle]);

    const v = useVehicleStore.getState().getVehicle('v1')!;
    expect(v.status).toBe('offline');
    expect(v.speed).toBe(0);
  });

  it("les valeurs WS nullish n'écrasent pas les valeurs REST", () => {
    // WS reçu avec latitude/longitude/speed undefined (partiel)
    const wsPartial = {
      id: 'v1',
      latitude: undefined,
      longitude: undefined,
      speed: undefined,
      status: undefined,
      lastUpdate: undefined,
    } as unknown as Vehicle;
    useVehicleStore.getState().updateVehicle(wsPartial);

    const restVehicle = makeVehicle({ id: 'v1', latitude: 5.35, longitude: -4.0, status: 'idle', speed: 5 });
    useVehicleStore.getState().setAllVehicles([restVehicle]);

    const merged = useVehicleStore.getState().getVehicle('v1')!;
    // Les données REST prennent la place car les champs WS sont undefined/nullish
    expect(merged.latitude).toBe(5.35);
    expect(merged.longitude).toBe(-4.0);
    expect(merged.status).toBe('idle');
  });
});

// ── updateVehicle ─────────────────────────────────────────────────────────────

describe('updateVehicle', () => {
  it('met à jour un véhicule existant', () => {
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v1', status: 'stopped' })]);

    useVehicleStore.getState().updateVehicle(makeVehicle({ id: 'v1', status: 'moving', speed: 60 }));

    const v = useVehicleStore.getState().getVehicle('v1')!;
    expect(v.status).toBe('moving');
    expect(v.speed).toBe(60);
  });

  it('ajoute un véhicule inconnu (update WS avant le REST)', () => {
    useVehicleStore.getState().updateVehicle(makeVehicle({ id: 'v99', status: 'moving' }));

    expect(useVehicleStore.getState().getVehicle('v99')).toBeDefined();
    expect(useVehicleStore.getState().getVehicle('v99')?.status).toBe('moving');
  });

  it('ne touche pas aux autres véhicules', () => {
    useVehicleStore
      .getState()
      .setAllVehicles([makeVehicle({ id: 'v1', status: 'stopped' }), makeVehicle({ id: 'v2', status: 'offline' })]);

    useVehicleStore.getState().updateVehicle(makeVehicle({ id: 'v1', status: 'moving' }));

    expect(useVehicleStore.getState().getVehicle('v2')?.status).toBe('offline');
  });
});

// ── deleteVehicle ─────────────────────────────────────────────────────────────

describe('deleteVehicle', () => {
  it('supprime le véhicule du store', () => {
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v1' }), makeVehicle({ id: 'v2' })]);

    useVehicleStore.getState().deleteVehicle('v1');

    expect(useVehicleStore.getState().getVehicle('v1')).toBeUndefined();
    expect(useVehicleStore.getState().getVehicleList()).toHaveLength(1);
  });

  it("ne produit pas d'erreur si l'ID est inconnu", () => {
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v1' })]);
    expect(() => useVehicleStore.getState().deleteVehicle('inexistant')).not.toThrow();
    expect(useVehicleStore.getState().getVehicleList()).toHaveLength(1);
  });
});

// ── getVehicle ────────────────────────────────────────────────────────────────

describe('getVehicle', () => {
  it("retourne le véhicule correspondant à l'ID", () => {
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v1', name: 'Test' })]);
    expect(useVehicleStore.getState().getVehicle('v1')?.name).toBe('Test');
  });

  it('retourne undefined pour un ID inconnu', () => {
    expect(useVehicleStore.getState().getVehicle('zzz')).toBeUndefined();
  });
});

// ── getVehicleList ────────────────────────────────────────────────────────────

describe('getVehicleList', () => {
  it('retourne un tableau vide sur store vide', () => {
    expect(useVehicleStore.getState().getVehicleList()).toEqual([]);
  });

  it("retourne tous les véhicules dans l'ordre d'insertion", () => {
    const vehicles = ['v1', 'v2', 'v3'].map((id) => makeVehicle({ id }));
    useVehicleStore.getState().setAllVehicles(vehicles);

    const list = useVehicleStore.getState().getVehicleList();
    expect(list.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('reflète immédiatement les mises à jour WS', () => {
    useVehicleStore.getState().setAllVehicles([makeVehicle({ id: 'v1', status: 'stopped' })]);
    useVehicleStore.getState().updateVehicle(makeVehicle({ id: 'v1', status: 'moving' }));

    const list = useVehicleStore.getState().getVehicleList();
    expect(list[0].status).toBe('moving');
  });
});
