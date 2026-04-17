/**
 * @jest-environment node
 *
 * Tests unitaires de crmApi.
 *
 * Vérifie :
 *  - getLeads : GET /crm/leads, normalisation tableau vide, propagation erreurs
 */

(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

// ── Mock apiClient ─────────────────────────────────────────────────────────────

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

// ── Imports ────────────────────────────────────────────────────────────────────

import apiClient from '../api/client';
import crmApi from '../api/crmApi';
import type { Lead } from '../api/crmApi';

const mockGet = apiClient.get as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const LEAD: Lead = {
  id: 'lead-001',
  tenant_id: 'tenant-01',
  company_name: 'ORANGE CI',
  contact_name: 'Mamadou Diallo',
  email: 'mdiallo@orange-ci.com',
  phone: '+22507000001',
  status: 'QUALIFIED',
  potential_value: 5_000_000,
  score: 85,
  source: 'WEBSITE',
  sector: 'Télécoms',
  assigned_to: 'commercial-01',
  qualification: 'Chaud',
  notes: null,
  created_at: '2026-04-01T08:00:00.000Z',
  updated_at: '2026-04-08T10:00:00.000Z',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// crmApi.getLeads
// ═══════════════════════════════════════════════════════════════════════════════

describe('crmApi.getLeads', () => {
  it('envoie un GET vers /crm/leads', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await crmApi.getLeads();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/crm/leads');
  });

  it('retourne la liste des leads', async () => {
    mockGet.mockResolvedValueOnce({ data: [LEAD] });
    const result = await crmApi.getLeads();
    expect(result).toHaveLength(1);
    expect(result[0].company_name).toBe('ORANGE CI');
    expect(result[0].status).toBe('QUALIFIED');
    expect(result[0].potential_value).toBe(5_000_000);
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await crmApi.getLeads();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await crmApi.getLeads();
    expect(result).toEqual([]);
  });

  it('retourne la liste complète avec plusieurs leads', async () => {
    const leads: Lead[] = [
      LEAD,
      { ...LEAD, id: 'lead-002', status: 'WON', company_name: 'MTN CI' },
      { ...LEAD, id: 'lead-003', status: 'LOST', company_name: 'MOOV CI' },
    ];
    mockGet.mockResolvedValueOnce({ data: leads });
    const result = await crmApi.getLeads();
    expect(result).toHaveLength(3);
    expect(result.map((l) => l.status)).toEqual(['QUALIFIED', 'WON', 'LOST']);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(crmApi.getLeads()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: { message: 'Unauthorized' } } });
    await expect(crmApi.getLeads()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Forbidden' } } });
    await expect(crmApi.getLeads()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Internal Server Error' } },
    });
    await expect(crmApi.getLeads()).rejects.toMatchObject({ code: 'SERVER' });
  });
});
