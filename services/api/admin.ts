// services/api/admin.ts — Admin domain: users, trash, settings, system, adminFeatures, tenants, etc.
import {
  USE_MOCK,
  NETWORK_DELAY,
  API_URL,
  DB_KEYS,
  db,
  sleep,
  filterByTenant,
  getHeaders,
  handleAuthError
} from './client';
import { logger } from '../../utils/logger';
import type { SystemUser, Anomaly, UserActivity } from '../../types';

export function createAdminApi(lazyApi: () => any) {
  return {
    // --- ANOMALIES ---
    anomalies: {
      list: async (): Promise<Anomaly[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.ANOMALIES, [] as Anomaly[]);
        }
        try {
          const response = await fetch(`${API_URL}/monitoring/anomalies`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch anomalies');
          return await response.json();
        } catch (e) {
          logger.error('API Error (anomalies):', e);
          return [];
        }
      },
      update: async (id: string, data: any): Promise<Anomaly> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const anomalies = db.get(DB_KEYS.ANOMALIES, [] as Anomaly[]);
          const index = anomalies.findIndex(a => a.id === id);
          if (index !== -1) {
            anomalies[index] = { ...anomalies[index], ...data };
            db.save(DB_KEYS.ANOMALIES, anomalies);
            return anomalies[index];
          }
          throw new Error('Anomaly not found');
        }
        try {
          const response = await fetch(`${API_URL}/monitoring/anomalies/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Failed to update anomaly');
          return await response.json();
        } catch (e) {
          logger.error('API Error (anomaly update):', e);
          throw e;
        }
      }
    },

    // --- USER ACTIVITY ---
    userActivity: {
      list: async (): Promise<UserActivity[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.USER_ACTIVITY, [] as UserActivity[]);
        }
        try {
          const response = await fetch(`${API_URL}/admin/user-activity`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch user activity');
          return await response.json();
        } catch (e) {
          logger.error('API Error (user activity):', e);
          return [];
        }
      },
      getLogs: async (userId: string): Promise<any[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return [];
        }
        try {
          const response = await fetch(`${API_URL}/admin/user-activity/${userId}/logs`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch user activity logs');
          return await response.json();
        } catch (e) {
          logger.error('API Error (user activity logs):', e);
          return [];
        }
      }
    },

    // --- USERS ---
    users: {
      list: async (tenantId?: string): Promise<SystemUser[]> => {
        if (USE_MOCK) {
          const allUsers = db.get(DB_KEYS.USERS, [] as SystemUser[]);
          return filterByTenant(allUsers, tenantId);
        }
        try {
          const response = await fetch(`${API_URL}/users`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch users');
          const rawData = await response.json();
          return rawData.map((u: any) => ({
            id: u.id, tenantId: u.tenant_id, name: u.name, email: u.email, role: u.role,
            status: u.status || 'Actif', avatar: u.avatar, phone: u.phone,
            permissions: u.permissions || [], createdAt: u.created_at, updatedAt: u.updated_at,
            lastLogin: u.last_login || undefined, require2FA: !!u.require_2fa,
            plainPassword: u.plain_password || undefined,
            allowedTenants: u.allowed_tenants || [],
            matricule: u.matricule, cin: u.cin, dateNaissance: u.date_naissance,
            lieuNaissance: u.lieu_naissance, nationalite: u.nationalite, sexe: u.sexe,
            situationFamiliale: u.situation_familiale, adresse: u.adresse, ville: u.ville,
            codePostal: u.code_postal, pays: u.pays, dateEmbauche: u.date_embauche,
            typeContrat: u.type_contrat, departement: u.departement, poste: u.poste,
            manager: u.manager_id, salaire: u.salaire ? Number(u.salaire) : undefined,
            contactUrgenceNom: u.contact_urgence_nom, contactUrgenceTel: u.contact_urgence_tel,
            contactUrgenceLien: u.contact_urgence_lien, specialty: u.specialite || u.specialty,
            signature: u.signature, jobStatus: u.job_status, region: u.region, location: u.location,
          }));
        } catch (e) {
          logger.error("API Error fetching users:", e);
          if (!USE_MOCK) throw e;
          const allUsers = db.get(DB_KEYS.USERS, [] as SystemUser[]);
          return filterByTenant(allUsers, tenantId);
        }
      },
      create: async (user: SystemUser & Record<string, any>): Promise<SystemUser> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const users = db.get(DB_KEYS.USERS, [] as SystemUser[]);
          const newUser = { ...user, id: `USR-${Date.now()}` };
          users.push(newUser);
          db.save(DB_KEYS.USERS, users);
          return newUser;
        }
        try {
          const payload: Record<string, any> = {};
          if (user.name) payload.name = user.name;
          if (user.email) payload.email = user.email;
          if (user.password) payload.password = user.password;
          if (user.role) payload.role = user.role;
          if (user.tenantId) payload.tenantId = user.tenantId;
          if (user.avatar) payload.avatar = user.avatar;
          if (user.phone !== undefined) payload.phone = user.phone;
          if (user.allowedTenants) payload.allowedTenants = user.allowedTenants;
          if (user.sendInvite) payload.sendInvite = user.sendInvite;
          const hrKeys = ['matricule','cin','dateNaissance','lieuNaissance','nationalite','sexe',
            'situationFamiliale','adresse','ville','codePostal','pays','dateEmbauche','typeContrat',
            'departement','poste','salaire','contactUrgenceNom','contactUrgenceTel','contactUrgenceLien',
            'specialite','niveau','zone','societe','signature'] as const;
          for (const f of hrKeys) { if (user[f] !== undefined) payload[f] = user[f]; }
          if (user.specialty) payload.specialite = user.specialty;
          if (user.manager) payload.managerId = user.manager;
          if (user.subRole !== undefined) payload.subRole = user.subRole;
          if (user.clientId !== undefined) payload.clientId = user.clientId;
          if (user.branchId !== undefined) payload.branchId = user.branchId;
          if (user.vehicleIds !== undefined) payload.vehicleIds = user.vehicleIds;
          if (user.allVehicles !== undefined) payload.allVehicles = user.allVehicles;
          const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const fieldErrors = errorData.details?.map((d: any) => `${d.field ? d.field + ': ' : ''}${d.message}`).join(', ');
            const errMsg = fieldErrors || errorData.message || errorData.error || 'Échec de la création';
            throw new Error(errMsg);
          }
          const rawData = await response.json();
          return {
            ...rawData,
            tenantId: rawData.tenant_id, status: rawData.status || 'Actif',
            permissions: rawData.permissions || [], allowedTenants: rawData.allowed_tenants || [],
            createdAt: rawData.created_at, updatedAt: rawData.updated_at,
            lastLogin: rawData.last_login || undefined, require2FA: !!rawData.require_2fa,
          } as SystemUser;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (user: SystemUser & Record<string, any>): Promise<SystemUser> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const users = db.get(DB_KEYS.USERS, [] as SystemUser[]);
          const index = users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            users[index] = user;
            db.save(DB_KEYS.USERS, users);
            return user;
          }
          throw new Error('User not found');
        }
        try {
          const payload: Record<string, any> = {};
          if (user.name) payload.name = user.name;
          if (user.email) payload.email = user.email;
          if (user.role) payload.role = user.role;
          if (user.tenantId) payload.tenantId = user.tenantId;
          if (user.avatar) payload.avatar = user.avatar;
          if (user.password) payload.password = user.password;
          if (user.allowedTenants) payload.allowedTenants = user.allowedTenants;
          if (user.phone !== undefined) payload.phone = user.phone;
          if (user.status) payload.status = user.status;
          const hrKeys = ['matricule','cin','dateNaissance','lieuNaissance','nationalite','sexe',
            'situationFamiliale','adresse','ville','codePostal','pays','dateEmbauche','typeContrat',
            'departement','poste','salaire','contactUrgenceNom','contactUrgenceTel','contactUrgenceLien',
            'specialite','niveau','zone','societe','signature'] as const;
          for (const f of hrKeys) { if (user[f] !== undefined) payload[f] = user[f]; }
          if (user.specialty !== undefined) payload.specialite = user.specialty;
          if (user.manager !== undefined) payload.managerId = user.manager;
          if (user.require2FA !== undefined) payload.require2FA = user.require2FA;
          if (user.subUsers !== undefined) payload.subUsers = user.subUsers;
          const response = await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('Failed to update user');
          const rawData = await response.json();
          return {
            ...rawData,
            tenantId: rawData.tenant_id, status: rawData.status || 'Actif',
            permissions: rawData.permissions || [], allowedTenants: rawData.allowed_tenants || [],
            createdAt: rawData.created_at, updatedAt: rawData.updated_at,
            lastLogin: rawData.last_login || undefined, require2FA: !!rawData.require_2fa,
          } as SystemUser;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const users = db.get(DB_KEYS.USERS, [] as SystemUser[]);
          const index = users.findIndex(u => u.id === id);
          if (index !== -1) {
            users[index].status = 'Inactif';
            db.save(DB_KEYS.USERS, users);
          }
          return;
        }
        try {
          const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete user');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      resetPassword: async (userId: string, newPassword?: string): Promise<{ message: string; email: string; generatedPassword?: string }> => {
        const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(newPassword ? { newPassword } : {})
        });
        if (!response.ok) throw new Error('Failed to reset password');
        return response.json();
      },
      sendInvite: async (data: { email: string; name?: string; role?: string }): Promise<any> => {
        const response = await fetch(`${API_URL}/users/invite`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to send invite');
        return response.json();
      },
      listDeleted: async (): Promise<any[]> => {
        const response = await fetch(`${API_URL}/users/deleted`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch deleted users');
        return response.json();
      },
      restore: async (id: string): Promise<any> => {
        const response = await fetch(`${API_URL}/users/${id}/restore`, {
          method: 'POST',
          headers: getHeaders()
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to restore user');
        }
        return response.json();
      },
      permanentDelete: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/users/${id}/permanent`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to permanently delete user');
      }
    },

    // --- CORBEILLE GLOBALE ---
    trash: {
      list: async (): Promise<{ users: any[]; contracts: any[]; tenants: any[]; totals: { users: number; contracts: number; tenants: number; total: number } }> => {
        const response = await fetch(`${API_URL}/trash`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch trash');
        return response.json();
      },
      restore: async (entityType: string, entityId: string): Promise<any> => {
        const response = await fetch(`${API_URL}/trash/${entityType}/${entityId}/restore`, {
          method: 'POST',
          headers: getHeaders()
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to restore item');
        }
        return response.json();
      },
      permanentDelete: async (entityType: string, entityId: string): Promise<void> => {
        const response = await fetch(`${API_URL}/trash/${entityType}/${entityId}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to permanently delete item');
      }
    },

    // --- SETTINGS ---
    settings: {
      list: async () => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.SETTINGS, []);
        }
        try {
          const response = await fetch(`${API_URL}/settings`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch settings');
          return await response.json();
        } catch (e) {
          logger.warn('API Error (settings), falling back to mock data:', e);
          return db.get(DB_KEYS.SETTINGS, []);
        }
      },
      update: async (key: string, value: string) => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const settings = db.get(DB_KEYS.SETTINGS, []);
          const index = settings.findIndex((s: any) => s.key === key);
          if (index !== -1) {
            settings[index] = { key, value };
          } else {
            settings.push({ key, value });
          }
          db.save(DB_KEYS.SETTINGS, settings);
          return { key, value };
        }
        try {
          const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ key, value })
          });
          if (!response.ok) throw new Error('Failed to update setting');
          return await response.json();
        } catch (e) {
          logger.warn('API Error (settings update), falling back to mock data:', e);
          const settings = db.get(DB_KEYS.SETTINGS, []);
          const index = settings.findIndex((s: any) => s.key === key);
          if (index !== -1) {
            settings[index] = { key, value };
          } else {
            settings.push({ key, value });
          }
          db.save(DB_KEYS.SETTINGS, settings);
          return { key, value };
        }
      }
    },

    // --- SYSTEM ---
    system: {
      stats: async () => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return {
            cpu: { count: 4, percent: Math.random() * 100 },
            memory: { total: 16000000000, used: 8000000000, percent: Math.random() * 100 },
            disk: { percent: Math.random() * 100 },
            uptime: 12345,
            platform: 'linux'
          };
        }
        const response = await fetch(`${API_URL}/system/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch system stats');
        return response.json();
      },
      metrics: async () => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return {
            gps: {
              activeConnections: Math.floor(Math.random() * 100),
              messagesReceived: Math.floor(Math.random() * 100000),
              messagesSuccess: Math.floor(Math.random() * 99000),
              messagesError: Math.floor(Math.random() * 100),
              positionsSaved: Math.floor(Math.random() * 50000),
              parsingErrors: Math.floor(Math.random() * 10),
              processing: { count: 1000, sum: 0.5, avgMs: 0.5 }
            },
            cache: {
              hits: Math.floor(Math.random() * 50000),
              misses: Math.floor(Math.random() * 1000),
              hitRate: 95 + Math.random() * 5,
              latency: { count: 10000, sum: 0.01, avgMs: 0.001 }
            },
            database: {
              poolTotal: 20,
              poolActive: Math.floor(Math.random() * 10),
              poolIdle: Math.floor(Math.random() * 15),
              poolWaiting: 0,
              queries: Math.floor(Math.random() * 10000),
              queryLatency: { count: 5000, sum: 5, avgMs: 1 },
              bufferSize: Math.floor(Math.random() * 50),
              batchInserts: Math.floor(Math.random() * 500)
            },
            websocket: {
              activeClients: Math.floor(Math.random() * 20),
              messagesEmitted: Math.floor(Math.random() * 100000),
              messagesThrottled: Math.floor(Math.random() * 1000)
            },
            business: {
              activeVehicles: Math.floor(Math.random() * 500),
              alertsGenerated: Math.floor(Math.random() * 100)
            },
            timestamp: new Date().toISOString()
          };
        }
        const response = await fetch(`${API_URL}/system/metrics`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch system metrics');
        return response.json();
      }
    },

    // --- ADMIN FEATURES ---
    adminFeatures: {
      roles: {
        list: async () => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get(DB_KEYS.ROLES, []); }
          const response = await fetch(`${API_URL}/roles`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch roles');
          return response.json();
        },
        get: async (id: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.ROLES, []); return items.find((i: any) => i.id === id); }
          const response = await fetch(`${API_URL}/roles/${id}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch role');
          return response.json();
        },
        create: async (data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.ROLES, []); const newItem = { ...data, id: `role_${Date.now()}` }; db.save(DB_KEYS.ROLES, [...items, newItem]); return newItem; }
          const response = await fetch(`${API_URL}/roles`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create role');
          return response.json();
        },
        update: async (id: string, data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.ROLES, []); const updated = items.map((i: any) => i.id === id ? { ...i, ...data } : i); db.save(DB_KEYS.ROLES, updated); return updated.find((i: any) => i.id === id); }
          const response = await fetch(`${API_URL}/roles/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update role');
          return response.json();
        },
        delete: async (id: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.ROLES, []); db.save(DB_KEYS.ROLES, items.filter((i: any) => i.id !== id)); return id; }
          const response = await fetch(`${API_URL}/roles/${id}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to delete role');
          return id;
        },
        assignToUser: async (userId: string, roleId: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return { success: true }; }
          const response = await fetch(`${API_URL}/roles/assign`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ userId, roleId }) });
          if (!response.ok) throw new Error('Failed to assign role to user');
          return response.json();
        },
        removeFromUser: async (userId: string, roleId: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return { success: true }; }
          const response = await fetch(`${API_URL}/roles/remove`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ userId, roleId }) });
          if (!response.ok) throw new Error('Failed to remove role from user');
          return response.json();
        }
      },
      integrations: {
        list: async () => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get(DB_KEYS.INTEGRATIONS, []); }
          const response = await fetch(`${API_URL}/admin-features/integrations`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch integrations');
          return response.json();
        },
        update: async (id: string, data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.INTEGRATIONS, []); const updated = items.map((i: any) => i.id === id ? { ...i, ...data } : i); db.save(DB_KEYS.INTEGRATIONS, updated); return updated.find((i: any) => i.id === id); }
          const response = await fetch(`${API_URL}/admin-features/integrations/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update integration');
          return response.json();
        }
      },
      templates: {
        list: async () => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get(DB_KEYS.TEMPLATES, []); }
          const response = await fetch(`${API_URL}/admin-features/templates`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch templates');
          return response.json();
        },
        create: async (data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.TEMPLATES, []); const newItem = { ...data, id: `tpl_${Date.now()}` }; db.save(DB_KEYS.TEMPLATES, [...items, newItem]); return newItem; }
          const response = await fetch(`${API_URL}/admin-features/templates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create template');
          return response.json();
        },
        update: async (id: string, data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.TEMPLATES, []); const updated = items.map((i: any) => i.id === id ? { ...i, ...data } : i); db.save(DB_KEYS.TEMPLATES, updated); return updated.find((i: any) => i.id === id); }
          const response = await fetch(`${API_URL}/admin-features/templates/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update template');
          return response.json();
        },
        delete: async (id: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.TEMPLATES, []); db.save(DB_KEYS.TEMPLATES, items.filter((i: any) => i.id !== id)); return { success: true }; }
          const response = await fetch(`${API_URL}/admin-features/templates/${id}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to delete template');
          return response.json();
        }
      },
      webhooks: {
        list: async () => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get(DB_KEYS.WEBHOOKS, []); }
          const response = await fetch(`${API_URL}/admin-features/webhooks`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch webhooks');
          return response.json();
        },
        create: async (data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.WEBHOOKS, []); const newItem = { ...data, id: `wh_${Date.now()}` }; db.save(DB_KEYS.WEBHOOKS, [...items, newItem]); return newItem; }
          const response = await fetch(`${API_URL}/admin-features/webhooks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create webhook');
          return response.json();
        },
        update: async (id: string, data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.WEBHOOKS, []); const updated = items.map((i: any) => i.id === id ? { ...i, ...data } : i); db.save(DB_KEYS.WEBHOOKS, updated); return updated.find((i: any) => i.id === id); }
          const response = await fetch(`${API_URL}/admin-features/webhooks/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update webhook');
          return response.json();
        },
        delete: async (id: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.WEBHOOKS, []); db.save(DB_KEYS.WEBHOOKS, items.filter((i: any) => i.id !== id)); return { success: true }; }
          const response = await fetch(`${API_URL}/admin-features/webhooks/${id}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to delete webhook');
          return response.json();
        },
        test: async (id: string, event: string, payload: any) => {
          const response = await fetch(`${API_URL}/admin-features/webhooks/${id}/test`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ event, payload })
          });
          if (!response.ok) throw new Error('Failed to test webhook');
          return response.json();
        }
      },
      helpArticles: {
        list: async () => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get(DB_KEYS.HELP_ARTICLES, []); }
          const response = await fetch(`${API_URL}/admin-features/help-articles`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch help articles');
          return response.json();
        },
        create: async (data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.HELP_ARTICLES, []); const newItem = { ...data, id: `art_${Date.now()}` }; db.save(DB_KEYS.HELP_ARTICLES, [...items, newItem]); return newItem; }
          const response = await fetch(`${API_URL}/admin-features/help-articles`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create help article');
          return response.json();
        },
        update: async (id: string, data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.HELP_ARTICLES, []); const updated = items.map((i: any) => i.id === id ? { ...i, ...data } : i); db.save(DB_KEYS.HELP_ARTICLES, updated); return updated.find((i: any) => i.id === id); }
          const response = await fetch(`${API_URL}/admin-features/help-articles/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update help article');
          return response.json();
        },
        delete: async (id: string) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); const items = db.get(DB_KEYS.HELP_ARTICLES, []); db.save(DB_KEYS.HELP_ARTICLES, items.filter((i: any) => i.id !== id)); return { success: true }; }
          const response = await fetch(`${API_URL}/admin-features/help-articles/${id}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to delete help article');
          return response.json();
        }
      },
      organization: {
        get: async () => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get(DB_KEYS.ORGANIZATION, {}); }
          const response = await fetch(`${API_URL}/admin-features/organization`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch organization profile');
          return response.json();
        },
        update: async (data: any) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); db.save(DB_KEYS.ORGANIZATION, data); return data; }
          const response = await fetch(`${API_URL}/admin-features/organization`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update organization profile');
          return response.json();
        }
      },
      whiteLabel: {
        get: async (params?: { tenantId?: string }) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); return db.get('db_whitelabel', {}); }
          const headers = getHeaders();
          if (params?.tenantId) headers['X-Impersonate-Tenant'] = params.tenantId;
          const response = await fetch(`${API_URL}/admin-features/whitelabel`, { headers });
          if (!response.ok) throw new Error('Failed to fetch white label config');
          return response.json();
        },
        update: async (data: any, params?: { tenantId?: string }) => {
          if (USE_MOCK) { await sleep(NETWORK_DELAY); db.save('db_whitelabel', data); return data; }
          const headers = getHeaders();
          if (params?.tenantId) headers['X-Impersonate-Tenant'] = params.tenantId;
          const response = await fetch(`${API_URL}/admin-features/whitelabel`, { 
            method: 'PUT', 
            headers, 
            body: JSON.stringify(data) 
          });
          if (!response.ok) throw new Error('Failed to update white label config');
          return response.json();
        }
      },
      supportSettings: {
        getCategories: async (includeInactive = false) => {
          const response = await fetch(`${API_URL}/support/settings/categories?includeInactive=${includeInactive}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch categories');
          return response.json();
        },
        getSubCategories: async (categoryId?: number | string, includeInactive = false) => {
          let url = `${API_URL}/support/settings/subcategories?includeInactive=${includeInactive}`;
          if (categoryId) url += `&categoryId=${categoryId}`;
          const response = await fetch(url, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch subcategories');
          return response.json();
        },
        updateSubCategory: async (id: number | string, data: any) => {
          const response = await fetch(`${API_URL}/support/settings/subcategories/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update subcategory');
          return response.json();
        },
        createSubCategory: async (data: any) => {
          const response = await fetch(`${API_URL}/support/settings/subcategories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create subcategory');
          return response.json();
        },
        deleteSubCategory: async (id: number | string) => {
          const response = await fetch(`${API_URL}/support/settings/subcategories/${id}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to delete subcategory');
          return response.json();
        },
        getSlaConfig: async () => {
          const response = await fetch(`${API_URL}/support/settings/sla`, { headers: getHeaders() });
          return response.json();
        },
        updateSlaConfig: async (data: any) => {
          const response = await fetch(`${API_URL}/support/settings/sla`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          return response.json();
        },
        createCategory: async (data: any) => {
          const response = await fetch(`${API_URL}/support/settings/categories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create category');
          return response.json();
        },
        updateCategory: async (id: number | string, data: any) => {
          const response = await fetch(`${API_URL}/support/settings/categories/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update category');
          return response.json();
        },
        deleteCategory: async (id: number | string) => {
          const response = await fetch(`${API_URL}/support/settings/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to delete category');
          }
          return response.json();
        },
        resetOverrides: async (type: string = 'all') => {
          const response = await fetch(`${API_URL}/support/settings/reset-overrides`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ type }) });
          if (!response.ok) throw new Error('Failed to reset overrides');
          return response.json();
        },
        getMacros: async (includeInactive = false) => {
          const url = includeInactive ? `${API_URL}/support/macros/all` : `${API_URL}/support/macros`;
          const response = await fetch(url, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch macros');
          return response.json();
        },
        createMacro: async (data: { label: string; text: string; category?: string; isSystem?: boolean }) => {
          const response = await fetch(`${API_URL}/support/macros`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to create macro');
          return response.json();
        },
        updateMacro: async (id: string, data: { label?: string; text?: string; category?: string; is_active?: boolean }) => {
          const response = await fetch(`${API_URL}/support/macros/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
          if (!response.ok) throw new Error('Failed to update macro');
          return response.json();
        },
        deleteMacro: async (id: string, hard = false) => {
          const response = await fetch(`${API_URL}/support/macros/${id}?hard=${hard}`, { method: 'DELETE', headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to delete macro');
          return response.json();
        }
      }
    },

    // --- REGISTRATION REQUESTS ---
    registrationRequests: {
      list: async () => {
        const response = await fetch(`${API_URL}/registration-requests`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch registration requests');
        return response.json();
      },
      listTenants: async () => {
        const response = await fetch(`${API_URL}/registration-requests/tenants`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch tenants');
        return response.json();
      },
      getStats: async () => {
        const response = await fetch(`${API_URL}/registration-requests/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
      },
      approve: async (id: string, body: any) => {
        const response = await fetch(`${API_URL}/registration-requests/${id}/approve`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || 'Failed to approve request'); }
        return response.json();
      },
      reject: async (id: string, body: any) => {
        const response = await fetch(`${API_URL}/registration-requests/${id}/reject`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || 'Failed to reject request'); }
        return response.json();
      },
      previewEmail: async (id: string) => {
        const response = await fetch(`${API_URL}/registration-requests/${id}/preview-email`, { method: 'POST', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to preview email');
        return response.json();
      },
      sendEmail: async (id: string) => {
        const response = await fetch(`${API_URL}/registration-requests/${id}/send-email`, { method: 'POST', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to send email');
        return response.json();
      },
      previewSms: async (id: string) => {
        const response = await fetch(`${API_URL}/registration-requests/${id}/preview-sms`, { method: 'POST', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to preview SMS');
        return response.json();
      },
      sendSms: async (id: string) => {
        const response = await fetch(`${API_URL}/registration-requests/${id}/send-sms`, { method: 'POST', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to send SMS');
        return response.json();
      },
    },

    // --- MESSAGE TEMPLATES ---
    messageTemplates: {
      list: async () => {
        const response = await fetch(`${API_URL}/message-templates`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch message templates');
        return response.json();
      },
      create: async (data: any) => {
        const response = await fetch(`${API_URL}/message-templates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) throw new Error('Failed to create template');
        return response.json();
      },
      update: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/message-templates/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) throw new Error('Failed to update template');
        return response.json();
      },
      delete: async (id: string) => {
        const response = await fetch(`${API_URL}/message-templates/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to delete template');
        return response.json();
      },
      duplicate: async (id: string) => {
        const response = await fetch(`${API_URL}/message-templates/${id}/duplicate`, { method: 'POST', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to duplicate template');
        return response.json();
      },
    },

    // --- TENANTS ---
    tenants: {
      getCurrent: async () => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { id: 'tenant_default', name: 'Default Tenant', slug: 'default', status: 'ACTIVE' }; }
        const response = await fetch(`${API_URL}/tenants/current`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch current tenant');
        return response.json();
      },
      updateSettings: async (settings: any) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { success: true, settings }; }
        const response = await fetch(`${API_URL}/tenants/settings`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ settings }) });
        if (!response.ok) throw new Error('Failed to update tenant settings');
        return response.json();
      },
      list: async (params?: any) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return [{ id: 'tenant_default', name: 'Default Tenant', slug: 'tenant_default', status: 'ACTIVE' }]; }
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        const response = await fetch(`${API_URL}/tenants${query}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch tenants');
        const rawData = await response.json();
        if (Array.isArray(rawData)) return rawData;
        if (rawData?.tenants && Array.isArray(rawData.tenants)) return rawData.tenants;
        if (rawData?.data && Array.isArray(rawData.data)) return rawData.data;
        return [];
      },
      get: async (id: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { id: 'tenant_default', name: 'Default Tenant', slug: 'tenant_default', status: 'ACTIVE' }; }
        const response = await fetch(`${API_URL}/tenants/${id}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch tenant');
        return response.json();
      },
      create: async (data: any) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { ...data, id: `tenant_${Date.now()}` }; }
        const response = await fetch(`${API_URL}/tenants`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) throw new Error('Failed to create tenant');
        return response.json();
      },
      update: async (id: string, data: any) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { ...data, id }; }
        const response = await fetch(`${API_URL}/tenants/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) throw new Error('Failed to update tenant');
        return response.json();
      },
      delete: async (id: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { success: true }; }
        const response = await fetch(`${API_URL}/tenants/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to delete tenant');
        return response.json();
      },
      updateStatus: async (id: string, status: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { id, status }; }
        const response = await fetch(`${API_URL}/tenants/${id}/status`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status }) });
        if (!response.ok) throw new Error('Failed to update tenant status');
        return response.json();
      }
    },

    // --- WEBHOOK DELIVERIES ---
    webhookDeliveries: {
      list: async (params?: any) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return []; }
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        const response = await fetch(`${API_URL}/webhook-deliveries${query}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch webhook deliveries');
        return response.json();
      },
      get: async (id: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return null; }
        const response = await fetch(`${API_URL}/webhook-deliveries/${id}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch webhook delivery');
        return response.json();
      },
      retry: async (id: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { success: true }; }
        const response = await fetch(`${API_URL}/webhook-deliveries/${id}/retry`, { method: 'POST', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to retry webhook delivery');
        return response.json();
      },
      stats: async () => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { total: 0, successful: 0, failed: 0, avg_duration_ms: 0 }; }
        const response = await fetch(`${API_URL}/webhook-deliveries/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch webhook statistics');
        return response.json();
      },
      cleanup: async (days: number) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { deleted: 0 }; }
        const response = await fetch(`${API_URL}/webhook-deliveries/cleanup`, { method: 'DELETE', headers: getHeaders(), body: JSON.stringify({ days }) });
        if (!response.ok) throw new Error('Failed to cleanup webhook deliveries');
        return response.json();
      }
    },

    // --- API KEYS ---
    apiKeys: {
      list: async () => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return []; }
        const response = await fetch(`${API_URL}/api-keys`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch API keys');
        return response.json();
      },
      create: async (data: any) => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { id: `apikey_${Date.now()}`, ...data, key_prefix: 'tk_live_mock1234', api_key: 'tk_live_mock1234_abcdefghijklmnopqrstuvwxyz', warning: 'Save this API key now. You will not be able to see it again!' };
        }
        const response = await fetch(`${API_URL}/api-keys`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        if (!response.ok) throw new Error('Failed to create API key');
        return response.json();
      },
      stats: async (id: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { key: {}, usage_by_day: [] }; }
        const response = await fetch(`${API_URL}/api-keys/${id}/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch API key stats');
        return response.json();
      },
      revoke: async (id: string, reason?: string) => {
        if (USE_MOCK) { await sleep(NETWORK_DELAY); return { success: true }; }
        const response = await fetch(`${API_URL}/api-keys/${id}`, { method: 'DELETE', headers: getHeaders(), body: JSON.stringify({ reason }) });
        if (!response.ok) throw new Error('Failed to revoke API key');
        return response.json();
      }
    },

    // --- AUDIT LOGS ---
    auditLogs: {
      list: async (filters?: any) => {
        if (USE_MOCK) return [];
        const query = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/audit-logs?${query}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch audit logs');
        return response.json();
      }
    }
  };
}
