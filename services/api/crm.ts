import {
  USE_MOCK,
  NETWORK_DELAY,
  API_URL,
  DB_KEYS,
  db,
  sleep,
  filterByTenant,
  getHeaders,
  handleAuthError,
  tierToClient,
  clientToTier,
  tierToSupplier,
  supplierToTier
} from './client';
import { logger } from '../../utils/logger';
import type {
  Tier,
  Client,
  Branch,
  Lead,
  Supplier,
  Task,
  AutomationRule
} from '../../types';

export function createCrmApi(lazyApi: () => any) {
  return {
    // --- TIERS (UNIFIED PARTNERS) ---
    tiers: {
      list: async (tenantId?: string): Promise<Tier[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.TIERS, [] as Tier[]);
        try {
          // Ne pas envoyer tenantId si undefined - le backend utilise le tenant du JWT
          const url = tenantId ? `${API_URL}/tiers?tenantId=${tenantId}` : `${API_URL}/tiers`;
          const response = await fetch(url, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch tiers');
          return await response.json();
        } catch (e) {
          logger.warn('API Error (tiers), falling back to mock data:', e);
          return db.get(DB_KEYS.TIERS, [] as Tier[]);
        }
      },
      create: async (tier: Tier): Promise<Tier> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const tiers = db.get(DB_KEYS.TIERS, [] as Tier[]);
          const newTier = { ...tier, id: tier.id || `TIER-${Date.now()}` };
          db.set(DB_KEYS.TIERS, [...tiers, newTier]);
          return newTier;
        }
        try {
          const response = await fetch(`${API_URL}/tiers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(tier)
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Erreur lors de la création');
          }
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (tier: Tier): Promise<Tier> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const tiers = db.get(DB_KEYS.TIERS, []);
          const updated = tiers.map((t: Tier) => t.id === tier.id ? tier : t);
          db.set(DB_KEYS.TIERS, updated);
          return tier;
        }
        try {
          const response = await fetch(`${API_URL}/tiers/${tier.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(tier)
          });
          if (!response.ok) throw new Error('Failed to update tier');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<string> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const tiers = db.get(DB_KEYS.TIERS, []);
          db.set(DB_KEYS.TIERS, tiers.filter((t: Tier) => t.id !== id));
          return id;
        }
        try {
          const response = await fetch(`${API_URL}/tiers/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete tier');
          return id;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      }
    },

    // --- RESELLER STATS ---
    resellers: {
      getStats: async (resellerId: string): Promise<any> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          return {
            resellerId,
            stats: {
              clients: { total: 0, active: 0 },
              vehicles: { total: 0, active: 0 },
              mrr: { amount: 0, currency: 'FCFA', perVehicle: 15000 }
            }
          };
        }
        try {
          const response = await fetch(`${API_URL}/resellers/${resellerId}/stats`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch reseller stats');
          return await response.json();
        } catch (e) {
          logger.warn('API Error (reseller stats):', e);
          return {
            resellerId,
            stats: {
              clients: { total: 0, active: 0 },
              vehicles: { total: 0, active: 0 },
              mrr: { amount: 0, currency: 'FCFA', perVehicle: 15000 }
            }
          };
        }
      },
      getStatsSummary: async (): Promise<any> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          return {
            summary: {
              totalResellers: 0,
              activeResellers: 0,
              totalClients: 0,
              activeClients: 0,
              totalVehicles: 0,
              activeVehicles: 0,
              totalMRR: 0,
              currency: 'FCFA'
            },
            resellers: []
          };
        }
        try {
          const response = await fetch(`${API_URL}/resellers/stats/summary`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch resellers stats summary');
          return await response.json();
        } catch (e) {
          logger.warn('API Error (resellers stats summary):', e);
          return {
            summary: {
              totalResellers: 0,
              activeResellers: 0,
              totalClients: 0,
              activeClients: 0,
              totalVehicles: 0,
              activeVehicles: 0,
              totalMRR: 0,
              currency: 'FCFA'
            },
            resellers: []
          };
        }
      }
    },

    // --- CLIENTS ---
    clients: {
      list: async (tenantId?: string): Promise<Client[]> => {
        const tiers = await lazyApi().tiers.list(tenantId);
        // Pass all tiers so tierToClient can lookup reseller names
        return tiers.filter((t: Tier) => t.type === 'CLIENT').map((t: Tier) => tierToClient(t, tiers));
      },
      create: async (client: Client): Promise<Client> => {
        const tier = clientToTier(client);
        const createdTier = await lazyApi().tiers.create(tier);
        const createdClient = tierToClient(createdTier);

        // Create default branch for the new client
        const defaultBranch: Branch = {
          id: `BR-${Date.now()}`,
          name: 'Flotte Principale',
          clientId: createdClient.id,
          isDefault: true,
          createdAt: new Date().toISOString(),
          statut: 'ACTIVE'
        };
        await lazyApi().branches.create(defaultBranch);

        return createdClient;
      },
      update: async (client: Client): Promise<Client> => {
        const tier = clientToTier(client);
        const updatedTier = await lazyApi().tiers.update(tier);
        return tierToClient(updatedTier);
      },
      delete: async (id: string): Promise<void> => {
        await lazyApi().tiers.delete(id);
      },
      bulkUpdateStatus: async (ids: string[], status: any): Promise<void> => {
        const tiers = await lazyApi().tiers.list();
        const targets = tiers.filter((t: Tier) => ids.includes(t.id));
        for (const t of targets) {
          await lazyApi().tiers.update({ ...t, status });
        }
      }
    },

    // --- LEADS ---
    leads: {
      list: async (tenantId?: string): Promise<Lead[]> => {
        if (USE_MOCK) return db.get(DB_KEYS.LEADS, [] as Lead[]);
        try {
          const response = await fetch(`${API_URL}/crm/leads`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch leads');
          const rawData = await response.json();

          return rawData.map((l: any) => ({
            id: l.id,
            tenantId: l.tenant_id,
            companyName: l.company_name,
            contactName: l.contact_name,
            email: l.email,
            phone: l.phone,
            status: l.status,
            potentialValue: parseFloat(l.potential_value || '0'),
            assignedTo: l.assigned_to,
            notes: l.notes,
            type: l.type || 'B2B',
            sector: l.sector,
            source: l.source,
            resellerId: l.reseller_id,
            interestedProducts: l.interested_products ? (typeof l.interested_products === 'string' ? JSON.parse(l.interested_products) : l.interested_products) : [],
            createdAt: new Date(l.created_at),
            updatedAt: l.updated_at ? new Date(l.updated_at) : undefined
          }));
        } catch (e) {
          logger.error('API Error (leads):', e);
          throw e;
        }
      },
      create: async (lead: Lead): Promise<Lead> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const leads = db.get(DB_KEYS.LEADS, [] as Lead[]);
          const newLead = { ...lead, id: `LEAD-${Date.now()}`, createdAt: new Date() };
          leads.push(newLead);
          db.save(DB_KEYS.LEADS, leads);
          return newLead;
        }
        try {
          const response = await fetch(`${API_URL}/crm/leads`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(lead)
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const msg = errorData?.message || errorData?.error || `Erreur ${response.status}`;
            throw new Error(response.status === 403 ? 'Permission refusée pour créer un lead' : msg);
          }
          const rawData = await response.json();
          return {
            id: rawData.id,
            tenantId: rawData.tenant_id,
            companyName: rawData.company_name,
            contactName: rawData.contact_name,
            email: rawData.email,
            phone: rawData.phone,
            status: rawData.status,
            potentialValue: parseFloat(rawData.potential_value || '0'),
            assignedTo: rawData.assigned_to,
            notes: rawData.notes,
            type: rawData.type || 'B2B',
            sector: rawData.sector,
            source: rawData.source,
            resellerId: rawData.reseller_id,
            interestedProducts: rawData.interested_products ? (typeof rawData.interested_products === 'string' ? JSON.parse(rawData.interested_products) : rawData.interested_products) : [],
            createdAt: new Date(rawData.created_at),
            updatedAt: rawData.updated_at ? new Date(rawData.updated_at) : undefined
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (lead: Lead): Promise<Lead> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const leads = db.get(DB_KEYS.LEADS, [] as Lead[]);
          const index = leads.findIndex((l: Lead) => l.id === lead.id);
          if (index !== -1) {
            leads[index] = { ...leads[index], ...lead };
            db.save(DB_KEYS.LEADS, leads);
            return leads[index];
          }
          throw new Error('Lead not found');
        }
        try {
          const response = await fetch(`${API_URL}/crm/leads/${lead.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(lead)
          });
          if (!response.ok) throw new Error('Failed to update lead');
          const rawData = await response.json();
          return {
            id: rawData.id,
            tenantId: rawData.tenant_id,
            companyName: rawData.company_name,
            contactName: rawData.contact_name,
            email: rawData.email,
            phone: rawData.phone,
            status: rawData.status,
            potentialValue: parseFloat(rawData.potential_value || '0'),
            assignedTo: rawData.assigned_to,
            notes: rawData.notes,
            type: rawData.type || 'B2B',
            sector: rawData.sector,
            source: rawData.source,
            resellerId: rawData.reseller_id,
            interestedProducts: rawData.interested_products ? (typeof rawData.interested_products === 'string' ? JSON.parse(rawData.interested_products) : rawData.interested_products) : [],
            createdAt: new Date(rawData.created_at),
            updatedAt: rawData.updated_at ? new Date(rawData.updated_at) : undefined
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const leads = db.get(DB_KEYS.LEADS, [] as Lead[]);
          const filtered = leads.filter((l: Lead) => l.id !== id);
          db.save(DB_KEYS.LEADS, filtered);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/crm/leads/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete lead');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      updateStatus: async (id: string, status: any): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const leads = db.get(DB_KEYS.LEADS, [] as Lead[]);
          const index = leads.findIndex((l: Lead) => l.id === id);
          if (index !== -1) {
            leads[index] = { ...leads[index], status };
            db.save(DB_KEYS.LEADS, leads);
            return;
          }
          throw new Error('Lead not found');
        }
        try {
          const response = await fetch(`${API_URL}/crm/leads/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status })
          });
          if (!response.ok) throw new Error('Failed to update lead status');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- SUPPLIERS ---
    suppliers: {
      getAll: async () => {
        const tiers = await lazyApi().tiers.list();
        return tiers.filter((t: Tier) => t.type === 'SUPPLIER').map(tierToSupplier);
      },
      create: async (supplier: Supplier) => {
        const tier = supplierToTier(supplier);
        const createdTier = await lazyApi().tiers.create(tier);
        return tierToSupplier(createdTier);
      },
      update: async (supplier: Supplier) => {
        const tier = supplierToTier(supplier);
        const updatedTier = await lazyApi().tiers.update(tier);
        return tierToSupplier(updatedTier);
      },
      delete: async (id: string) => {
        await lazyApi().tiers.delete(id);
        return id;
      }
    },

    // --- CRM (Tasks, Automation) ---
    crm: {
      convertLead: async (leadId: string, data: any) => {
        const response = await fetch(`${API_URL}/crm/leads/${leadId}/convert`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data)
        });
        return response.json();
      },
      getTasks: async (): Promise<Task[]> => {
        const response = await fetch(`${API_URL}/crm/tasks`, { headers: getHeaders() });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      },
      createTask: async (task: Partial<Task>): Promise<Task> => {
        const response = await fetch(`${API_URL}/crm/tasks`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(task)
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      },
      updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
        const response = await fetch(`${API_URL}/crm/tasks/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(task)
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      },
      deleteTask: async (id: string): Promise<string> => {
        const response = await fetch(`${API_URL}/crm/tasks/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        // Backend returns the deleted id as a plain string
        return response.json();
      },
      getAutomationRules: async (): Promise<AutomationRule[]> => {
        const response = await fetch(`${API_URL}/crm/automation-rules`, { headers: getHeaders() });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      },
      createAutomationRule: async (rule: Partial<AutomationRule>): Promise<AutomationRule> => {
        const response = await fetch(`${API_URL}/crm/automation-rules`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(rule)
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      },
      updateAutomationRule: async (id: string, rule: Partial<AutomationRule>): Promise<AutomationRule> => {
        const response = await fetch(`${API_URL}/crm/automation-rules/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(rule)
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      },
      deleteAutomationRule: async (id: string): Promise<string> => {
        const response = await fetch(`${API_URL}/crm/automation-rules/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        return response.json();
      }
    }
  };
}
