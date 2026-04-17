/**
 * @jest-environment node
 *
 * Tests unitaires de ticketsApi.
 *
 * Vérifie :
 *  - getAll      : paramètres, normalisation (tableau nu vs paginé)
 *  - getById     : chemin + retour
 *  - update      : PUT avec champs partiels
 *  - addMessage  : POST vers /tickets/:id/messages
 *  - getCategories / getSubCategories
 *  - create      : POST vers /tickets
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
import ticketsApi from '../api/tickets';
import type { Ticket, TicketsPage, TicketMessage, TicketCategory, TicketSubCategory } from '../api/tickets';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TICKET: Ticket = {
  id: 'tick-001',
  subject: 'Balise hors ligne depuis 48h',
  description: 'La balise de CI-001-AB ne répond plus',
  status: 'OPEN',
  priority: 'HIGH',
  category: 'Technique',
  sub_category: 'Signal GPS',
  assigned_to: null,
  assigned_user_name: null,
  client_id: 'c-001',
  client_name: 'TOTAL CI',
  reseller_name: null,
  vehicle_id: 'v-001',
  source: 'CLIENT',
  created_at: '2026-04-08T10:00:00.000Z',
  updated_at: '2026-04-08T10:00:00.000Z',
  created_by_name: 'Kouassi Konan',
};

const MSG: TicketMessage = {
  id: 'msg-001',
  sender: 'Support',
  text: 'Ticket pris en charge.',
  date: '2026-04-08T10:05:00.000Z',
  isInternal: false,
};

const CAT: TicketCategory = { id: 1, name: 'Technique', icon: 'wrench' };
const SUB: TicketSubCategory = { id: 11, category_id: 1, name: 'Signal GPS' };

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.getAll', () => {
  it('envoie un GET vers /tickets avec les paramètres par défaut (page:1, limit:50)', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 } });
    await ticketsApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/tickets', { params: { page: 1, limit: 50 } });
  });

  it('fusionne les paramètres fournis', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await ticketsApi.getAll({ status: 'OPEN', priority: 'HIGH', page: 2, limit: 20 });
    expect(mockGet).toHaveBeenCalledWith('/tickets', {
      params: { page: 2, limit: 20, status: 'OPEN', priority: 'HIGH' },
    });
  });

  it('normalise le format paginé { data, total, page, limit, totalPages }', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [TICKET], total: 42, page: 1, limit: 50, totalPages: 1 },
    });
    const result: TicketsPage = await ticketsApi.getAll();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(42);
    expect(result.data[0].subject).toBe('Balise hors ligne depuis 48h');
  });

  it('normalise le format tableau nu (fallback)', async () => {
    mockGet.mockResolvedValueOnce({ data: [TICKET] });
    const result = await ticketsApi.getAll();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('retourne une page vide si data est null ou vide', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: null, total: 0, page: 1, limit: 50, totalPages: 0 } });
    const result = await ticketsApi.getAll();
    expect(result.data).toEqual([]);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ticketsApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(ticketsApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.getById', () => {
  it('envoie un GET vers /tickets/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: TICKET });
    await ticketsApi.getById('tick-001');
    expect(mockGet).toHaveBeenCalledWith('/tickets/tick-001');
  });

  it('retourne le ticket avec ses messages si présents', async () => {
    const withMsg = { ...TICKET, messages: [MSG] };
    mockGet.mockResolvedValueOnce({ data: withMsg });
    const result = await ticketsApi.getById('tick-001');
    expect(result.id).toBe('tick-001');
    expect(result.messages).toHaveLength(1);
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(ticketsApi.getById('id-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(ticketsApi.getById('tick-001')).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.update
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.update', () => {
  it('envoie un PUT vers /tickets/:id avec les champs partiels', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...TICKET, status: 'IN_PROGRESS' } });
    await ticketsApi.update('tick-001', { status: 'IN_PROGRESS', assigned_to: 'tech-01' });
    expect(mockPut).toHaveBeenCalledWith('/tickets/tick-001', {
      status: 'IN_PROGRESS',
      assigned_to: 'tech-01',
    });
  });

  it('retourne le ticket mis à jour', async () => {
    const updated = { ...TICKET, status: 'RESOLVED' as const };
    mockPut.mockResolvedValueOnce({ data: updated });
    const result = await ticketsApi.update('tick-001', { status: 'RESOLVED' });
    expect(result.status).toBe('RESOLVED');
  });

  it('propage une erreur réseau', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ticketsApi.update('tick-001', { status: 'CLOSED' })).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.addMessage
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.addMessage', () => {
  it('envoie un POST vers /tickets/:id/messages avec sender, text, is_internal', async () => {
    mockPost.mockResolvedValueOnce({ data: MSG });
    await ticketsApi.addMessage('tick-001', 'Ticket pris en charge.', 'Support', false);
    expect(mockPost).toHaveBeenCalledWith('/tickets/tick-001/messages', {
      sender: 'Support',
      text: 'Ticket pris en charge.',
      is_internal: false,
    });
  });

  it('retourne le message créé', async () => {
    mockPost.mockResolvedValueOnce({ data: MSG });
    const result = await ticketsApi.addMessage('tick-001', 'Ticket pris en charge.', 'Support');
    expect(result.id).toBe('msg-001');
    expect(result.isInternal).toBe(false);
  });

  it('is_internal vaut false par défaut', async () => {
    mockPost.mockResolvedValueOnce({ data: MSG });
    await ticketsApi.addMessage('tick-001', 'Message', 'Sender');
    expect(mockPost).toHaveBeenCalledWith(
      '/tickets/tick-001/messages',
      expect.objectContaining({ is_internal: false })
    );
  });

  it('propage une erreur 401', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(ticketsApi.addMessage('tick-001', '', '')).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.getCategories
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.getCategories', () => {
  it('envoie un GET vers /support/settings/categories', async () => {
    mockGet.mockResolvedValueOnce({ data: [CAT] });
    await ticketsApi.getCategories();
    expect(mockGet).toHaveBeenCalledWith('/support/settings/categories');
  });

  it('filtre les catégories masquées (is_hidden=true)', async () => {
    mockGet.mockResolvedValueOnce({
      data: [CAT, { id: 2, name: 'Interne', is_hidden: true }],
    });
    const result = await ticketsApi.getCategories();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Technique');
  });

  it('accepte le format { data: [...] }', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [CAT] } });
    const result = await ticketsApi.getCategories();
    expect(result).toHaveLength(1);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ticketsApi.getCategories()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.getSubCategories
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.getSubCategories', () => {
  it('envoie un GET vers /support/settings/subcategories avec categoryId', async () => {
    mockGet.mockResolvedValueOnce({ data: [SUB] });
    await ticketsApi.getSubCategories(1);
    expect(mockGet).toHaveBeenCalledWith('/support/settings/subcategories', { params: { categoryId: 1 } });
  });

  it('retourne les sous-catégories', async () => {
    mockGet.mockResolvedValueOnce({ data: [SUB] });
    const result = await ticketsApi.getSubCategories(1);
    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ticketsApi.create
// ═══════════════════════════════════════════════════════════════════════════════

describe('ticketsApi.create', () => {
  const PAYLOAD = {
    subject: 'Problème de signal',
    description: 'La balise ne transmet plus',
    priority: 'HIGH' as const,
    category: 'Technique',
    sub_category: 'Signal GPS',
    vehicle_id: 'v-001',
  };

  it('envoie un POST vers /tickets avec le payload complet', async () => {
    mockPost.mockResolvedValueOnce({ data: TICKET });
    await ticketsApi.create(PAYLOAD);
    expect(mockPost).toHaveBeenCalledWith('/tickets', PAYLOAD);
  });

  it('retourne le ticket créé', async () => {
    mockPost.mockResolvedValueOnce({ data: TICKET });
    const result = await ticketsApi.create(PAYLOAD);
    expect(result.id).toBe('tick-001');
    expect(result.status).toBe('OPEN');
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(ticketsApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'SERVER' });
  });

  it('propage une erreur réseau', async () => {
    mockPost.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ticketsApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
