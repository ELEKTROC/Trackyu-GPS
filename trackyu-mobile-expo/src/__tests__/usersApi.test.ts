/**
 * @jest-environment node
 *
 * Tests unitaires de usersApi.
 *
 * Vérifie :
 *  - getAll         : GET /users, normalisation null → []
 *  - createUser     : POST /users (pas de try/catch → erreur brute)
 *  - updateUser     : PUT /users/:id
 *  - toggleStatus   : PUT /users/:id avec { status }
 *  - updateProfile  : PUT /users/:id avec les champs profil
 *  - changePassword : POST /auth/change-password
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
import { usersApi } from '../api/users';
import type { TenantUser } from '../api/users';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const USER: TenantUser = {
  id: 'u-001',
  email: 'konan@total-ci.com',
  name: 'Konan Kouassi',
  role: 'CLIENT',
  phone: '+22507000001',
  avatar: null,
  status: 'Actif',
  tenant_id: 'tenant-01',
  client_id: 'c-001',
  created_at: '2026-01-01T00:00:00.000Z',
  last_login: '2026-04-10T08:00:00.000Z',
  departement: 'Transport',
  poste: 'Responsable flotte',
};

const AUTH_USER = {
  id: 'u-001',
  name: 'Konan Kouassi',
  email: 'konan@total-ci.com',
  role: 'CLIENT',
  tenantId: 'tenant-01',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// usersApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('usersApi.getAll', () => {
  it('envoie un GET vers /users', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await usersApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/users');
  });

  it('retourne la liste des utilisateurs', async () => {
    mockGet.mockResolvedValueOnce({ data: [USER] });
    const result = await usersApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('konan@total-ci.com');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await usersApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await usersApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(usersApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(usersApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(usersApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usersApi.createUser
// ═══════════════════════════════════════════════════════════════════════════════

describe('usersApi.createUser', () => {
  const PAYLOAD = {
    name: 'Diallo Ibrahim',
    email: 'diallo@total-ci.com',
    password: 'SecurePass123!',
    role: 'CLIENT',
    phone: '+22507000002',
  };

  it('envoie un POST vers /users avec le payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { ...USER, ...PAYLOAD } });
    await usersApi.createUser(PAYLOAD);
    expect(mockPost).toHaveBeenCalledWith('/users', PAYLOAD);
  });

  it("retourne l'utilisateur créé", async () => {
    mockPost.mockResolvedValueOnce({ data: USER });
    const result = await usersApi.createUser(PAYLOAD);
    expect(result.id).toBe('u-001');
  });

  // createUser n'a pas de try/catch → propage l'erreur axios brute
  it("propage l'erreur brute si la création échoue", async () => {
    const axiosError = new Error('Request failed with status code 422');
    mockPost.mockRejectedValueOnce(axiosError);
    await expect(usersApi.createUser(PAYLOAD)).rejects.toThrow('Request failed with status code 422');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usersApi.updateUser
// ═══════════════════════════════════════════════════════════════════════════════

describe('usersApi.updateUser', () => {
  it('envoie un PUT vers /users/:id avec les données partielles', async () => {
    mockPut.mockResolvedValueOnce({ data: USER });
    await usersApi.updateUser('u-001', { name: 'Nouveau Nom', role: 'TECH' });
    expect(mockPut).toHaveBeenCalledWith('/users/u-001', { name: 'Nouveau Nom', role: 'TECH' });
  });

  it("retourne l'utilisateur mis à jour", async () => {
    mockPut.mockResolvedValueOnce({ data: { ...USER, name: 'Nouveau Nom' } });
    const result = await usersApi.updateUser('u-001', { name: 'Nouveau Nom' });
    expect(result.name).toBe('Nouveau Nom');
  });

  it("propage l'erreur brute si la mise à jour échoue", async () => {
    const axiosError = new Error('Request failed with status code 422');
    mockPut.mockRejectedValueOnce(axiosError);
    await expect(usersApi.updateUser('u-001', { name: 'X' })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usersApi.toggleStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe('usersApi.toggleStatus', () => {
  it('envoie un PUT vers /users/:id avec { status: "Actif" }', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });
    await usersApi.toggleStatus('u-001', 'Actif');
    expect(mockPut).toHaveBeenCalledWith('/users/u-001', { status: 'Actif' });
  });

  it('envoie un PUT vers /users/:id avec { status: "Inactif" }', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });
    await usersApi.toggleStatus('u-001', 'Inactif');
    expect(mockPut).toHaveBeenCalledWith('/users/u-001', { status: 'Inactif' });
  });

  it('retourne void', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });
    const result = await usersApi.toggleStatus('u-001', 'Actif');
    expect(result).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usersApi.updateProfile
// ═══════════════════════════════════════════════════════════════════════════════

describe('usersApi.updateProfile', () => {
  it('envoie un PUT vers /users/:id avec name et phone', async () => {
    mockPut.mockResolvedValueOnce({ data: AUTH_USER });
    await usersApi.updateProfile('u-001', { name: 'Konan Kouassi', phone: '+22507000099' });
    expect(mockPut).toHaveBeenCalledWith('/users/u-001', {
      name: 'Konan Kouassi',
      phone: '+22507000099',
    });
  });

  it("retourne l'utilisateur Auth mis à jour", async () => {
    mockPut.mockResolvedValueOnce({ data: AUTH_USER });
    const result = await usersApi.updateProfile('u-001', { name: 'Nouveau Nom' });
    expect(result.id).toBe('u-001');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// usersApi.changePassword
// ═══════════════════════════════════════════════════════════════════════════════

describe('usersApi.changePassword', () => {
  it('envoie un POST vers /auth/change-password avec les mots de passe', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });
    await usersApi.changePassword('u-001', {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
    });
  });

  it('retourne void en cas de succès', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const result = await usersApi.changePassword('u-001', {
      currentPassword: 'Old!',
      newPassword: 'New!',
    });
    expect(result).toBeUndefined();
  });

  it("propage l'erreur si le mot de passe actuel est incorrect", async () => {
    const axiosError = new Error('Request failed with status code 400');
    mockPost.mockRejectedValueOnce(axiosError);
    await expect(
      usersApi.changePassword('u-001', { currentPassword: 'Wrong!', newPassword: 'New!' })
    ).rejects.toThrow();
  });
});
