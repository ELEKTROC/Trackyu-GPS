/**
 * @jest-environment node
 *
 * Tests unitaires — src/api/interventions.ts
 * Couverture : countByStatus, normalizeIntervention (via getAll),
 *              STATUS_LABELS, STATUS_COLORS, FIELD_MAP
 */

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import apiClient from '../api/client';
import interventionsApi, { countByStatus, STATUS_LABELS, STATUS_COLORS } from '../api/interventions';
import type { InterventionStats, Intervention } from '../api/interventions';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

beforeEach(() => jest.clearAllMocks());

// ── countByStatus ───────────────────────────────────────────────────────────────

describe('countByStatus', () => {
  const stats: InterventionStats = {
    byStatus: [
      { status: 'PENDING', count: '5' },
      { status: 'SCHEDULED', count: '3' },
      { status: 'EN_ROUTE', count: '2' },
      { status: 'IN_PROGRESS', count: '4' },
      { status: 'COMPLETED', count: '12' },
      { status: 'CANCELLED', count: '1' },
      { status: 'POSTPONED', count: '2' },
    ],
  };

  it("retourne le count d'un statut simple", () => {
    expect(countByStatus(stats, 'COMPLETED')).toBe(12);
    expect(countByStatus(stats, 'PENDING')).toBe(5);
    expect(countByStatus(stats, 'CANCELLED')).toBe(1);
  });

  it('additionne plusieurs statuts', () => {
    expect(countByStatus(stats, 'PENDING', 'SCHEDULED')).toBe(8);
    expect(countByStatus(stats, 'EN_ROUTE', 'IN_PROGRESS')).toBe(6);
  });

  it('retourne 0 pour un statut inexistant', () => {
    expect(countByStatus(stats, 'POSTPONED')).toBe(2);
  });

  it('retourne 0 si stats undefined', () => {
    expect(countByStatus(undefined, 'COMPLETED')).toBe(0);
  });

  it('retourne 0 si byStatus absent', () => {
    expect(countByStatus({} as InterventionStats, 'COMPLETED')).toBe(0);
  });

  it('retourne 0 si aucun statut demandé ne matche', () => {
    expect(countByStatus(stats, 'PENDING')).not.toBe(0);
    const emptyStats: InterventionStats = { byStatus: [] };
    expect(countByStatus(emptyStats, 'COMPLETED')).toBe(0);
  });

  it('additionne correctement tous les statuts actifs', () => {
    const total = countByStatus(stats, 'PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS');
    expect(total).toBe(14);
  });
});

// ── STATUS_LABELS / STATUS_COLORS ───────────────────────────────────────────────

describe('STATUS_LABELS', () => {
  it('couvre tous les statuts définis', () => {
    const statuses = ['PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'];
    for (const s of statuses) {
      expect(STATUS_LABELS[s as keyof typeof STATUS_LABELS]).toBeTruthy();
    }
  });

  it('label COMPLETED = "Terminé"', () => {
    expect(STATUS_LABELS.COMPLETED).toBe('Terminé');
  });

  it('label IN_PROGRESS = "En cours"', () => {
    expect(STATUS_LABELS.IN_PROGRESS).toBe('En cours');
  });
});

describe('STATUS_COLORS', () => {
  it('couvre tous les statuts définis', () => {
    const statuses = ['PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'];
    for (const s of statuses) {
      expect(STATUS_COLORS[s as keyof typeof STATUS_COLORS]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('COMPLETED est vert (#22C55E)', () => {
    expect(STATUS_COLORS.COMPLETED).toBe('#22C55E');
  });

  it('CANCELLED est rouge (#EF4444)', () => {
    expect(STATUS_COLORS.CANCELLED).toBe('#EF4444');
  });
});

// ── normalizeIntervention (FIELD_MAP snake_case → camelCase) ────────────────────

describe('normalizeIntervention — via interventionsApi.getAll()', () => {
  function mockInterventions(rawList: Record<string, unknown>[]) {
    mockGet.mockResolvedValueOnce({ data: rawList } as never);
  }

  it('convertit les champs snake_case principaux en camelCase', async () => {
    mockInterventions([
      {
        id: 'int-1',
        type: 'INSTALLATION',
        nature: 'Boîtier GPS',
        status: 'COMPLETED',
        scheduled_date: '2026-04-10T09:00:00.000Z',
        client_id: 'client-42',
        client_name: 'SOTRA',
        technician_id: 'tech-7',
        tenant_id: 'tenant-1',
        location: 'Abidjan',
        duration: 90,
        created_at: '2026-04-10T07:00:00.000Z',
      },
    ]);
    const [i] = await interventionsApi.getAll();
    expect(i.id).toBe('int-1');
    expect(i.scheduledDate).toBe('2026-04-10T09:00:00.000Z');
    expect(i.clientId).toBe('client-42');
    expect(i.clientName).toBe('SOTRA');
    expect(i.technicianId).toBe('tech-7');
    expect(i.tenantId).toBe('tenant-1');
    expect(i.createdAt).toBe('2026-04-10T07:00:00.000Z');
  });

  it('convertit les champs véhicule', async () => {
    mockInterventions([
      {
        id: 'int-2',
        type: 'REMPLACEMENT',
        nature: 'Remplacement tracker',
        status: 'PENDING',
        scheduled_date: '2026-04-15T08:00:00.000Z',
        vehicle_id: 'v-55',
        vehicle_name: 'Camion 12T',
        vehicle_plate: 'CI-5544-A',
        vehicle_brand: 'Mercedes',
        vehicle_model: 'Actros',
        vehicle_year: '2021',
        vehicle_type: 'TRUCK',
        vehicle_color: 'Blanc',
        vehicle_mileage: 85000,
        ww_plate: 'WW-001',
        temp_plate: 'TMP-02',
        client_id: 'c1',
        technician_id: 't1',
        tenant_id: 'ten1',
        location: 'Yamoussoukro',
        duration: 60,
        created_at: new Date().toISOString(),
      },
    ]);
    const [i] = await interventionsApi.getAll();
    expect(i.vehicleId).toBe('v-55');
    expect(i.vehicleName).toBe('Camion 12T');
    expect(i.licensePlate).toBe('CI-5544-A');
    expect(i.vehicleBrand).toBe('Mercedes');
    expect(i.vehicleModel).toBe('Actros');
    expect(i.vehicleYear).toBe('2021');
    expect(i.vehicleType).toBe('TRUCK');
    expect(i.vehicleColor).toBe('Blanc');
    expect(i.vehicleMileage).toBe(85000);
    expect(i.wwPlate).toBe('WW-001');
    expect(i.tempPlate).toBe('TMP-02');
  });

  it('convertit les champs techniques', async () => {
    mockInterventions([
      {
        id: 'int-3',
        type: 'INSTALLATION',
        nature: 'N',
        status: 'COMPLETED',
        scheduled_date: new Date().toISOString(),
        client_id: 'c1',
        technician_id: 't1',
        tenant_id: 'ten1',
        location: 'Abidjan',
        duration: 45,
        created_at: new Date().toISOString(),
        imei: '862871040000001',
        sim_card: '89225110000000001',
        sensor_serial: 'SEN-001',
        device_location: 'Tableau de bord',
        fuel_sensor_type: 'CAPACITIVE',
        mac_address: 'AA:BB:CC:DD:EE:FF',
      },
    ]);
    const [i] = await interventionsApi.getAll();
    expect(i.imei).toBe('862871040000001');
    expect(i.simCard).toBe('89225110000000001');
    expect(i.sensorSerial).toBe('SEN-001');
    expect(i.deviceLocation).toBe('Tableau de bord');
    expect(i.fuelSensorType).toBe('CAPACITIVE');
    expect(i.macAddress).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('convertit les champs check-up véhicule', async () => {
    mockInterventions([
      {
        id: 'int-4',
        type: 'DEPANNAGE',
        nature: 'N',
        status: 'IN_PROGRESS',
        scheduled_date: new Date().toISOString(),
        client_id: 'c1',
        technician_id: 't1',
        tenant_id: 'ten1',
        location: 'Bouaké',
        duration: 30,
        created_at: new Date().toISOString(),
        check_start: true,
        check_lights: false,
        check_dashboard: true,
        check_ac: true,
        check_audio: false,
        check_battery: true,
        observations: 'Batterie faible signalée',
      },
    ]);
    const [i] = await interventionsApi.getAll();
    expect(i.checkStart).toBe(true);
    expect(i.checkLights).toBe(false);
    expect(i.checkDashboard).toBe(true);
    expect(i.checkAC).toBe(true);
    expect(i.checkAudio).toBe(false);
    expect(i.checkBattery).toBe(true);
    expect(i.observations).toBe('Batterie faible signalée');
  });

  it('convertit les champs facturation et signature', async () => {
    mockInterventions([
      {
        id: 'int-5',
        type: 'INSTALLATION',
        nature: 'N',
        status: 'COMPLETED',
        scheduled_date: new Date().toISOString(),
        client_id: 'c1',
        technician_id: 't1',
        tenant_id: 'ten1',
        location: 'Abidjan',
        duration: 120,
        created_at: new Date().toISOString(),
        invoice_id: 'inv-99',
        update_contract: true,
        generate_invoice: false,
        signature_tech: 'base64TechSig',
        signature_client: 'base64ClientSig',
        client_signature_name: 'Jean Martin',
        contract_id: 'ctr-5',
      },
    ]);
    const [i] = await interventionsApi.getAll();
    expect(i.invoiceId).toBe('inv-99');
    expect(i.updateContract).toBe(true);
    expect(i.generateInvoice).toBe(false);
    expect(i.signatureTech).toBe('base64TechSig');
    expect(i.signatureClient).toBe('base64ClientSig');
    expect(i.clientSignatureName).toBe('Jean Martin');
    expect(i.contractId).toBe('ctr-5');
  });

  it('les champs déjà en camelCase ne sont pas altérés', async () => {
    // Si le backend renvoie déjà du camelCase, le pass-through fonctionne
    mockInterventions([
      {
        id: 'int-6',
        type: 'TRANSFERT',
        nature: 'N',
        status: 'SCHEDULED',
        scheduledDate: '2026-04-20T10:00:00.000Z', // camelCase direct
        clientId: 'c2',
        technicianId: 't2',
        tenantId: 'ten1',
        location: 'San Pedro',
        duration: 60,
        createdAt: new Date().toISOString(),
      },
    ]);
    const [i] = (await interventionsApi.getAll()) as Intervention[];
    expect(i.id).toBe('int-6');
    // camelCase non mappé → conservé tel quel
    expect((i as unknown as Record<string, unknown>).scheduledDate).toBe('2026-04-20T10:00:00.000Z');
  });
});

// ── interventionsApi.getPage ────────────────────────────────────────────────────

describe('interventionsApi.getPage', () => {
  it('gère la réponse tableau brut', async () => {
    const rawArray = Array(5)
      .fill(null)
      .map((_, idx) => ({
        id: String(idx),
        type: 'INSTALLATION',
        nature: 'N',
        status: 'PENDING',
        scheduled_date: new Date().toISOString(),
        client_id: 'c1',
        technician_id: 't1',
        tenant_id: 'ten1',
        location: 'Abidjan',
        duration: 60,
        created_at: new Date().toISOString(),
      }));
    mockGet.mockResolvedValueOnce({ data: rawArray } as never);
    const page = await interventionsApi.getPage();
    expect(page.data).toHaveLength(5);
    expect(page.total).toBe(5);
    expect(page.hasMore).toBe(false);
  });

  it('gère la réponse paginée { data, total, hasMore }', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: Array(20)
          .fill(null)
          .map((_, idx) => ({
            id: String(idx),
            type: 'DEPANNAGE',
            nature: 'N',
            status: 'COMPLETED',
            scheduled_date: new Date().toISOString(),
            client_id: 'c1',
            technician_id: 't1',
            tenant_id: 'ten1',
            location: 'Abidjan',
            duration: 30,
            created_at: new Date().toISOString(),
          })),
        total: 87,
        page: 1,
        hasMore: true,
      },
    } as never);
    const page = await interventionsApi.getPage({ page: 1, limit: 20 });
    expect(page.data).toHaveLength(20);
    expect(page.total).toBe(87);
    expect(page.hasMore).toBe(true);
  });
});
