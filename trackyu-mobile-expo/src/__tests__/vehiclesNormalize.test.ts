/**
 * @jest-environment node
 *
 * Tests unitaires — normalizeVehicleWS + STATUS_MAP
 * Vérifie que tous les formats d'entrée (REST, WebSocket flat, SQL flat)
 * produisent un Vehicle normalisé correct.
 */

(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

// Mock apiClient pour éviter le chargement des modules natifs (keychain, expo-constants)
jest.mock('../api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import { normalizeVehicleWS, STATUS_MAP } from '../api/vehicles';

// ── STATUS_MAP ─────────────────────────────────────────────────────────────────

describe('STATUS_MAP', () => {
  it('normalise les statuts majuscules (format WebSocket)', () => {
    expect(STATUS_MAP['MOVING']).toBe('moving');
    expect(STATUS_MAP['STOPPED']).toBe('stopped');
    expect(STATUS_MAP['IDLE']).toBe('idle');
    expect(STATUS_MAP['OFFLINE']).toBe('offline');
  });

  it('passe en minuscules inchangés', () => {
    expect(STATUS_MAP['moving']).toBe('moving');
    expect(STATUS_MAP['stopped']).toBe('stopped');
    expect(STATUS_MAP['idle']).toBe('idle');
    expect(STATUS_MAP['offline']).toBe('offline');
  });

  it('mappe EXCESSIVE_IDLING → idle', () => {
    expect(STATUS_MAP['EXCESSIVE_IDLING']).toBe('idle');
  });

  it('retourne undefined pour un statut inconnu', () => {
    expect(STATUS_MAP['UNKNOWN']).toBeUndefined();
    expect(STATUS_MAP['']).toBeUndefined();
  });
});

// ── normalizeVehicleWS — formats d'entrée ─────────────────────────────────────

describe('normalizeVehicleWS — statuts', () => {
  const base = { id: 'v1', name: 'Test', plate: 'AB123' };

  it('normalise le statut MOVING (majuscule WS) → moving', () => {
    const v = normalizeVehicleWS({ ...base, status: 'MOVING' });
    expect(v.status).toBe('moving');
  });

  it('normalise le statut STOPPED (majuscule WS) → stopped', () => {
    const v = normalizeVehicleWS({ ...base, status: 'STOPPED' });
    expect(v.status).toBe('stopped');
  });

  it('normalise le statut IDLE → idle', () => {
    const v = normalizeVehicleWS({ ...base, status: 'IDLE' });
    expect(v.status).toBe('idle');
  });

  it('normalise le statut OFFLINE → offline', () => {
    const v = normalizeVehicleWS({ ...base, status: 'OFFLINE' });
    expect(v.status).toBe('offline');
  });

  it('statut inconnu → offline par défaut', () => {
    const v = normalizeVehicleWS({ ...base, status: 'BROKEN' });
    expect(v.status).toBe('offline');
  });

  it('statut absent → offline par défaut', () => {
    const v = normalizeVehicleWS({ ...base });
    expect(v.status).toBe('offline');
  });
});

describe('normalizeVehicleWS — coordonnées GPS', () => {
  const base = { id: 'v1', name: 'Test', plate: 'AB123', status: 'MOVING' };

  it('format REST : location.lat / location.lng', () => {
    const v = normalizeVehicleWS({ ...base, location: { lat: 5.36, lng: -4.01 } });
    expect(v.latitude).toBe(5.36);
    expect(v.longitude).toBe(-4.01);
  });

  it('format SQL flat : location_lat / location_lng', () => {
    const v = normalizeVehicleWS({ ...base, location_lat: 5.36, location_lng: -4.01 });
    expect(v.latitude).toBe(5.36);
    expect(v.longitude).toBe(-4.01);
  });

  it('format WebSocket flat : latitude / longitude', () => {
    const v = normalizeVehicleWS({ ...base, latitude: 5.36, longitude: -4.01 });
    expect(v.latitude).toBe(5.36);
    expect(v.longitude).toBe(-4.01);
  });

  it('format alternatif : lat / lng à plat', () => {
    const v = normalizeVehicleWS({ ...base, lat: 5.36, lng: -4.01 });
    expect(v.latitude).toBe(5.36);
    expect(v.longitude).toBe(-4.01);
  });

  it('format legacy : last_lat / last_lng', () => {
    const v = normalizeVehicleWS({ ...base, last_lat: 5.36, last_lng: -4.01 });
    expect(v.latitude).toBe(5.36);
    expect(v.longitude).toBe(-4.01);
  });

  it('aucune coordonnée → 0, 0 (Golfe de Guinée)', () => {
    const v = normalizeVehicleWS({ ...base });
    expect(v.latitude).toBe(0);
    expect(v.longitude).toBe(0);
  });

  it('priorité : location.lat > location_lat > last_lat > lat > latitude', () => {
    // location.lat a la priorité la plus haute
    const v = normalizeVehicleWS({
      ...base,
      location: { lat: 10, lng: 20 },
      location_lat: 99,
      latitude: 88,
    });
    expect(v.latitude).toBe(10);
    expect(v.longitude).toBe(20);
  });
});

describe('normalizeVehicleWS — champs véhicule', () => {
  const base = { id: 'v1', name: 'Camion ACME', plate: 'TRK-001', status: 'STOPPED' };

  it('mappe vehicle_type / vehicleType / type → type', () => {
    expect(normalizeVehicleWS({ ...base, vehicle_type: 'truck' }).type).toBe('truck');
    expect(normalizeVehicleWS({ ...base, vehicleType: 'bus' }).type).toBe('bus');
    expect(normalizeVehicleWS({ ...base, type: 'car' }).type).toBe('car');
  });

  it('mappe driver_name / driverName → driverName', () => {
    expect(normalizeVehicleWS({ ...base, driver_name: 'Jean' }).driverName).toBe('Jean');
    expect(normalizeVehicleWS({ ...base, driverName: 'Paul' }).driverName).toBe('Paul');
  });

  it('mappe client_name / clientName → clientName', () => {
    expect(normalizeVehicleWS({ ...base, client_name: 'ACME SA' }).clientName).toBe('ACME SA');
    expect(normalizeVehicleWS({ ...base, clientName: 'BETA' }).clientName).toBe('BETA');
  });

  it('mappe group_name / groupName → groupName', () => {
    expect(normalizeVehicleWS({ ...base, group_name: 'Nord' }).groupName).toBe('Nord');
    expect(normalizeVehicleWS({ ...base, groupName: 'Sud' }).groupName).toBe('Sud');
  });

  it('mappe fuel_level / fuelLevel → fuelLevel', () => {
    expect(normalizeVehicleWS({ ...base, fuel_level: 75 }).fuelLevel).toBe(75);
    expect(normalizeVehicleWS({ ...base, fuelLevel: 50 }).fuelLevel).toBe(50);
  });

  it('mappe is_immobilized / isImmobilized → isImmobilized', () => {
    expect(normalizeVehicleWS({ ...base, is_immobilized: true }).isImmobilized).toBe(true);
    expect(normalizeVehicleWS({ ...base, isImmobilized: false }).isImmobilized).toBe(false);
  });

  it('mappe last_updated / lastUpdated / lastUpdate → lastUpdate', () => {
    const ts = '2026-04-16T10:00:00.000Z';
    expect(normalizeVehicleWS({ ...base, last_updated: ts }).lastUpdate).toBe(ts);
    expect(normalizeVehicleWS({ ...base, lastUpdated: ts }).lastUpdate).toBe(ts);
    expect(normalizeVehicleWS({ ...base, lastUpdate: ts }).lastUpdate).toBe(ts);
  });

  it('name absent → "–"', () => {
    const v = normalizeVehicleWS({ id: 'v1', plate: 'X' });
    expect(v.name).toBe('–');
  });

  it('plate absent → "–"', () => {
    const v = normalizeVehicleWS({ id: 'v1', name: 'Test' });
    expect(v.plate).toBe('–');
  });

  it('speed absent → 0', () => {
    expect(normalizeVehicleWS({ ...base }).speed).toBe(0);
  });

  it('heading absent → 0', () => {
    expect(normalizeVehicleWS({ ...base }).heading).toBe(0);
  });
});

// ── Scénarios complets (format réel simulé) ────────────────────────────────────

describe('normalizeVehicleWS — scénarios réels', () => {
  it('véhicule REST complet', () => {
    const raw = {
      id: 'abc-123',
      name: 'Camion Nord 01',
      plate: 'CI-123-AB',
      vehicle_type: 'TRUCK',
      status: 'MOVING',
      location: { lat: 5.3599, lng: -4.0083 },
      speed: 72,
      heading: 90,
      last_updated: '2026-04-16T08:30:00.000Z',
      fuel_level: 63,
      battery_voltage: 12.8,
      mileage: 45230,
      driver_name: 'Kouadio Jean',
      client_name: 'ACME Logistics',
      group_name: 'Branche Nord',
      imei: '86287000000001',
    };
    const v = normalizeVehicleWS(raw);
    expect(v.id).toBe('abc-123');
    expect(v.name).toBe('Camion Nord 01');
    expect(v.plate).toBe('CI-123-AB');
    expect(v.type).toBe('TRUCK');
    expect(v.status).toBe('moving');
    expect(v.latitude).toBe(5.3599);
    expect(v.longitude).toBe(-4.0083);
    expect(v.speed).toBe(72);
    expect(v.fuelLevel).toBe(63);
    expect(v.driverName).toBe('Kouadio Jean');
    expect(v.clientName).toBe('ACME Logistics');
    expect(v.groupName).toBe('Branche Nord');
    expect(v.imei).toBe('86287000000001');
  });

  it('véhicule WebSocket flat — mise à jour position', () => {
    const wsUpdate = {
      id: 'abc-123',
      name: 'Camion Nord 01',
      plate: 'CI-123-AB',
      status: 'STOPPED',
      latitude: 5.4102,
      longitude: -3.9985,
      speed: 0,
      lastUpdated: '2026-04-16T09:15:00.000Z',
    };
    const v = normalizeVehicleWS(wsUpdate);
    expect(v.status).toBe('stopped');
    expect(v.latitude).toBe(5.4102);
    expect(v.longitude).toBe(-3.9985);
    expect(v.speed).toBe(0);
  });

  it('véhicule offline sans GPS → coordonnées 0,0', () => {
    const raw = {
      id: 'xyz-999',
      name: 'Véhicule Hors Ligne',
      plate: 'CI-OFF-00',
      status: 'OFFLINE',
    };
    const v = normalizeVehicleWS(raw);
    expect(v.status).toBe('offline');
    expect(v.latitude).toBe(0);
    expect(v.longitude).toBe(0);
  });
});
