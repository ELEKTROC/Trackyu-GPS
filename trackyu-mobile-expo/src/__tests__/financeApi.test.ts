/**
 * @jest-environment node
 *
 * Tests unitaires de financeApi (invoicesApi, quotesApi, contractsApi, paymentsApi).
 *
 * Vérifie :
 *  - invoicesApi  : getAll (formats backend), getById
 *  - quotesApi    : getAll, getById, convertToInvoice
 *  - contractsApi : getAll, getById, renew
 *  - paymentsApi  : getAll
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
import { invoicesApi, quotesApi, contractsApi, paymentsApi } from '../api/financeApi';
import type { Invoice, Quote, Contract, Payment } from '../api/financeApi';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const INVOICE: Invoice = {
  id: 'inv-001',
  number: 'FAC-2026-001',
  clientId: 'c-001',
  clientName: 'TOTAL CI',
  date: '2026-04-01',
  dueDate: '2026-04-30',
  amount: 1_180_000,
  amountHT: 1_000_000,
  status: 'SENT',
  vatRate: 18,
  items: [{ description: 'Abonnement GPS x5', quantity: 5, price: 200_000 }],
};

const QUOTE: Quote = {
  id: 'q-001',
  number: 'DEV-2026-001',
  clientName: 'ORANGE CI',
  amount: 590_000,
  amountHT: 500_000,
  status: 'SENT',
  vatRate: 18,
  items: [{ description: 'Boîtier GT06', quantity: 2, price: 150_000 }],
  createdAt: '2026-04-01T08:00:00.000Z',
};

const CONTRACT: Contract = {
  id: 'ctr-001',
  contractNumber: 'CTR-2026-001',
  clientId: 'c-001',
  clientName: 'TOTAL CI',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'ACTIVE',
  monthlyFee: 200_000,
  vehicleCount: 5,
  billingCycle: 'MONTHLY',
  autoRenew: true,
};

const PAYMENT: Payment = {
  id: 'pay-001',
  date: '2026-04-05',
  clientName: 'TOTAL CI',
  amount: 1_180_000,
  method: 'VIREMENT',
  reference: 'VIR-20260405',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// invoicesApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('invoicesApi.getAll', () => {
  it('envoie un GET vers /finance/invoices avec limit=200', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await invoicesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/finance/invoices', { params: { limit: 200 } });
  });

  it('retourne data.data si le backend retourne la forme paginée { data, total }', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [INVOICE], total: 1, page: 1, limit: 200 } });
    const result = await invoicesApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe('FAC-2026-001');
  });

  it('retourne le tableau nu si le backend retourne un tableau direct', async () => {
    mockGet.mockResolvedValueOnce({ data: [INVOICE] });
    const result = await invoicesApi.getAll();
    expect(result).toHaveLength(1);
  });

  it('retourne [] si le backend retourne un objet non-tableau et non-paginé', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await invoicesApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(invoicesApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(invoicesApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(invoicesApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// invoicesApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('invoicesApi.getById', () => {
  it('envoie un GET vers /finance/invoices/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: INVOICE });
    await invoicesApi.getById('inv-001');
    expect(mockGet).toHaveBeenCalledWith('/finance/invoices/inv-001');
  });

  it('retourne la facture', async () => {
    mockGet.mockResolvedValueOnce({ data: INVOICE });
    const result = await invoicesApi.getById('inv-001');
    expect(result.id).toBe('inv-001');
    expect(result.status).toBe('SENT');
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(invoicesApi.getById('id-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// quotesApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('quotesApi.getAll', () => {
  it('envoie un GET vers /finance/quotes', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await quotesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/finance/quotes', { params: { limit: 100 } });
  });

  it('retourne la liste des devis', async () => {
    mockGet.mockResolvedValueOnce({ data: [QUOTE] });
    const result = await quotesApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe('DEV-2026-001');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await quotesApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(quotesApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// quotesApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('quotesApi.getById', () => {
  it('envoie un GET vers /finance/quotes/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: QUOTE });
    await quotesApi.getById('q-001');
    expect(mockGet).toHaveBeenCalledWith('/finance/quotes/q-001');
  });

  it('retourne le devis', async () => {
    mockGet.mockResolvedValueOnce({ data: QUOTE });
    const result = await quotesApi.getById('q-001');
    expect(result.status).toBe('SENT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// quotesApi.convertToInvoice
// ═══════════════════════════════════════════════════════════════════════════════

describe('quotesApi.convertToInvoice', () => {
  it('envoie un POST vers /finance/quotes/:id/convert', async () => {
    mockPost.mockResolvedValueOnce({ data: INVOICE });
    await quotesApi.convertToInvoice('q-001');
    expect(mockPost).toHaveBeenCalledWith('/finance/quotes/q-001/convert');
  });

  it('retourne la facture créée', async () => {
    mockPost.mockResolvedValueOnce({ data: INVOICE });
    const result = await quotesApi.convertToInvoice('q-001');
    expect(result.id).toBe('inv-001');
  });

  it("propage une erreur 404 si le devis n'existe pas", async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(quotesApi.convertToInvoice('q-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur 500', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(quotesApi.convertToInvoice('q-001')).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// contractsApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('contractsApi.getAll', () => {
  it('envoie un GET vers /contracts', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await contractsApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/contracts', { params: { limit: 100 } });
  });

  it('retourne la liste des contrats', async () => {
    mockGet.mockResolvedValueOnce({ data: [CONTRACT] });
    const result = await contractsApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ACTIVE');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await contractsApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(contractsApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// contractsApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('contractsApi.getById', () => {
  it('envoie un GET vers /contracts/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: CONTRACT });
    await contractsApi.getById('ctr-001');
    expect(mockGet).toHaveBeenCalledWith('/contracts/ctr-001');
  });

  it('propage une erreur 404', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404, data: {} } });
    await expect(contractsApi.getById('id-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// contractsApi.renew
// ═══════════════════════════════════════════════════════════════════════════════

describe('contractsApi.renew', () => {
  it('envoie un POST vers /contracts/:id/renew', async () => {
    mockPost.mockResolvedValueOnce({ data: CONTRACT });
    await contractsApi.renew('ctr-001');
    expect(mockPost).toHaveBeenCalledWith('/contracts/ctr-001/renew');
  });

  it('retourne le contrat renouvelé', async () => {
    const renewed = { ...CONTRACT, startDate: '2027-01-01', endDate: '2027-12-31' };
    mockPost.mockResolvedValueOnce({ data: renewed });
    const result = await contractsApi.renew('ctr-001');
    expect(result.startDate).toBe('2027-01-01');
  });

  it('propage une erreur réseau', async () => {
    mockPost.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(contractsApi.renew('ctr-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// paymentsApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('paymentsApi.getAll', () => {
  it('envoie un GET vers /finance/payments', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await paymentsApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/finance/payments', { params: { limit: 100 } });
  });

  it('retourne la liste des paiements', async () => {
    mockGet.mockResolvedValueOnce({ data: [PAYMENT] });
    const result = await paymentsApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].reference).toBe('VIR-20260405');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await paymentsApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(paymentsApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
