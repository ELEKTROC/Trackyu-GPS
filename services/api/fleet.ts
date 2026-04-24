// services/api/fleet.ts — Vehicles, Objects, Fuel, Maintenance, Alerts, Zones, Drivers, Groups, Commands, POIs, AlertConfigs, MaintenanceRules, ScheduleRules, EcoDrivingProfiles, Fleet
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
} from './client';
import { logger } from '../../utils/logger';
import type {
  Vehicle,
  TrackedObject,
  Zone,
  Alert,
  Driver,
  Group,
  Command,
  POI,
  AlertConfig,
  MaintenanceRule,
  ScheduleRule,
  EcoDrivingProfile,
  FuelRecord,
  FuelEvent,
  FuelEventStatus,
  PositionAnomaly,
  PositionAnomalyStatus,
  PositionAnomalyType,
  PositionAnomalySeverity,
  MaintenanceRecord,
  VehiclePositionHistory,
  Branch,
} from '../../types';

export function createFleetApi(lazyApi: () => any) {
  // --- DRIVERS (local const for self-references) ---
  const driversApi = {
    getAll: async (): Promise<Driver[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.DRIVERS);
        if (stored) return JSON.parse(stored);

        return [];
      }
      const response = await fetch(`${API_URL}/drivers`, { headers: getHeaders() });
      return response.json();
    },

    create: async (driver: Driver): Promise<Driver> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const drivers = await driversApi.getAll();
        const newDriver = { ...driver, id: driver.id || `DRV-${Date.now()}` };
        drivers.push(newDriver);
        localStorage.setItem(DB_KEYS.DRIVERS, JSON.stringify(drivers));
        return newDriver;
      }
      const response = await fetch(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driver),
      });
      return response.json();
    },

    update: async (driver: Driver): Promise<Driver> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const drivers = await driversApi.getAll();
        const index = drivers.findIndex((d) => d.id === driver.id);
        if (index !== -1) {
          drivers[index] = driver;
          localStorage.setItem(DB_KEYS.DRIVERS, JSON.stringify(drivers));
          return driver;
        }
        throw new Error('Driver not found');
      }
      const response = await fetch(`${API_URL}/drivers/${driver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driver),
      });
      return response.json();
    },

    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const drivers = await driversApi.getAll();
        const filtered = drivers.filter((d) => d.id !== id);
        localStorage.setItem(DB_KEYS.DRIVERS, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/drivers/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
    // Alias for compatibility
    list: async (tenantId?: string): Promise<Driver[]> => driversApi.getAll(),
  };

  // --- GROUPS (local const for self-references) ---
  const groupsApi = {
    getAll: async (): Promise<Group[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.GROUPS);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/groups`, { headers: getHeaders() });
      return response.json();
    },
    create: async (group: Group): Promise<Group> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const groups = await groupsApi.getAll();
        const newGroup = { ...group, id: group.id || `GRP-${Date.now()}` };
        groups.push(newGroup);
        localStorage.setItem(DB_KEYS.GROUPS, JSON.stringify(groups));
        return newGroup;
      }
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      return response.json();
    },

    update: async (group: Group): Promise<Group> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const groups = await groupsApi.getAll();
        const index = groups.findIndex((g) => g.id === group.id);
        if (index !== -1) {
          groups[index] = group;
          localStorage.setItem(DB_KEYS.GROUPS, JSON.stringify(groups));
          return group;
        }
        throw new Error('Group not found');
      }
      const response = await fetch(`${API_URL}/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      return response.json();
    },

    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const groups = await groupsApi.getAll();
        const filtered = groups.filter((g) => g.id !== id);
        localStorage.setItem(DB_KEYS.GROUPS, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/groups/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  // --- COMMANDS (local const for self-references) ---
  const commandsApi = {
    getAll: async (): Promise<Command[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.COMMANDS);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/commands`, { headers: getHeaders() });
      return response.json();
    },
    create: async (command: Command): Promise<Command> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const commands = await commandsApi.getAll();
        const newCommand = {
          ...command,
          id: command.id || `CMD-${Date.now()}`,
          sentAt: new Date().toISOString(),
          status: 'SENT' as const,
        };
        commands.push(newCommand);
        localStorage.setItem(DB_KEYS.COMMANDS, JSON.stringify(commands));
        return newCommand;
      }
      const response = await fetch(`${API_URL}/commands`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(command),
      });
      if (!response.ok) throw new Error(`Failed to create command: ${response.status}`);
      return response.json();
    },
    update: async (command: Command): Promise<Command> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const commands = await commandsApi.getAll();
        const index = commands.findIndex((c) => c.id === command.id);
        if (index !== -1) {
          commands[index] = command;
          localStorage.setItem(DB_KEYS.COMMANDS, JSON.stringify(commands));
          return command;
        }
        throw new Error('Command not found');
      }
      const response = await fetch(`${API_URL}/commands/${command.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(command),
      });
      if (!response.ok) throw new Error(`Failed to update command: ${response.status}`);
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const commands = await commandsApi.getAll();
        const filtered = commands.filter((c) => c.id !== id);
        localStorage.setItem(DB_KEYS.COMMANDS, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/commands/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  // --- POIS (local const for self-references) ---
  const poisApi = {
    getAll: async (): Promise<POI[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.POIS);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/pois`, { headers: getHeaders() });
      return response.json();
    },
    create: async (poi: POI): Promise<POI> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const pois = await poisApi.getAll();
        const newPoi = { ...poi, id: poi.id || `POI-${Date.now()}` };
        pois.push(newPoi);
        localStorage.setItem(DB_KEYS.POIS, JSON.stringify(pois));
        return newPoi;
      }
      const response = await fetch(`${API_URL}/pois`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(poi),
      });
      return response.json();
    },
    update: async (poi: POI): Promise<POI> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const pois = await poisApi.getAll();
        const index = pois.findIndex((p) => p.id === poi.id);
        if (index !== -1) {
          pois[index] = poi;
          localStorage.setItem(DB_KEYS.POIS, JSON.stringify(pois));
          return poi;
        }
        throw new Error('POI not found');
      }
      const response = await fetch(`${API_URL}/pois/${poi.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(poi),
      });
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const pois = await poisApi.getAll();
        const filtered = pois.filter((p) => p.id !== id);
        localStorage.setItem(DB_KEYS.POIS, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/pois/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  // --- ALERT CONFIGS (local const for self-references) ---
  const alertConfigsApi = {
    getAll: async (): Promise<AlertConfig[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.ALERT_CONFIGS);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/monitoring/alert-configs`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch alert configs: ${response.status}`);
      const rows = await response.json();
      return rows.map((r: any) => ({
        id: r.id,
        tenantId: r.tenant_id,
        name: r.name,
        type: r.type,
        priority: r.priority,
        conditionValue: r.condition_value,
        conditionDuration: r.condition_duration,
        geofenceId: r.geofence_id,
        geofenceName: r.geofence_name,
        geofenceDirection: r.geofence_direction,
        vehicleIds: r.vehicle_ids,
        allVehicles: r.all_vehicles,
        isScheduled: r.is_scheduled,
        scheduleDays: r.schedule_days,
        scheduleTimeStart: r.schedule_time_start,
        scheduleTimeEnd: r.schedule_time_end,
        notifyEmail: r.notify_email,
        notifySms: r.notify_sms,
        notifyPush: r.notify_push,
        notifyWeb: r.notify_web,
        notificationUserIds: r.notification_user_ids,
        customEmails: r.custom_emails,
        customPhones: r.custom_phones,
        isActive: r.is_active,
        status: r.is_active ? 'ACTIVE' : 'INACTIVE',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
    create: async (config: AlertConfig): Promise<AlertConfig> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const configs = await alertConfigsApi.getAll();
        const newConfig = { ...config, id: config.id || `ALT-${Date.now()}` };
        configs.push(newConfig);
        localStorage.setItem(DB_KEYS.ALERT_CONFIGS, JSON.stringify(configs));
        return newConfig;
      }
      const body = {
        name: config.name,
        type: config.type,
        priority: config.priority || 'medium',
        condition_value: config.conditionValue,
        condition_duration: config.conditionDuration,
        geofence_id: config.geofenceId,
        geofence_direction: config.geofenceDirection,
        vehicle_ids: config.vehicleIds,
        all_vehicles: config.allVehicles ?? false,
        is_scheduled: config.isScheduled ?? false,
        schedule_days: config.scheduleDays,
        schedule_time_start: config.scheduleTimeStart,
        schedule_time_end: config.scheduleTimeEnd,
        notify_email: config.notifyEmail ?? false,
        notify_sms: config.notifySms ?? false,
        notify_push: config.notifyPush ?? true,
        notify_web: config.notifyWeb ?? true,
        notification_user_ids: config.notificationUserIds,
        custom_emails: config.customEmails,
        custom_phones: config.customPhones,
        is_active: config.isActive ?? true,
      };
      const response = await fetch(`${API_URL}/monitoring/alert-configs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Failed to create alert config: ${response.status}`);
      const r = await response.json();
      return { ...config, id: r.id, createdAt: r.created_at };
    },
    update: async (config: AlertConfig): Promise<AlertConfig> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const configs = await alertConfigsApi.getAll();
        const index = configs.findIndex((c) => c.id === config.id);
        if (index !== -1) {
          configs[index] = config;
          localStorage.setItem(DB_KEYS.ALERT_CONFIGS, JSON.stringify(configs));
          return config;
        }
        throw new Error('Alert Config not found');
      }
      const body: any = {};
      if (config.name !== undefined) body.name = config.name;
      if (config.type !== undefined) body.type = config.type;
      if (config.priority !== undefined) body.priority = config.priority;
      if (config.conditionValue !== undefined) body.condition_value = config.conditionValue;
      if (config.conditionDuration !== undefined) body.condition_duration = config.conditionDuration;
      if (config.geofenceId !== undefined) body.geofence_id = config.geofenceId;
      if (config.geofenceDirection !== undefined) body.geofence_direction = config.geofenceDirection;
      if (config.vehicleIds !== undefined) body.vehicle_ids = config.vehicleIds;
      if (config.allVehicles !== undefined) body.all_vehicles = config.allVehicles;
      if (config.isScheduled !== undefined) body.is_scheduled = config.isScheduled;
      if (config.scheduleDays !== undefined) body.schedule_days = config.scheduleDays;
      if (config.scheduleTimeStart !== undefined) body.schedule_time_start = config.scheduleTimeStart;
      if (config.scheduleTimeEnd !== undefined) body.schedule_time_end = config.scheduleTimeEnd;
      if (config.notifyEmail !== undefined) body.notify_email = config.notifyEmail;
      if (config.notifySms !== undefined) body.notify_sms = config.notifySms;
      if (config.notifyPush !== undefined) body.notify_push = config.notifyPush;
      if (config.notifyWeb !== undefined) body.notify_web = config.notifyWeb;
      if (config.notificationUserIds !== undefined) body.notification_user_ids = config.notificationUserIds;
      if (config.customEmails !== undefined) body.custom_emails = config.customEmails;
      if (config.customPhones !== undefined) body.custom_phones = config.customPhones;
      if (config.isActive !== undefined) body.is_active = config.isActive;
      const response = await fetch(`${API_URL}/monitoring/alert-configs/${config.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Failed to update alert config: ${response.status}`);
      return config;
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const configs = await alertConfigsApi.getAll();
        const filtered = configs.filter((c) => c.id !== id);
        localStorage.setItem(DB_KEYS.ALERT_CONFIGS, JSON.stringify(filtered));
        return;
      }
      const response = await fetch(`${API_URL}/monitoring/alert-configs/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error(`Failed to delete alert config: ${response.status}`);
    },
  };

  // --- MAINTENANCE RULES (local const for self-references) ---
  const maintenanceRulesApi = {
    getAll: async (): Promise<MaintenanceRule[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.MAINTENANCE_RULES);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/maintenance-rules`, { headers: getHeaders() });
      return response.json();
    },
    create: async (rule: MaintenanceRule): Promise<MaintenanceRule> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const rules = await maintenanceRulesApi.getAll();
        const newRule = { ...rule, id: rule.id || `MNT-${Date.now()}` };
        rules.push(newRule);
        localStorage.setItem(DB_KEYS.MAINTENANCE_RULES, JSON.stringify(rules));
        return newRule;
      }
      const response = await fetch(`${API_URL}/maintenance-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    update: async (rule: MaintenanceRule): Promise<MaintenanceRule> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const rules = await maintenanceRulesApi.getAll();
        const index = rules.findIndex((r) => r.id === rule.id);
        if (index !== -1) {
          rules[index] = rule;
          localStorage.setItem(DB_KEYS.MAINTENANCE_RULES, JSON.stringify(rules));
          return rule;
        }
        throw new Error('Maintenance Rule not found');
      }
      const response = await fetch(`${API_URL}/maintenance-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const rules = await maintenanceRulesApi.getAll();
        const filtered = rules.filter((r) => r.id !== id);
        localStorage.setItem(DB_KEYS.MAINTENANCE_RULES, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/maintenance-rules/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  // --- SCHEDULE RULES (local const for self-references) ---
  const scheduleRulesApi = {
    getAll: async (): Promise<ScheduleRule[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.SCHEDULE_RULES);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/schedule-rules`, { headers: getHeaders() });
      return response.json();
    },
    create: async (rule: ScheduleRule): Promise<ScheduleRule> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const rules = await scheduleRulesApi.getAll();
        const newRule = { ...rule, id: rule.id || `SCH-${Date.now()}` };
        rules.push(newRule);
        localStorage.setItem(DB_KEYS.SCHEDULE_RULES, JSON.stringify(rules));
        return newRule;
      }
      const response = await fetch(`${API_URL}/schedule-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    update: async (rule: ScheduleRule): Promise<ScheduleRule> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const rules = await scheduleRulesApi.getAll();
        const index = rules.findIndex((r) => r.id === rule.id);
        if (index !== -1) {
          rules[index] = rule;
          localStorage.setItem(DB_KEYS.SCHEDULE_RULES, JSON.stringify(rules));
          return rule;
        }
        throw new Error('Schedule Rule not found');
      }
      const response = await fetch(`${API_URL}/schedule-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const rules = await scheduleRulesApi.getAll();
        const filtered = rules.filter((r) => r.id !== id);
        localStorage.setItem(DB_KEYS.SCHEDULE_RULES, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/schedule-rules/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  // --- ECO DRIVING PROFILES (local const for self-references) ---
  const ecoDrivingProfilesApi = {
    getAll: async (): Promise<EcoDrivingProfile[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.ECO_DRIVING_PROFILES);
        return stored ? JSON.parse(stored) : [];
      }
      const response = await fetch(`${API_URL}/eco-driving-profiles`, { headers: getHeaders() });
      return response.json();
    },
    create: async (profile: EcoDrivingProfile): Promise<EcoDrivingProfile> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const profiles = await ecoDrivingProfilesApi.getAll();
        const newProfile = { ...profile, id: profile.id || `ECO-${Date.now()}` };
        profiles.push(newProfile);
        localStorage.setItem(DB_KEYS.ECO_DRIVING_PROFILES, JSON.stringify(profiles));
        return newProfile;
      }
      const response = await fetch(`${API_URL}/eco-driving-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      return response.json();
    },
    update: async (profile: EcoDrivingProfile): Promise<EcoDrivingProfile> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const profiles = await ecoDrivingProfilesApi.getAll();
        const index = profiles.findIndex((p) => p.id === profile.id);
        if (index !== -1) {
          profiles[index] = profile;
          localStorage.setItem(DB_KEYS.ECO_DRIVING_PROFILES, JSON.stringify(profiles));
          return profile;
        }
        throw new Error('Eco Driving Profile not found');
      }
      const response = await fetch(`${API_URL}/eco-driving-profiles/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const profiles = await ecoDrivingProfilesApi.getAll();
        const filtered = profiles.filter((p) => p.id !== id);
        localStorage.setItem(DB_KEYS.ECO_DRIVING_PROFILES, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/eco-driving-profiles/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  // --- ALERTS (local const for self-reference in getAlerts) ---
  const alertsApi = {
    list: async (): Promise<Alert[]> => {
      if (USE_MOCK) return db.get(DB_KEYS.ALERTS, [] as Alert[]);
      try {
        const response = await fetch(`${API_URL}/alerts`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch alerts');
        const rawData = await response.json();
        return rawData.map((a: any) => ({
          id: a.id,
          vehicleId: a.vehicle_id,
          vehicleName: a.vehicle_name,
          clientId: a.client_id || '',
          clientName: a.client_name || '',
          type: a.type,
          severity: a.severity,
          message: a.message,
          isRead: a.is_read,
          comment: a.comment || null,
          treated: a.treated || false,
          treatedAt: a.treated_at || null,
          treatedBy: a.treated_by || null,
          createdAt: a.created_at,
          timestamp: a.created_at, // Alias for frontend compatibility
        }));
      } catch (e) {
        if (!USE_MOCK) throw e;
        return db.get(DB_KEYS.ALERTS, [] as Alert[]);
      }
    },
    getAlerts: async (vehicleId?: string): Promise<Alert[]> => {
      const allAlerts = await alertsApi.list();
      if (vehicleId) {
        return allAlerts.filter((a) => a.vehicleId === vehicleId);
      }
      return allAlerts;
    },
    markAsRead: async (id: string): Promise<void> => {
      const response = await fetch(`${API_URL}/alerts/${id}/read`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to mark alert as read');
    },
    markAllAsRead: async (): Promise<void> => {
      const response = await fetch(`${API_URL}/alerts/read-all`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to mark all alerts as read');
    },
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_URL}/alerts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete alert');
    },
    comment: async (id: string, comment: string): Promise<any> => {
      const response = await fetch(`${API_URL}/alerts/${id}/comment`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ comment }),
      });
      if (!response.ok) throw new Error('Failed to comment alert');
      return response.json();
    },
    treat: async (id: string, treated: boolean = true): Promise<any> => {
      const response = await fetch(`${API_URL}/alerts/${id}/treat`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ treated }),
      });
      if (!response.ok) throw new Error('Failed to treat alert');
      return response.json();
    },
  };

  // --- BRANCHES (local const for self-references) ---
  const branchesApi = {
    getAll: async (): Promise<Branch[]> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const stored = localStorage.getItem(DB_KEYS.BRANCHES);
        if (stored) return JSON.parse(stored);
        return [];
      }
      const response = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
      const raw = await response.json();
      return (Array.isArray(raw) ? raw : []).map((b: any) => ({
        id: b.id,
        name: b.name || b.nom || b.id,
        tenantId: b.tenant_id || b.tenantId || '',
        clientId: b.client_id || b.clientId || '',
        isDefault: b.is_default ?? b.isDefault ?? false,
        createdAt: b.created_at || b.createdAt || '',
        ville: b.ville,
        responsable: b.responsable,
        statut: b.statut,
        email: b.email,
        phone: b.phone,
        description: b.description,
        country: b.country,
      }));
    },
    create: async (branch: Branch): Promise<Branch> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const branches = await branchesApi.getAll();
        const newBranch = { ...branch, id: branch.id || `BR-${Date.now()}` };
        branches.push(newBranch);
        localStorage.setItem(DB_KEYS.BRANCHES, JSON.stringify(branches));
        return newBranch;
      }
      const response = await fetch(`${API_URL}/branches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(branch),
      });
      if (!response.ok) throw new Error('Failed to create branch');
      return response.json();
    },
    update: async (branch: Branch): Promise<Branch> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const branches = await branchesApi.getAll();
        const index = branches.findIndex((b: any) => b.id === branch.id);
        if (index !== -1) {
          branches[index] = branch;
          localStorage.setItem(DB_KEYS.BRANCHES, JSON.stringify(branches));
          return branch;
        }
        throw new Error('Branch not found');
      }
      const response = await fetch(`${API_URL}/branches/${branch.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(branch),
      });
      if (!response.ok) throw new Error('Failed to update branch');
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK) {
        await sleep(NETWORK_DELAY);
        const branches = await branchesApi.getAll();
        const filtered = branches.filter((b: any) => b.id !== id);
        localStorage.setItem(DB_KEYS.BRANCHES, JSON.stringify(filtered));
        return;
      }
      await fetch(`${API_URL}/branches/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
  };

  return {
    // --- VEHICLES (redirected to /api/objects via objectController) ---
    // objectController returns camelCase via mapObjectRow, we map to Vehicle interface
    vehicles: {
      // objectController returns camelCase via mapObjectRow, we map to Vehicle interface
      list: async (tenantId?: string): Promise<Vehicle[]> => {
        if (USE_MOCK) return db.get(DB_KEYS.VEHICLES, [] as Vehicle[]);
        try {
          const response = await fetch(`${API_URL}/objects`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch vehicles');
          const rawObjects = await response.json();

          // LOSSLESS adapter: spread ALL TrackedObject fields, then add Vehicle compat aliases
          return rawObjects.map((v: any) => {
            // Calculate fuel level percentage from liters + tank capacity
            let fuelLevel: number = 0;
            if (v.lastFuelLiters != null && v.tankCapacity && v.tankCapacity > 0) {
              fuelLevel = Math.round((v.lastFuelLiters / v.tankCapacity) * 100);
              fuelLevel = Math.max(0, Math.min(100, fuelLevel));
            }

            return {
              // Spread ALL TrackedObject fields from API (preserves deviceStatus, entryDate, etc.)
              ...v,

              // Parse dates
              lastUpdated: v.lastUpdated
                ? new Date(v.lastUpdated)
                : v.updatedAt
                  ? new Date(v.updatedAt)
                  : v.createdAt
                    ? new Date(v.createdAt)
                    : new Date('2020-01-01'),

              // Vehicle backward-compat aliases
              client: v.clientName || '',
              driver: v.driverName || '',
              speed: v.speed || 0,
              fuelLevel,
              mileage: v.mileage || 0,
              location: v.location || { lat: 0, lng: 0 },
              status: v.status || 'OFFLINE',
              branchId: v.branchId || 'BR-DEFAULT',

              // Default values for Vehicle-only computed fields
              maxSpeed: 0,
              destination: '',
              dailyMileage: v.dailyMileage ?? 0,
              lastTripDistance: v.lastTripDistance ?? 0,
              driverScore: 100,
              nextMaintenance: '',

              // Trip info (computed from trips, not on objects)
              departureLocation: '',
              departureTime: '',
              arrivalTime: '',
              arrivalLocation: '',
              violationsCount: 0,

              // Fuel computed fields
              fuelQuantity: v.lastFuelLiters || 0,
              refuelAmount: 0,
              fuelLoss: 0,
              consumption: v.theoreticalConsumption || 0,
              suspectLoss: 0,

              // Organisation compat
              group: v.groupName || '',
              geofence: '',

              // Identification compat
              licensePlate: v.plate || v.name || '',
              wwPlate: '',
              sim: '',

              // Security compat
              isImmobilized: v.isImmobilized || false,
              isBrokenDown: false,
              immobilized: v.isImmobilized || false,

              // Extended telemetry
              tpms: v.tpms,
              canData: v.canData,
              address: v.address,
              videoEvents: v.videoEvents || [],

              // Form field aliases
              vehicleType: v.vehicleType || v.type || '',
              deviceType: v.deviceModel || '',
              odometer: v.mileage || 0,
              odometerSource: v.odometerSource || 'GPS',
              type: v.vehicleType || v.type || '',
              batteryLevel: v.batteryVoltage,
            } as Vehicle;
          });
        } catch (e) {
          if (!USE_MOCK) throw e;
          return db.get(DB_KEYS.VEHICLES, [] as Vehicle[]);
        }
      },
      update: async (vehicle: Vehicle): Promise<Vehicle> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const vehicles = db.get(DB_KEYS.VEHICLES, [] as Vehicle[]);
          const index = vehicles.findIndex((v) => v.id === vehicle.id);
          if (index !== -1) {
            vehicles[index] = { ...vehicle, lastUpdated: new Date() };
            db.save(DB_KEYS.VEHICLES, vehicles);
            return vehicles[index];
          }
          throw new Error('Vehicle not found');
        }
        const response = await fetch(`${API_URL}/objects/${vehicle.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: getHeaders(),
          body: JSON.stringify({
            ...vehicle,
            vehicleType: vehicle.vehicleType || vehicle.type,
            deviceModel: vehicle.deviceModel || vehicle.deviceType,
          }),
        });
        if (!response.ok) {
          let detail = '';
          try {
            const errBody = await response.json();
            if (errBody?.errors && typeof errBody.errors === 'object') {
              detail = Object.entries(errBody.errors)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                .join(' · ');
            } else if (errBody?.message) {
              detail = errBody.message;
            }
          } catch {
            /* ignore */
          }
          throw new Error(
            detail ? `Validation serveur : ${detail}` : `Failed to update vehicle (HTTP ${response.status})`
          );
        }
        const rawData = await response.json();
        return {
          ...vehicle,
          id: rawData.id || vehicle.id,
          lastUpdated: rawData.updatedAt ? new Date(rawData.updatedAt) : new Date(),
        };
      },
      create: async (vehicle: Vehicle): Promise<Vehicle> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const vehicles = db.get(DB_KEYS.VEHICLES, [] as Vehicle[]);
          const newVehicle = {
            ...vehicle,
            id: `ABO-${Date.now().toString(36).toUpperCase().slice(-6)}`,
            lastUpdated: new Date(),
          };
          vehicles.push(newVehicle);
          db.save(DB_KEYS.VEHICLES, vehicles);
          return newVehicle;
        }
        const response = await fetch(`${API_URL}/objects`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            ...vehicle,
            vehicleType: vehicle.vehicleType || vehicle.type,
            deviceModel: vehicle.deviceModel || vehicle.deviceType,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to create vehicle');
        }
        const rawData = await response.json();
        // Fusionner les données frontend avec les valeurs réelles retournées par le backend
        return {
          ...vehicle,
          id: rawData.id,
          plate: rawData.plate ?? vehicle.plate,
          licensePlate: rawData.plate ?? vehicle.licensePlate,
          imei: rawData.imei ?? vehicle.imei,
          name: rawData.name ?? vehicle.name,
          clientId: rawData.client_id ?? rawData.clientId ?? vehicle.clientId,
          groupId: rawData.group_id ?? rawData.groupId ?? vehicle.groupId,
          branchId: rawData.branch_id ?? rawData.branchId ?? vehicle.branchId,
          resellerId: rawData.reseller_id ?? rawData.resellerId ?? vehicle.resellerId,
          deviceType: rawData.device_model ?? rawData.deviceType ?? vehicle.deviceType,
          lastUpdated: new Date(),
        };
      },
      getHistory: async (vehicleId: string, date: Date): Promise<VehiclePositionHistory[]> => {
        if (USE_MOCK) {
          const allHistory = db.get(DB_KEYS.POSITION_HISTORY, []) as VehiclePositionHistory[];
          return allHistory
            .filter((h) => h.vehicleId === vehicleId && new Date(h.timestamp).toDateString() === date.toDateString())
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }
        const dateStr = date.toISOString().split('T')[0];
        const response = await fetch(`${API_URL}/objects/${vehicleId}/history/snapped?date=${dateStr}`, {
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch vehicle history');
        return response.json();
      },
      getStats: async (
        vehicleId: string,
        opts?: { period?: 'today' | 'week' | 'month'; start?: string; end?: string }
      ): Promise<{
        movingMs: number;
        idleMs: number;
        stoppedMs: number;
        offlineMs: number;
        totalDistance: number;
        statusDurationMs: number;
        offlineGaps: number;
        maxSpeed: number;
        avgSpeed: number;
        periodStart: string;
        periodEnd: string;
        computedAt: string;
      }> => {
        const qs = new URLSearchParams();
        if (opts?.period) qs.set('period', opts.period);
        if (opts?.start) qs.set('start', opts.start);
        if (opts?.end) qs.set('end', opts.end);
        const url = `${API_URL}/fleet/vehicles/${vehicleId}/stats${qs.toString() ? `?${qs}` : ''}`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error(`Failed to fetch vehicle stats (HTTP ${response.status})`);
        return response.json();
      },
      logPosition: async (history: VehiclePositionHistory): Promise<void> => {
        if (USE_MOCK) {
          const allHistory = db.get(DB_KEYS.POSITION_HISTORY, []) as VehiclePositionHistory[];
          allHistory.push(history);
          db.set(DB_KEYS.POSITION_HISTORY, allHistory);
          return;
        }
        // Positions are logged server-side via GPS pipeline — no frontend POST needed
      },
      toggleImmobilization: async (vehicleId: string, immobilize: boolean): Promise<void> => {
        if (USE_MOCK) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const vehicles = db.get(DB_KEYS.VEHICLES, [] as Vehicle[]) as Vehicle[];
          const updatedVehicles = vehicles.map((v) => (v.id === vehicleId ? { ...v, isImmobilized: immobilize } : v));
          db.set(DB_KEYS.VEHICLES, updatedVehicles);
          return;
        }
        const response = await fetch(`${API_URL}/objects/${vehicleId}/immobilize`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ immobilize }),
        });
        if (!response.ok) throw new Error('Failed to toggle immobilization');
      },
    },

    // --- TRACKED OBJECTS (unified Vehicle + Device BOX) ---
    objects: {
      list: async (): Promise<TrackedObject[]> => {
        if (USE_MOCK) return db.get(DB_KEYS.VEHICLES, [] as any[]);
        const response = await fetch(`${API_URL}/objects`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch objects');
        return response.json();
      },
      getById: async (id: string): Promise<TrackedObject> => {
        if (USE_MOCK) {
          const all = db.get(DB_KEYS.VEHICLES, [] as any[]);
          const found = all.find((o: any) => o.id === id);
          if (!found) throw new Error('Object not found');
          return found;
        }
        const response = await fetch(`${API_URL}/objects/${id}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch object');
        return response.json();
      },
      create: async (data: Partial<TrackedObject>): Promise<TrackedObject> => {
        if (USE_MOCK) {
          const all = db.get(DB_KEYS.VEHICLES, [] as any[]);
          const obj = {
            ...data,
            id: `ABO-${Date.now().toString(36).toUpperCase().slice(-6)}`,
            createdAt: new Date().toISOString(),
          };
          all.push(obj);
          db.save(DB_KEYS.VEHICLES, all);
          return obj as TrackedObject;
        }
        const response = await fetch(`${API_URL}/objects`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to create object');
        }
        return response.json();
      },
      update: async (id: string, data: Partial<TrackedObject>): Promise<TrackedObject> => {
        if (USE_MOCK) {
          const all = db.get(DB_KEYS.VEHICLES, [] as any[]);
          const idx = all.findIndex((o: any) => o.id === id);
          if (idx !== -1) {
            all[idx] = { ...all[idx], ...data };
            db.save(DB_KEYS.VEHICLES, all);
            return all[idx];
          }
          throw new Error('Object not found');
        }
        const response = await fetch(`${API_URL}/objects/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update object');
        return response.json();
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          const all = db.get(DB_KEYS.VEHICLES, [] as any[]);
          db.save(
            DB_KEYS.VEHICLES,
            all.filter((o: any) => o.id !== id)
          );
          return;
        }
        const response = await fetch(`${API_URL}/objects/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to delete object');
      },
      getStats: async (): Promise<any> => {
        if (USE_MOCK) return { totalVehicles: 0, online: 0, offline: 0, moving: 0 };
        const response = await fetch(`${API_URL}/objects/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
      },
      toggleImmobilization: async (id: string, immobilize: boolean): Promise<void> => {
        if (USE_MOCK) return;
        const response = await fetch(`${API_URL}/objects/${id}/immobilize`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ immobilize }),
        });
        if (!response.ok) throw new Error('Failed to toggle immobilization');
      },
      getHistory: async (id: string, date: Date): Promise<any[]> => {
        if (USE_MOCK) return [];
        const dateStr = date.toISOString().split('T')[0];
        const response = await fetch(`${API_URL}/objects/${id}/history/snapped?date=${dateStr}`, {
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json();
      },
      getFuelHistory: async (id: string, duration?: string): Promise<any[]> => {
        if (USE_MOCK) return [];
        const response = await fetch(`${API_URL}/objects/${id}/fuel/history?duration=${duration || '24h'}`, {
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch fuel history');
        return response.json();
      },
      getFuelStats: async (id: string): Promise<any> => {
        if (USE_MOCK) return {};
        const response = await fetch(`${API_URL}/objects/${id}/fuel/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch fuel stats');
        return response.json();
      },
      getAlerts: async (id: string): Promise<any[]> => {
        if (USE_MOCK) return [];
        const response = await fetch(`${API_URL}/objects/${id}/alerts`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch alerts');
        return response.json();
      },
    },

    // --- FUEL ---
    fuel: {
      list: async (vehicleId?: string): Promise<FuelRecord[]> => {
        if (USE_MOCK) {
          const allRecords = db.get(DB_KEYS.FUEL_RECORDS, []) as FuelRecord[];
          if (vehicleId) {
            return allRecords
              .filter((r) => r.vehicleId === vehicleId)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
          return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const url = vehicleId ? `${API_URL}/objects/${vehicleId}/fuel/history` : `${API_URL}/objects/fuel`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch fuel records');
        return response.json();
      },
      add: async (record: FuelRecord): Promise<FuelRecord> => {
        if (USE_MOCK) {
          const allRecords = db.get(DB_KEYS.FUEL_RECORDS, []) as FuelRecord[];
          const newRecord = { ...record, id: `FUEL-${Date.now()}` };
          allRecords.push(newRecord);
          db.set(DB_KEYS.FUEL_RECORDS, allRecords);
          return newRecord;
        }
        const response = await fetch(`${API_URL}/objects/${record.vehicleId}/fuel`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(record),
        });
        if (!response.ok) throw new Error('Failed to add fuel record');
        return response.json();
      },
      getHistory: async (vehicleId: string, duration: '24h' | '7d' | '30d' = '24h') => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          // Mock data generation based on duration
          const points = duration === '24h' ? 24 : duration === '7d' ? 7 : 30;
          const history = [];
          let level = 80;
          const now = new Date();

          for (let i = 0; i < points; i++) {
            const date = new Date(now);
            if (duration === '24h') date.setHours(now.getHours() - (points - i));
            else date.setDate(now.getDate() - (points - i));

            // Simulate consumption and occasional refill
            if (Math.random() > 0.9)
              level = Math.min(100, level + 40); // Refill
            else level = Math.max(0, level - Math.random() * 5); // Consumption

            history.push({
              date: date.toISOString(),
              level: Math.round(level),
              volume: Math.round(level * 5), // Assuming 500L tank
              consumption: Math.random() * 10, // L/100km instant
            });
          }
          return history;
        }
        // Real Backend Call
        const response = await fetch(`${API_URL}/objects/${vehicleId}/fuel/history?duration=${duration}`, {
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch fuel history');
        return response.json();
      },

      getStats: async (vehicleId: string) => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return {
            avgConsumption: 28.5, // L/100km
            totalCost: 1450, // Currency
            refillCount: 4,
            theftCount: 0,
            idlingWaste: 45, // Liters wasted
          };
        }
        const response = await fetch(`${API_URL}/objects/${vehicleId}/fuel/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch fuel stats');
        return response.json();
      },
    },

    // --- FUEL EVENTS (détection automatique REFILL / THEFT / etc) ---
    // Phase 4 chantier carburant — endpoint backend /api/v1/fuel-events
    fuelEvents: {
      listByVehicle: async (
        vehicleId: string,
        opts: { limit?: number; status?: FuelEventStatus | 'ALL' } = {}
      ): Promise<FuelEvent[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return [];
        }
        const params = new URLSearchParams();
        if (opts.limit) params.set('limit', String(opts.limit));
        if (opts.status) params.set('status', opts.status);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/fuel-events/vehicle/${vehicleId}${qs}`, {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch fuel events');
        const payload = await response.json();
        return payload.data || [];
      },

      list: async (
        opts: {
          status?: FuelEventStatus | 'ALL';
          type?: 'REFILL' | 'THEFT' | 'CONSUMPTION' | 'ANOMALY';
          severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          from?: string;
          to?: string;
          limit?: number;
          offset?: number;
        } = {}
      ): Promise<{ data: FuelEvent[]; total: number; limit: number; offset: number }> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { data: [], total: 0, limit: opts.limit ?? 100, offset: opts.offset ?? 0 };
        }
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.type) params.set('type', opts.type);
        if (opts.severity) params.set('severity', opts.severity);
        if (opts.from) params.set('from', opts.from);
        if (opts.to) params.set('to', opts.to);
        if (opts.limit) params.set('limit', String(opts.limit));
        if (opts.offset) params.set('offset', String(opts.offset));
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/fuel-events${qs}`, {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch fuel events');
        return response.json();
      },

      review: async (
        eventId: string,
        status: 'CONFIRMED' | 'DISMISSED' | 'DISPUTED',
        notes?: string
      ): Promise<FuelEvent> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { id: eventId, status } as unknown as FuelEvent;
        }
        const response = await fetch(`${API_URL}/fuel-events/${eventId}/review`, {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(),
          body: JSON.stringify({ status, notes }),
        });
        if (!response.ok) {
          let msg = `Failed to review fuel event (HTTP ${response.status})`;
          try {
            const err = await response.json();
            if (err?.message) msg = `Validation serveur : ${err.message}`;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        return response.json();
      },

      getSummary: async (days = 30): Promise<{ data: any[]; window_days: number }> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { data: [], window_days: days };
        }
        const response = await fetch(`${API_URL}/fuel-events/stats/summary?days=${days}`, {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch fuel events summary');
        return response.json();
      },
    },

    // --- POSITION ANOMALIES (détection auto anti-spoofing) ---
    // Phase 1 chantier GPS Geoloc 360° — endpoint /api/v1/position-anomalies
    positionAnomalies: {
      listByVehicle: async (
        vehicleId: string,
        opts: { limit?: number; status?: PositionAnomalyStatus | 'ALL' } = {}
      ): Promise<PositionAnomaly[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return [];
        }
        const params = new URLSearchParams();
        if (opts.limit) params.set('limit', String(opts.limit));
        if (opts.status) params.set('status', opts.status);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/position-anomalies/vehicle/${vehicleId}${qs}`, {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch position anomalies');
        const payload = await response.json();
        return payload.data || [];
      },

      list: async (
        opts: {
          status?: PositionAnomalyStatus | 'ALL';
          type?: PositionAnomalyType;
          severity?: PositionAnomalySeverity;
          from?: string;
          to?: string;
          limit?: number;
          offset?: number;
        } = {}
      ): Promise<{ data: PositionAnomaly[]; total: number; limit: number; offset: number }> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { data: [], total: 0, limit: opts.limit ?? 100, offset: opts.offset ?? 0 };
        }
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.type) params.set('type', opts.type);
        if (opts.severity) params.set('severity', opts.severity);
        if (opts.from) params.set('from', opts.from);
        if (opts.to) params.set('to', opts.to);
        if (opts.limit) params.set('limit', String(opts.limit));
        if (opts.offset) params.set('offset', String(opts.offset));
        const qs = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}/position-anomalies${qs}`, {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch position anomalies');
        return response.json();
      },

      review: async (
        anomalyId: string,
        status: 'CONFIRMED' | 'DISMISSED',
        notes?: string
      ): Promise<PositionAnomaly> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { id: anomalyId, status } as unknown as PositionAnomaly;
        }
        const response = await fetch(`${API_URL}/position-anomalies/${anomalyId}/review`, {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(),
          body: JSON.stringify({ status, notes }),
        });
        if (!response.ok) {
          let detail = '';
          try {
            const err = await response.json();
            if (err?.message) detail = err.message;
          } catch {
            /* ignore */
          }
          throw new Error(
            detail ? `Validation serveur : ${detail}` : `Failed to review position anomaly (HTTP ${response.status})`
          );
        }
        return response.json();
      },

      getSummary: async (days = 30): Promise<{ data: any[]; window_days: number }> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { data: [], window_days: days };
        }
        const response = await fetch(`${API_URL}/position-anomalies/stats/summary?days=${days}`, {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch position anomalies summary');
        return response.json();
      },
    },

    // --- MAINTENANCE ---
    maintenance: {
      list: async (vehicleId?: string): Promise<MaintenanceRecord[]> => {
        if (USE_MOCK) {
          const allRecords = db.get(DB_KEYS.MAINTENANCE_RECORDS, []) as MaintenanceRecord[];
          if (vehicleId) {
            return allRecords
              .filter((r) => r.vehicleId === vehicleId)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
          return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const url = vehicleId ? `${API_URL}/objects/${vehicleId}/maintenance` : `${API_URL}/objects/maintenance`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch maintenance records');
        return response.json();
      },
      add: async (record: MaintenanceRecord): Promise<MaintenanceRecord> => {
        if (USE_MOCK) {
          const allRecords = db.get(DB_KEYS.MAINTENANCE_RECORDS, []) as MaintenanceRecord[];
          const newRecord = { ...record, id: `MAINT-${Date.now()}` };
          allRecords.push(newRecord);
          db.set(DB_KEYS.MAINTENANCE_RECORDS, allRecords);
          return newRecord;
        }
        const response = await fetch(`${API_URL}/objects/${record.vehicleId}/maintenance`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(record),
        });
        if (!response.ok) throw new Error('Failed to add maintenance record');
        return response.json();
      },
    },

    // --- ALERTS ---
    alerts: alertsApi,

    // --- ZONES (geofences) ---
    // Branché sur le backend /monitoring/geofences.
    // Le backend stocke `coordinates` en JSONB :
    //   - CIRCLE : { center:{lat,lng}, radius }
    //   - POLYGON/ROUTE : Array<{lat,lng}>
    // On remappe vers la shape front `Zone` (center/radius pour CIRCLE,
    // coordinates[] pour POLYGON).
    zones: {
      list: async (): Promise<Zone[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.ZONES, [] as Zone[]);
        }
        const response = await fetch(`${API_URL}/monitoring/geofences`, { headers: getHeaders() });
        if (!response.ok) {
          handleAuthError(response);
          throw new Error(`Failed to fetch zones: ${response.status}`);
        }
        const rows = await response.json();
        return (Array.isArray(rows) ? rows : []).map((g: any): Zone => {
          const type = g.type === 'CIRCLE' ? 'CIRCLE' : 'POLYGON';
          const coords = g.coordinates ?? {};
          const center = type === 'CIRCLE' && coords.center ? coords.center : undefined;
          const radius = type === 'CIRCLE' && typeof coords.radius === 'number' ? coords.radius : undefined;
          const polygonPoints = type === 'POLYGON' && Array.isArray(g.coordinates) ? g.coordinates : undefined;
          return {
            id: g.id,
            name: g.name,
            type,
            center,
            radius,
            coordinates: polygonPoints,
            color: g.color || '#3B82F6',
            category: (g.category as Zone['category']) || 'CLIENT',
          };
        });
      },
    },

    // --- DRIVERS ---
    drivers: driversApi,

    // --- GROUPS ---
    groups: groupsApi,

    // --- COMMANDS ---
    commands: commandsApi,

    // --- POIS ---
    pois: poisApi,

    // --- ALERT CONFIGS ---
    alertConfigs: alertConfigsApi,

    // --- MAINTENANCE RULES ---
    maintenanceRules: maintenanceRulesApi,

    // --- SCHEDULE RULES ---
    scheduleRules: scheduleRulesApi,

    // --- ECO DRIVING PROFILES ---
    ecoDrivingProfiles: ecoDrivingProfilesApi,

    // --- BRANCHES ---
    branches: branchesApi,

    // --- FLEET (REAL API) ---
    fleetApi: {
      getExportExcelUrl: () => `${API_URL}/fleet/reports/fleet/excel`,
      getStats: async () => {
        const response = await fetch(`${API_URL}/fleet/stats`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch fleet stats');
        return response.json();
      },
      getVehicleHistory: async (vehicleId: string, date?: string) => {
        let url = `${API_URL}/fleet/vehicles/${vehicleId}/history/snapped`;
        if (date) url += `?date=${date}`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch vehicle history');
        return response.json();
      },
      getTrips: async (vehicleId: string, startDate?: string, endDate?: string) => {
        let url = `${API_URL}/fleet/vehicles/${vehicleId}/trips?`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}`;
        const response = await fetch(url, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch trips');
        return response.json();
      },
      getTripDetails: async (tripId: string) => {
        const response = await fetch(`${API_URL}/fleet/trips/${tripId}`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch trip details');
        return response.json();
      },
      getSensors: async (vehicleId: string) => {
        const response = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/sensors`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch sensors');
        return response.json();
      },
      analyzeTrips: async (vehicleId: string, date: string) => {
        const response = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/analyze?date=${date}`, {
          method: 'POST',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to analyze trips');
        return response.json();
      },
      getDeviceHistory: async (vehicleId: string) => {
        const response = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/device-history`, {
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch device history');
        return response.json();
      },
    },
  };
}
