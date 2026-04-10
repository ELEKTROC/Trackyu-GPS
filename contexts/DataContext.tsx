import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Vehicle, Client, Lead, LeadStatus, VehicleStatus, DeviceStock, Intervention, Zone, SystemUser, Contract, Invoice, Quote, Ticket, Alert, Branch, CatalogItem, JournalEntry, Payment, SupplierInvoice, BankTransaction, Budget, Supplier, StockMovement, VehiclePositionHistory, FuelRecord, MaintenanceRecord, Tier, Anomaly, UserActivity, Driver, Tech, Group, Command, POI, AlertConfig, MaintenanceRule, ScheduleRule, EcoDrivingProfile, Task, AutomationRule, TicketCategory, TicketSubCategory } from '../types';
import { useAuth } from './AuthContext';
import { initSocket, getSocket } from '../services/socket';
import { PRODUCT_CATALOG } from '../constants';

import { api } from '../services/apiLazy';
import { logger } from '../utils/logger';

// Socket event payload types
interface VehicleUpdatePayload {
    id: string;
    location?: { lat: number; lng: number };
    lastUpdated: string;
    [key: string]: unknown;
}

interface AlertPayload {
    id: number;
    vehicle_id: string;
    vehicle_name?: string;
    type: string;
    severity: string;
    message: string;
    created_at: string;
}

interface DataContextType {
    vehicles: Vehicle[];
    zones: Zone[];
    clients: Client[];
    tiers: Tier[]; // Added
    alerts: Alert[];
    leads: Lead[];
    stock: DeviceStock[];
    interventions: Intervention[];
    users: SystemUser[];
    contracts: Contract[];
    invoices: Invoice[];
    quotes: Quote[];
    tickets: Ticket[];
    branches: Branch[];
    catalogItems: CatalogItem[]; // Added
    journalEntries: JournalEntry[]; // Added
    payments: Payment[]; // Added
    supplierInvoices: SupplierInvoice[]; // Added
    bankTransactions: BankTransaction[]; // Added
    budgets: Budget[]; // Added
    suppliers: Supplier[]; // Added
    stockMovements: StockMovement[]; // Added
    fuelRecords: FuelRecord[]; // Added
    maintenanceRecords: MaintenanceRecord[]; // Added
    anomalies: Anomaly[]; // Added
    userActivity: UserActivity[]; // Added
    drivers: Driver[]; // Added
    techs: Tech[]; // Added
    groups: Group[]; // Added
    commands: Command[]; // Added
    pois: POI[]; // Added
    alertConfigs: AlertConfig[]; // Added
    maintenanceRules: MaintenanceRule[]; // Added
    scheduleRules: ScheduleRule[]; // Added
    ecoDrivingProfiles: EcoDrivingProfile[]; // Added
    tasks: Task[]; // Added
    automationRules: AutomationRule[]; // Added

    // Support Settings
    ticketCategories: TicketCategory[];
    ticketSubcategories: TicketSubCategory[];
    slaConfig: Record<string, unknown>;

    // Actions
    addClient: (client: Client, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => void;
    updateClient: (client: Client) => void;
    deleteClient: (id: string) => void;
    bulkUpdateClientStatus: (ids: string[], status: 'ACTIVE' | 'SUSPENDED' | 'CHURNED') => void;

    // Tier Actions
    addTier: (tier: Tier) => void;
    updateTier: (tier: Tier) => void;
    deleteTier: (id: string) => void;

    markAlertAsRead: (id: string) => void;
    addAlertComment: (id: string, comment: string) => void;

    addVehicle: (vehicle: Vehicle, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => void;
    updateVehicle: (vehicle: Vehicle, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => void;
    addLead: (lead: Lead, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => void;
    updateLead: (lead: Lead, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => void;
    updateLeadStatus: (id: string, status: LeadStatus) => void;
    deleteLead: (id: string) => void;

    // Stock Actions
    addDevice: (device: DeviceStock) => void;
    updateDevice: (device: DeviceStock) => void;
    deleteDevice: (id: string) => void;

    updateIntervention: (intervention: Intervention) => void;
    addIntervention: (intervention: Intervention) => void;
    deleteIntervention: (id: string) => void;

    // Contract Actions
    addContract: (contract: Contract) => void;
    updateContract: (contract: Contract) => Promise<Contract>;
    deleteContract: (id: string) => void;

    addInvoice: (invoice: Invoice) => void;
    updateInvoice: (invoice: Invoice) => void;
    deleteInvoice: (id: string) => void;
    addQuote: (quote: Quote) => void;
    updateQuote: (quote: Quote) => void;
    deleteQuote: (id: string) => void;

    addTicket: (ticket: Ticket) => Promise<Ticket>;
    updateTicket: (ticket: Ticket) => void;
    deleteTicket: (id: string) => void;

    // Users Actions
    addUser: (user: SystemUser) => Promise<SystemUser>;
    updateUser: (user: SystemUser) => void;
    deleteUser: (id: string) => void;

    // Branch Actions
    addBranch: (branch: Branch) => void;
    updateBranch: (branch: Branch) => void;
    deleteBranch: (id: string) => void;

    // Group Actions
    addGroup: (group: Group) => void;
    updateGroup: (group: Group) => void;
    deleteGroup: (id: string) => void;

    // Task Actions
    addTask: (task: Task) => Promise<Task>;
    updateTask: (task: Task) => Promise<Task>;
    deleteTask: (id: string) => void;

    // Automation Actions
    addAutomationRule: (rule: Partial<AutomationRule>) => void;
    updateAutomationRule: (id: string, rule: Partial<AutomationRule>) => void;
    toggleAutomationRule: (id: string) => void;
    deleteAutomationRule: (id: string) => void;

    // POI Actions
    addPOI: (poi: POI) => void;
    updatePOI: (poi: POI) => void;
    deletePOI: (id: string) => void;

    // Alert Config Actions
    addAlertConfig: (config: AlertConfig) => void;
    updateAlertConfig: (config: AlertConfig) => void;
    deleteAlertConfig: (id: string) => void;

    // Maintenance Rule Actions
    addMaintenanceRule: (rule: MaintenanceRule) => void;
    updateMaintenanceRule: (rule: MaintenanceRule) => void;
    deleteMaintenanceRule: (id: string) => void;

    // Schedule Rule Actions
    addScheduleRule: (rule: ScheduleRule) => void;
    updateScheduleRule: (rule: ScheduleRule) => void;
    deleteScheduleRule: (id: string) => void;

    // Eco Driving Profile Actions
    addEcoDrivingProfile: (profile: EcoDrivingProfile) => void;
    updateEcoDrivingProfile: (profile: EcoDrivingProfile) => void;
    deleteEcoDrivingProfile: (id: string) => void;

    // Catalog Actions
    addCatalogItem: (item: CatalogItem) => void;
    updateCatalogItem: (item: CatalogItem) => void;
    deleteCatalogItem: (id: string) => void;

    // Stock Movement Actions
    addStockMovement: (movement: StockMovement) => void;

    // Accounting Actions
    addJournalEntry: (entry: JournalEntry) => void;
    createGroupedJournalEntry: (payload: { date: string; description: string; reference?: string; journalCode?: string; lines: Array<{ account_code: string; debit: number; credit: number; description?: string }> }) => Promise<void>;

    // Driver Actions
    addDriver: (driver: Driver) => void;
    updateDriver: (driver: Driver) => void;
    deleteDriver: (id: string) => void;

    // Tech Actions
    addTech: (tech: Tech) => void;
    updateTech: (tech: Tech) => void;
    deleteTech: (id: string) => void;

    addPayment: (payment: Payment) => void;
    addBudget: (budget: Budget) => void; // Added
    updateBudget: (budget: Budget) => void; // Added
    deleteBudget: (id: string) => void; // Added

    addSupplierInvoice: (invoice: SupplierInvoice) => void;
    updateSupplierInvoice: (invoice: SupplierInvoice) => void;
    deleteSupplierInvoice: (id: string) => void;

    addBankTransaction: (tx: BankTransaction) => void;
    updateBankTransaction: (tx: BankTransaction) => void;
    deleteBankTransaction: (id: string) => void;

    // Supplier Actions
    addSupplier: (supplier: Supplier) => void;
    updateSupplier: (supplier: Supplier) => void;
    deleteSupplier: (id: string) => void;

    // Command Actions
    addCommand: (command: Command) => void;
    updateCommand: (command: Command) => void;
    deleteCommand: (id: string) => void;

    getVehicleHistory: (vehicleId: string, date: Date) => Promise<VehiclePositionHistory[]>;
    getVehicleHistorySnapped: (vehicleId: string, date: Date) => Promise<VehiclePositionHistory[]>;

    // Fuel & Maintenance
    getFuelRecords: (vehicleId: string) => Promise<FuelRecord[]>;
    addFuelRecord: (record: FuelRecord) => void;
    getMaintenanceRecords: (vehicleId: string) => Promise<MaintenanceRecord[]>;
    addMaintenanceRecord: (record: MaintenanceRecord) => void;

    getVehicleAlerts: (vehicleId: string) => Promise<Alert[]>;

    // Security
    toggleImmobilization: (vehicleId: string, immobilize: boolean) => void;

    // Fuel Actions
    getFuelHistory: (vehicleId: string, duration?: '24h' | '7d' | '30d') => Promise<any[]>;
    getFuelStats: (vehicleId: string) => Promise<any>;

    // Refresh All Data (for Pull-to-Refresh)
    refreshData: () => Promise<void>;

    // Socket connectivity
    isSocketConnected: boolean;
    isDataStale: boolean; // true when socket was disconnected > 2 min

    // Initial loading state (true while critical queries are fetching for the first time)
    isLoading: boolean;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const tenantId = user?.tenantId;
    const resellerId = user?.resellerId;

    // --- SOCKET CONNECTIVITY STATE ---
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null);
    // isDataStale: socket was down for more than 2 minutes
    const isDataStale = !isSocketConnected && disconnectedSince != null
        && (Date.now() - disconnectedSince) > 2 * 60 * 1000;

    // --- REAL-TIME SOCKET CONNECTION ---
    useEffect(() => {
        // Only connect to socket if user is authenticated
        if (!user) return;

        const socket = initSocket();

        socket.on('connect', () => {
            logger.debug('Connected to WebSocket');
            setIsSocketConnected(true);
            setDisconnectedSince(null);
            if (tenantId) {
                socket.emit('join:tenant', tenantId);
            } else if (user?.role === 'SUPER_ADMIN' || user?.role === 'SUPERADMIN') {
                socket.emit('join:superadmin');
            }
            // Force-refresh live vehicle data after reconnection to fill the gap
            queryClient.invalidateQueries({ queryKey: ['vehicles', tenantId] });
        });

        socket.on('disconnect', () => {
            logger.warn('[Socket] Disconnected from WebSocket');
            setIsSocketConnected(false);
            setDisconnectedSince(Date.now());
        });

        socket.on('connect_error', () => {
            setIsSocketConnected(false);
            if (disconnectedSince == null) setDisconnectedSince(Date.now());
        });

        socket.on('vehicle:update', (update: VehicleUpdatePayload) => {
            logger.debug('Vehicle Update Received:', update);
            queryClient.setQueryData(['vehicles', tenantId], (oldVehicles: Vehicle[] = []) => {
                if (!oldVehicles) return [];
                return oldVehicles.map(v => {
                    if (v.id === update.id) {
                        return {
                            ...v,
                            ...update,
                            location: update.location || v.location,
                            lastUpdated: new Date(update.lastUpdated)
                        };
                    }
                    return v;
                });
            });
        });

        socket.on('alert:new', (newAlert: AlertPayload) => {
            logger.debug('New Alert Received:', newAlert);
            queryClient.setQueryData(['alerts', tenantId], (oldAlerts: Alert[] = []) => {
                const mappedAlert: Alert = {
                    id: String(newAlert.id),
                    vehicleId: newAlert.vehicle_id,
                    vehicleName: newAlert.vehicle_name,
                    type: newAlert.type as any,
                    severity: newAlert.severity as any,
                    message: newAlert.message,
                    isRead: false,
                    createdAt: new Date(newAlert.created_at).toISOString()
                };
                return [mappedAlert, ...oldAlerts];
            });
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('vehicle:update');
            socket.off('alert:new');
            socket.disconnect();
        };
    }, [tenantId, queryClient, user]);

    // --- DEFERRED QUERIES: Load non-essential data after core to reduce startup load ---
    // Core queries (vehicles, clients, users, alerts, etc.) fire immediately on auth
    // Module queries (invoices, journal, budgets, etc.) fire 3s after login
    const [deferredEnabled, setDeferredEnabled] = useState(false);
    useEffect(() => {
        if (!user) { setDeferredEnabled(false); return; }
        const timer = setTimeout(() => setDeferredEnabled(true), 3000);
        return () => clearTimeout(timer);
    }, [user]);

    // --- QUERIES ---
    // All queries are disabled until user is authenticated to prevent 401 errors
    const { data: rawVehicles = [], isLoading: loadingVehicles } = useQuery({
        queryKey: ['vehicles', tenantId],
        queryFn: async () => {
            const data = await api.vehicles.list(tenantId);
            return data.map(v => ({ ...v, lastUpdated: new Date(v.lastUpdated) }));
        },
        enabled: !!user
    });

    const { data: zones = [], isLoading: loadingZones } = useQuery({
        queryKey: ['zones'],
        queryFn: api.zones.list,
        enabled: !!user
    });

    const { data: rawClients = [], isLoading: loadingClients } = useQuery({
        queryKey: ['clients', tenantId],
        queryFn: async () => {
            const data = await api.clients.list(tenantId);
            return data.map(c => ({ ...c, createdAt: new Date(c.createdAt) }));
        },
        enabled: !!user
    });

    const { data: rawAlerts = [], isLoading: loadingAlerts } = useQuery({
        queryKey: ['alerts', tenantId],
        queryFn: async () => {
            const data = await api.alerts.list();
            return data.map(a => ({ ...a, createdAt: new Date(a.createdAt) }));
        },
        enabled: !!user
    });

    const { data: rawLeads = [], isLoading: loadingLeads } = useQuery({
        queryKey: ['leads', tenantId],
        queryFn: async () => {
            const data = await api.leads.list(tenantId);
            return data.map(l => ({ ...l, createdAt: new Date(l.createdAt) }));
        },
        enabled: !!user
    });

    const { data: rawTasks = [], isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks', tenantId],
        queryFn: () => api.crm.getTasks(),
        enabled: !!user && deferredEnabled
    });

    // --- SUPPORT SETTINGS QUERIES ---
    const { data: ticketCategories = [] } = useQuery<TicketCategory[]>({
        queryKey: ['ticketCategories'],
        // @ts-ignore
        queryFn: () => api.adminFeatures.supportSettings.getCategories(true).then((res: unknown) => (res as TicketCategory[]) || []),
        enabled: !!user && (!!tenantId || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN') && deferredEnabled
    });

    const { data: ticketSubcategories = [] } = useQuery<TicketSubCategory[]>({
        queryKey: ['ticketSubcategories'],
        // @ts-ignore
        queryFn: () => api.adminFeatures.supportSettings.getSubCategories(undefined, true).then((res: unknown) => (res as TicketSubCategory[]) || []),
        enabled: !!user && (!!tenantId || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN') && deferredEnabled
    });

    const { data: slaConfig = {} } = useQuery<Record<string, unknown>>({
        queryKey: ['slaConfig', tenantId],
        // @ts-ignore
        queryFn: () => api.adminFeatures.supportSettings.getSlaConfig().then((res: unknown) => (res as Record<string, unknown>) || {}),
        enabled: !!user && (!!tenantId || user.role === 'SUPERADMIN' || user.role === 'SUPER_ADMIN') && deferredEnabled
    });

    const { data: rawAutomationRules = [], isLoading: loadingAutomationRules } = useQuery({
        queryKey: ['automationRules', tenantId],
        queryFn: () => api.crm.getAutomationRules(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawStock = [], isLoading: loadingStock } = useQuery({
        queryKey: ['stock', tenantId],
        queryFn: () => api.stock.list(tenantId),
        enabled: !!user
    });

    const { data: rawInterventions = [], isLoading: loadingInterventions } = useQuery({
        queryKey: ['interventions', tenantId],
        queryFn: () => api.interventions.list(tenantId),
        enabled: !!user
    });

    const { data: rawUsers = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['users', tenantId],
        queryFn: () => api.users.list(tenantId),
        enabled: !!user
    });

    const { data: rawContracts = [], isLoading: loadingContracts } = useQuery({
        queryKey: ['contracts', tenantId],
        queryFn: () => api.contracts.list(tenantId),
        enabled: !!user
    });

    const { data: rawInvoices = [], isLoading: loadingInvoices } = useQuery({
        queryKey: ['invoices', tenantId],
        queryFn: () => api.invoices.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawQuotes = [], isLoading: loadingQuotes } = useQuery({
        queryKey: ['quotes', tenantId],
        queryFn: () => api.quotes.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawTicketsResult } = useQuery({
        queryKey: ['tickets', tenantId],
        queryFn: () => api.tickets.list({ tenantId }),
        enabled: !!user
    });
    const rawTickets: Ticket[] = rawTicketsResult?.data ?? [];

    const { data: rawDrivers = [], isLoading: loadingDrivers } = useQuery({
        queryKey: ['drivers', tenantId],
        queryFn: () => api.drivers.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawTechs = [], isLoading: loadingTechs } = useQuery({
        queryKey: ['techs', tenantId],
        queryFn: () => api.techs.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawBranches = [], isLoading: loadingBranches } = useQuery({
        queryKey: ['branches', tenantId],
        queryFn: () => api.branches.getAll(),
        enabled: !!user
    });

    const { data: rawGroups = [], isLoading: loadingGroups } = useQuery({
        queryKey: ['groups', tenantId],
        queryFn: () => api.groups.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawCommands = [], isLoading: loadingCommands } = useQuery({
        queryKey: ['commands', tenantId],
        queryFn: () => api.commands.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawPOIs = [], isLoading: loadingPOIs } = useQuery({
        queryKey: ['pois', tenantId],
        queryFn: () => api.pois.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawAlertConfigs = [], isLoading: loadingAlertConfigs } = useQuery({
        queryKey: ['alertConfigs', tenantId],
        queryFn: () => api.alertConfigs.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawUserActivity = [] } = useQuery({
        queryKey: ['userActivity', tenantId],
        queryFn: () => api.userActivity.list(),
        enabled: !!user && deferredEnabled,
        staleTime: 5 * 60 * 1000, // 5 min
    });

    const { data: rawMaintenanceRules = [], isLoading: loadingMaintenanceRules } = useQuery({
        queryKey: ['maintenanceRules', tenantId],
        queryFn: () => api.maintenanceRules.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawScheduleRules = [], isLoading: loadingScheduleRules } = useQuery({
        queryKey: ['scheduleRules', tenantId],
        queryFn: () => api.scheduleRules.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawEcoDrivingProfiles = [], isLoading: loadingEcoDrivingProfiles } = useQuery({
        queryKey: ['ecoDrivingProfiles', tenantId],
        queryFn: () => api.ecoDrivingProfiles.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawCatalog = [], isLoading: loadingCatalog } = useQuery({
        queryKey: ['catalog', tenantId],
        queryFn: () => api.catalog.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawJournal = [], isLoading: loadingJournal } = useQuery({
        queryKey: ['journal', tenantId],
        queryFn: () => api.accounting.list(tenantId),
        enabled: !!user && !!tenantId && deferredEnabled,
        retry: 1
    });

    const { data: rawPayments = [], isLoading: loadingPayments } = useQuery({
        queryKey: ['payments', tenantId],
        queryFn: () => api.payments.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawSupplierInvoices = [], isLoading: loadingSupplierInvoices } = useQuery({
        queryKey: ['supplierInvoices', tenantId],
        queryFn: () => api.supplierInvoices.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawBankTransactions = [], isLoading: loadingBankTransactions } = useQuery({
        queryKey: ['bankTransactions', tenantId],
        queryFn: () => api.bankTransactions.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawBudgets = [], isLoading: loadingBudgets } = useQuery({
        queryKey: ['budgets', tenantId],
        queryFn: () => api.budgets.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawSuppliers = [], isLoading: loadingSuppliers } = useQuery({
        queryKey: ['suppliers', tenantId],
        queryFn: () => api.suppliers.getAll(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawTiers = [], isLoading: loadingTiers } = useQuery({
        queryKey: ['tiers', tenantId],
        queryFn: () => api.tiers.list(),
        enabled: !!user,
    });

    const { data: rawStockMovements = [], isLoading: loadingStockMovements } = useQuery({
        queryKey: ['stockMovements', tenantId],
        queryFn: () => api.stockMovements.list(tenantId),
        enabled: !!user && deferredEnabled
    });

    const { data: rawFuelRecords = [], isLoading: loadingFuelRecords } = useQuery({
        queryKey: ['fuelRecords', tenantId],
        queryFn: () => api.fuel.list(),
        enabled: !!user && deferredEnabled
    });

    const { data: rawMaintenanceRecords = [], isLoading: loadingMaintenanceRecords } = useQuery({
        queryKey: ['maintenanceRecords', tenantId],
        queryFn: () => api.maintenance.list(),
        enabled: !!user && deferredEnabled
    });

    // --- DATA MAPPING (ensure all are arrays to prevent .map() crashes) ---
    const vehicles = Array.isArray(rawVehicles) ? rawVehicles : [];
    const clients = Array.isArray(rawClients) ? rawClients : [];
    const alerts = Array.isArray(rawAlerts) ? rawAlerts : [];
    const leads = Array.isArray(rawLeads) ? rawLeads : [];
    const stock = Array.isArray(rawStock) ? rawStock : [];
    const interventions = Array.isArray(rawInterventions) ? rawInterventions : [];
    const users = Array.isArray(rawUsers) ? rawUsers : [];
    const contracts = Array.isArray(rawContracts) ? rawContracts : [];
    const invoices = Array.isArray(rawInvoices) ? rawInvoices : [];
    const quotes = Array.isArray(rawQuotes) ? rawQuotes : [];
    const tickets = rawTickets;
    const drivers = rawDrivers;
    const techs = rawTechs;
    const groups = rawGroups;
    const commands = rawCommands;
    const pois = rawPOIs;
    const alertConfigs = rawAlertConfigs;
    const maintenanceRules = rawMaintenanceRules;
    const scheduleRules = rawScheduleRules;
    const ecoDrivingProfiles = rawEcoDrivingProfiles;
    const payments = rawPayments;
    const supplierInvoices = rawSupplierInvoices;
    const bankTransactions = rawBankTransactions;
    const budgets = rawBudgets;
    const suppliers = rawSuppliers;
    const stockMovements = rawStockMovements;
    const fuelRecords = rawFuelRecords;
    const maintenanceRecords = rawMaintenanceRecords;

    // --- MUTATIONS ---
    const addTierMutation = useMutation({
        mutationFn: (tier: Tier) => api.tiers.create(tier),
        onSuccess: (newTier) => {
            queryClient.setQueryData(['tiers', tenantId], (old: Tier[] = []) => [...old, newTier]);
        },
        onError: (error: unknown) => { logger.error('[DataContext] addTier failed:', error); }
    });

    const updateTierMutation = useMutation({
        mutationFn: (tier: Tier) => api.tiers.update(tier),
        onSuccess: (updatedTier) => {
            queryClient.setQueryData(['tiers', tenantId], (old: Tier[] = []) => old.map(t => t.id === updatedTier.id ? updatedTier : t));
            // Invalider le cache pour forcer un refetch
            queryClient.invalidateQueries({ queryKey: ['tiers', tenantId] });
        },
        onError: (error: unknown) => { logger.error('[DataContext] updateTier failed:', error); }
    });

    const deleteTierMutation = useMutation({
        mutationFn: api.tiers.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['tiers', tenantId], (old: Tier[] = []) => old.filter(t => t.id !== id));
        },
        onError: (error: unknown) => { logger.error('[DataContext] deleteTier failed:', error); }
    });;

    const addClientMutation = useMutation({
        mutationFn: (client: Client) => api.clients.create({ ...client, tenantId: tenantId || client.tenantId || 'tenant_default' }),
        onSuccess: (newClient) => {
            queryClient.setQueryData(['clients', tenantId], (old: Client[] = []) => [...old, newClient]);
        },
        onError: (error: unknown) => { logger.error('[DataContext] addClient failed:', error); }
    });

    const updateClientMutation = useMutation({
        mutationFn: api.clients.update,
        onSuccess: (updatedClient) => {
            queryClient.setQueryData(['clients', tenantId], (old: Client[] = []) => old.map(c => c.id === updatedClient.id ? updatedClient : c));
        },
        onError: (error: unknown) => { logger.error('[DataContext] updateClient failed:', error); }
    });

    const deleteClientMutation = useMutation({
        mutationFn: api.clients.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['clients', tenantId], (old: Client[] = []) => old.filter(c => c.id !== id));
        },
        onError: (error: unknown) => { logger.error('[DataContext] deleteClient failed:', error); }
    });

    // --- CONTRACT MUTATIONS ---
    const addContractMutation = useMutation({
        mutationFn: (contract: Contract) => api.contracts.create({ ...contract, tenantId: tenantId || contract.tenantId || 'tenant_default' }),
        onSuccess: (newContract) => {
            queryClient.setQueryData(['contracts', tenantId], (old: Contract[] = []) => [...old, newContract]);
        },
        onError: (error: unknown) => { logger.error('[DataContext] addContract failed:', error); }
    });

    const updateContractMutation = useMutation({
        mutationFn: api.contracts.update,
        onSuccess: (updatedContract) => {
            queryClient.setQueryData(['contracts', tenantId], (old: Contract[] = []) => old.map(c => {
                if (c.id !== updatedContract.id) return c;
                // Merge: keep old fields if not returned by update (e.g. clientName, resellerName)
                return { ...c, ...updatedContract };
            }));
        },
        onError: (error: unknown) => { logger.error('[DataContext] updateContract failed:', error); }
    });

    const deleteContractMutation = useMutation({
        mutationFn: api.contracts.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['contracts', tenantId], (old: Contract[] = []) => old.filter(c => c.id !== id));
        },
        onError: (error: unknown) => { logger.error('[DataContext] deleteContract failed:', error); }
    });

    const markAlertAsReadMutation = useMutation({
        mutationFn: api.alerts.markAsRead,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['alerts', tenantId], (old: Alert[] = []) => old.map(a => a.id === id ? { ...a, isRead: true } : a));
        }
    });

    const addAlertCommentMutation = useMutation({
        mutationFn: ({ id, comment }: { id: string, comment: string }) => api.alerts.comment(id, comment),
        onSuccess: (updatedAlert) => {
            queryClient.setQueryData(['alerts', tenantId], (old: Alert[] = []) => 
                old.map(a => a.id === updatedAlert.id ? updatedAlert : a)
            );
        }
    });

    const bulkUpdateClientStatusMutation = useMutation({
        mutationFn: ({ ids, status }: { ids: string[], status: 'ACTIVE' | 'SUSPENDED' | 'CHURNED' }) => api.clients.bulkUpdateStatus(ids, status),
        onSuccess: (_, { ids, status }) => {
            queryClient.setQueryData(['clients', tenantId], (old: Client[] = []) => old.map(c => ids.includes(c.id) ? { ...c, status } : c));
            queryClient.invalidateQueries({ queryKey: ['clients', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['tiers', tenantId] });
            logger.debug(`[DataContext] Bulk status update: ${ids.length} clients → ${status}`);
        },
        onError: (error: unknown, { ids, status }) => {
            logger.error(`[DataContext] Bulk status update failed for ${ids.length} clients to ${status}:`, error);
        }
    });

    const addVehicleMutation = useMutation({
        mutationFn: (vehicle: Vehicle) => {
            if (!tenantId) throw new Error('tenantId manquant — impossible de créer le véhicule');
            return api.vehicles.create({ ...vehicle, tenantId });
        },
        onSuccess: (newVehicle) => {
            queryClient.setQueryData(['vehicles', tenantId], (old: Vehicle[] = []) => [...old, newVehicle]);
        },
        onError: (error: unknown) => {
            logger.error('[DataContext] addVehicle failed:', error);
        },
    });

    const updateVehicleMutation = useMutation({
        mutationFn: api.vehicles.update,
        onSuccess: (updatedVehicle) => {
            queryClient.setQueryData(['vehicles', tenantId], (old: Vehicle[] = []) => old.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
        },
        onError: (error: unknown) => {
            logger.error('[DataContext] updateVehicle failed:', error);
        },
    });

    const addFuelRecordMutation = useMutation({
        mutationFn: api.fuel.add,
        onSuccess: (newRecord) => {
            queryClient.invalidateQueries({ queryKey: ['fuel', newRecord.vehicleId] });
        }
    });

    const addMaintenanceRecordMutation = useMutation({
        mutationFn: api.maintenance.add,
        onSuccess: (newRecord) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance', newRecord.vehicleId] });
        }
    });

    const updateLeadStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: LeadStatus }) => api.leads.updateStatus(id, status),
        onSuccess: (_, { id, status }) => {
            queryClient.setQueryData(['leads', tenantId], (old: Lead[] = []) => old.map(l => l.id === id ? { ...l, status } : l));
            // Automation LEAD_STATUS_CHANGED is handled server-side by automationEngine.fireTrigger
        }
    });

    const deleteLeadMutation = useMutation({
        mutationFn: api.leads.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['leads', tenantId], (old: Lead[] = []) => old.filter(l => l.id !== id));
        }
    });

    const addStockMovementMutation = useMutation({
        mutationFn: (movement: StockMovement) => api.stockMovements.create({ ...movement, tenantId: tenantId || movement.tenantId }),
        onSuccess: (newMovement) => {
            queryClient.setQueryData(['stockMovements', tenantId], (old: StockMovement[] = []) => [...old, newMovement]);
        }
    });

    const addDeviceMutation = useMutation({
        mutationFn: (device: DeviceStock) => api.stock.create({ ...device, tenantId: tenantId || device.tenantId }),
        onSuccess: (newDevice) => {
            queryClient.setQueryData(['stock', tenantId], (old: DeviceStock[] = []) => [...old, newDevice]);

            // Log Entry
            addStockMovementMutation.mutate({
                id: `MOV-${Date.now()}`,
                tenantId: newDevice.tenantId,
                deviceId: newDevice.id,
                date: new Date().toISOString(),
                type: 'ENTRY',
                toLocation: newDevice.location,
                toStatus: newDevice.status,
                userId: user?.id || 'SYSTEM',
                details: 'Initial Entry'
            });
        }
    });

    const updateDeviceMutation = useMutation({
        mutationFn: (device: DeviceStock) => {
            if (!api.stock?.update) {
                logger.error('[DataContext] api.stock.update is undefined!');
                return Promise.reject(new Error('api.stock.update not available'));
            }
            return api.stock.update(device);
        },
        onSuccess: (updatedDevice) => {
            // Get old device state to compare
            const oldDevice = stock.find(d => d.id === updatedDevice.id);

            queryClient.setQueryData(['stock', tenantId], (old: DeviceStock[] = []) => old.map(d => d.id === updatedDevice.id ? updatedDevice : d));

            if (oldDevice) {
                let type: StockMovement['type'] | null = null;
                let details = '';

                if (oldDevice.location !== updatedDevice.location) {
                    type = 'TRANSFER';
                    details = `Transfer from ${oldDevice.location} to ${updatedDevice.location}`;
                } else if (oldDevice.status !== updatedDevice.status) {
                    if (updatedDevice.status === 'INSTALLED') type = 'INSTALLATION';
                    else if (updatedDevice.status === 'REMOVED') type = 'REMOVAL';
                    else if (updatedDevice.status === 'RMA') type = 'RMA';
                    else type = 'STATUS_CHANGE';
                    details = `Status changed from ${oldDevice.status} to ${updatedDevice.status}`;
                }

                if (type) {
                    addStockMovementMutation.mutate({
                        id: `MOV-${Date.now()}`,
                        tenantId: updatedDevice.tenantId,
                        deviceId: updatedDevice.id,
                        date: new Date().toISOString(),
                        type: type,
                        fromLocation: oldDevice.location,
                        toLocation: updatedDevice.location,
                        fromStatus: oldDevice.status,
                        toStatus: updatedDevice.status,
                        userId: user?.id || 'SYSTEM',
                        details: details
                    });
                }
            }
        }
    });

    const deleteDeviceMutation = useMutation({
        mutationFn: api.stock.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['stock', tenantId], (old: DeviceStock[] = []) => old.filter(d => d.id !== id));
        }
    });

    const addLeadMutation = useMutation({
        mutationFn: (lead: Lead) => api.leads.create({ ...lead, tenantId: tenantId || lead.tenantId }),
        onError: (error: unknown) => {
            console.error('[addLead] Error:', error);
        },
        onSuccess: (newLead) => {
            queryClient.setQueryData(['leads', tenantId], (old: Lead[] = []) => [...old, newLead]);
            // Automation LEAD_CREATED is handled server-side by automationEngine.fireTrigger
        }
    });

    const updateLeadMutation = useMutation({
        mutationFn: (lead: Lead) => api.leads.update({ ...lead, tenantId: tenantId || lead.tenantId }),
        onError: (error: unknown) => {
            console.error('[updateLead] Error:', error);
        },
        onSuccess: (updatedLead) => {
            queryClient.setQueryData(['leads', tenantId], (old: Lead[] = []) =>
                old.map(l => l.id === updatedLead.id ? updatedLead : l)
            );
        }
    });

    const addTaskMutation = useMutation({
        mutationFn: (task: Task) => api.crm.createTask(task),
        onSuccess: (newTask) => {
            queryClient.setQueryData(['tasks', tenantId], (old: Task[] = []) => [...old, newTask]);
        },
        onError: (error: unknown) => {
            console.error('[addTask] Error:', error);
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: (task: Task) => api.crm.updateTask(task.id, task),
        onSuccess: (updatedTask) => {
            queryClient.setQueryData(['tasks', tenantId], (old: Task[] = []) =>
                old.map(t => t.id === updatedTask.id ? updatedTask : t)
            );
        },
        onError: (error: unknown) => {
            console.error('[updateTask] Error:', error);
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (id: string) => api.crm.deleteTask(id),
        onSuccess: (deletedId, inputId) => {
            // deletedId is the UUID string returned by backend
            queryClient.setQueryData(['tasks', tenantId], (old: Task[] = []) =>
                old.filter(t => t.id !== deletedId)
            );
        },
        onError: (error: unknown) => {
            console.error('[deleteTask] Error:', error);
        }
    });

    const addAutomationRuleMutation = useMutation({
        mutationFn: (rule: Partial<AutomationRule>) => api.crm.createAutomationRule(rule),
        onSuccess: (newRule) => {
            queryClient.setQueryData(['automationRules', tenantId], (old: AutomationRule[] = []) => [...old, newRule]);
        },
        onError: (error: unknown) => {
            console.error('[addAutomationRule] Error:', error);
        }
    });

    const toggleAutomationRuleMutation = useMutation({
        mutationFn: async (id: string) => {
            const current = queryClient.getQueryData<AutomationRule[]>(['automationRules', tenantId]) || [];
            const rule = current.find(r => r.id === id);
            if (!rule) throw new Error('Rule not found');
            return api.crm.updateAutomationRule(id, { isActive: !rule.isActive } as Partial<AutomationRule>);
        },
        onSuccess: (updatedRule) => {
            queryClient.setQueryData(['automationRules', tenantId], (old: AutomationRule[] = []) =>
                old.map(r => r.id === updatedRule.id ? updatedRule : r)
            );
        },
        onError: (error: unknown) => {
            console.error('[toggleAutomationRule] Error:', error);
        }
    });

    const deleteAutomationRuleMutation = useMutation({
        mutationFn: (id: string) => api.crm.deleteAutomationRule(id),
        onSuccess: (deletedId, inputId) => {
            queryClient.setQueryData(['automationRules', tenantId], (old: AutomationRule[] = []) =>
                old.filter(r => r.id !== inputId)
            );
        },
        onError: (error: unknown) => {
            console.error('[deleteAutomationRule] Error:', error);
        }
    });

    const updateAutomationRuleMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<AutomationRule> }) => api.crm.updateAutomationRule(id, data),
        onSuccess: (updatedRule) => {
            queryClient.setQueryData(['automationRules', tenantId], (old: AutomationRule[] = []) =>
                old.map(r => r.id === updatedRule.id ? updatedRule : r)
            );
        },
        onError: (error: unknown) => {
            console.error('[updateAutomationRule] Error:', error);
        }
    });

    // Backend handles Stock Movements, Contract Logic, and Billing upon COMPLETED status.

    const addInterventionMutation = useMutation({
        mutationFn: (intervention: Intervention) => api.interventions.create({ ...intervention, tenantId: tenantId || intervention.tenantId }),
        onSuccess: async (newIntervention) => {
            queryClient.setQueryData(['interventions', tenantId], (old: Intervention[] = []) => [...old, newIntervention]);

            // Refresh caches if backend processed completion logic (Stock, Invoices, Contracts)
            if (newIntervention.status === 'COMPLETED') {
                queryClient.invalidateQueries({ queryKey: ['stock', tenantId] });
                queryClient.invalidateQueries({ queryKey: ['contracts', tenantId] });
                queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
            }
        }
    });

    const updateInterventionMutation = useMutation({
        mutationFn: api.interventions.update,
        onSuccess: async (updatedIntervention) => {
            queryClient.setQueryData(['interventions', tenantId], (old: Intervention[] = []) => old.map(i => i.id === updatedIntervention.id ? updatedIntervention : i));

            // Refresh caches if backend processed completion logic (Stock, Invoices, Contracts)
            if (updatedIntervention.status === 'COMPLETED') {
                queryClient.invalidateQueries({ queryKey: ['stock', tenantId] });
                queryClient.invalidateQueries({ queryKey: ['contracts', tenantId] });
                queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
            }
        }
    });

    const deleteInterventionMutation = useMutation({
        mutationFn: api.interventions.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['interventions', tenantId], (old: Intervention[] = []) => old.filter(i => i.id !== id));
        }
    });

    const addJournalEntryMutation = useMutation({
        mutationFn: (entry: JournalEntry) => api.accounting.create({ ...entry, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newEntry) => {
            queryClient.setQueryData(['journal', tenantId], (old: JournalEntry[] = []) => [...old, newEntry]);
        }
    });

    const createGroupedJournalEntryMutation = useMutation({
        mutationFn: (payload: { date: string; description: string; reference?: string; journalCode?: string; lines: Array<{ account_code: string; debit: number; credit: number; description?: string }> }) =>
            api.accounting.createGrouped(payload),
        onSuccess: (newEntries) => {
            queryClient.setQueryData(['journal', tenantId], (old: JournalEntry[] = []) => [...old, ...newEntries]);
        }
    });

    const addInvoiceMutation = useMutation({
        mutationFn: (invoice: Invoice) => api.invoices.create({ ...invoice, tenantId: tenantId || invoice.tenantId || 'tenant_default' }),
        onSuccess: (newInvoice) => {
            queryClient.setQueryData(['invoices', tenantId], (old: Invoice[] = []) => [...old, newInvoice]);

            // Journal entries are generated server-side on invoice creation
            queryClient.invalidateQueries({ queryKey: ['journal', tenantId] });
        }
    });

    const updateInvoiceMutation = useMutation({
        mutationFn: api.invoices.update,
        onSuccess: (updatedInvoice) => {
            queryClient.setQueryData(['invoices', tenantId], (old: Invoice[] = []) => old.map(i => i.id === updatedInvoice.id ? { ...i, ...updatedInvoice } : i));

            // Journal entries are generated server-side on invoice update
            queryClient.invalidateQueries({ queryKey: ['journal', tenantId] });
        }
    });

    const deleteInvoiceMutation = useMutation({
        mutationFn: api.invoices.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['invoices', tenantId], (old: Invoice[] = []) => old.filter(i => i.id !== id));
        }
    });

    const addQuoteMutation = useMutation({
        mutationFn: (quote: Quote) => api.quotes.create({ ...quote, tenantId: tenantId || quote.tenantId || 'tenant_default' }),
        onSuccess: (newQuote) => {
            queryClient.setQueryData(['quotes', tenantId], (old: Quote[] = []) => [...old, newQuote]);
        }
    });

    const updateQuoteMutation = useMutation({
        mutationFn: api.quotes.update,
        onSuccess: (updatedQuote) => {
            queryClient.setQueryData(['quotes', tenantId], (old: Quote[] = []) => old.map(q => q.id === updatedQuote.id ? updatedQuote : q));
        }
    });

    const deleteQuoteMutation = useMutation({
        mutationFn: api.quotes.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['quotes', tenantId], (old: Quote[] = []) => old.filter(q => q.id !== id));
        }
    });

    type TicketPage = { data: Ticket[]; total: number; page: number; limit: number; totalPages: number };
    const patchTicketCache = (fn: (old: Ticket[]) => Ticket[]) => {
        queryClient.setQueryData(['tickets', tenantId], (old: TicketPage | undefined) => {
            if (!old) return old;
            return { ...old, data: fn(old.data) };
        });
    };

    const addTicketMutation = useMutation({
        mutationFn: (ticket: Ticket) => api.tickets.create({ ...ticket, tenantId: tenantId || ticket.tenantId || 'tenant_default' }),
        onSuccess: (newTicket) => {
            patchTicketCache(old => [...old, newTicket]);
        }
    });

    const updateTicketMutation = useMutation({
        mutationFn: api.tickets.update,
        onSuccess: (updatedTicket) => {
            patchTicketCache(old => old.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        }
    });

    const deleteTicketMutation = useMutation({
        mutationFn: api.tickets.delete,
        onSuccess: (_, id) => {
            patchTicketCache(old => old.filter(t => t.id !== id));
        }
    });

    // --- USER MUTATIONS ---
    const addUserMutation = useMutation({
        mutationFn: (user: SystemUser) => api.users.create({
            ...user,
            // user.tenantId prioritaire : il est dérivé du revendeur/client dans SettingsView,
            // ce qui évite la contrainte DB chk_default_tenant_staff_only
            // (CLIENT/SOUS_COMPTE interdits dans tenant_default).
            tenantId: user.tenantId || tenantId || 'tenant_default',
        }),
        onSuccess: (newUser) => {
            queryClient.setQueryData(['users', tenantId], (old: SystemUser[] = []) => [...old, newUser]);
        },
        onError: (error) => {
            logger.error('Failed to create user:', error);
            queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        }
    });

    const updateUserMutation = useMutation({
        mutationFn: api.users.update,
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['users', tenantId], (old: SystemUser[] = []) => old.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        },
        onError: (error) => {
            logger.error('Failed to update user:', error);
            queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: api.users.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['users', tenantId], (old: SystemUser[] = []) => old.filter(u => u.id !== id));
        },
        onError: (error) => {
            logger.error('Failed to delete user:', error);
            queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        }
    });

    // --- DRIVER MUTATIONS ---
    const addDriverMutation = useMutation({
        mutationFn: (driver: Driver) => api.drivers.create({ ...driver, tenantId: tenantId || driver.tenantId || 'tenant_default' }),
        onSuccess: (newDriver) => {
            queryClient.setQueryData(['drivers', tenantId], (old: Driver[] = []) => [...old, newDriver]);
        }
    });

    const updateDriverMutation = useMutation({
        mutationFn: api.drivers.update,
        onSuccess: (updatedDriver) => {
            queryClient.setQueryData(['drivers', tenantId], (old: Driver[] = []) => old.map(d => d.id === updatedDriver.id ? updatedDriver : d));
        }
    });

    const deleteDriverMutation = useMutation({
        mutationFn: api.drivers.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['drivers', tenantId], (old: Driver[] = []) => old.filter(d => d.id !== id));
        }
    });

    // --- TECH MUTATIONS ---
    const addTechMutation = useMutation({
        mutationFn: (tech: Tech) => api.techs.create({ ...tech, tenantId: tenantId || tech.tenantId || 'tenant_default' }),
        onSuccess: (newTech) => {
            queryClient.setQueryData(['techs', tenantId], (old: Tech[] = []) => [...old, newTech]);
        }
    });

    const updateTechMutation = useMutation({
        mutationFn: api.techs.update,
        onSuccess: (updatedTech) => {
            queryClient.setQueryData(['techs', tenantId], (old: Tech[] = []) => old.map(t => t.id === updatedTech.id ? updatedTech : t));
        }
    });

    const deleteTechMutation = useMutation({
        mutationFn: api.techs.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['techs', tenantId], (old: Tech[] = []) => old.filter(t => t.id !== id));
        }
    });

    // --- GROUP MUTATIONS ---
    const addGroupMutation = useMutation({
        mutationFn: (group: Group) => api.groups.create({ ...group, tenantId: tenantId || group.tenantId || 'tenant_default' }),
        onSuccess: (newGroup) => {
            queryClient.setQueryData(['groups', tenantId], (old: Group[] = []) => [...old, newGroup]);
        }
    });

    const updateGroupMutation = useMutation({
        mutationFn: api.groups.update,
        onSuccess: (updatedGroup) => {
            queryClient.setQueryData(['groups', tenantId], (old: Group[] = []) => old.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        }
    });

    const deleteGroupMutation = useMutation({
        mutationFn: api.groups.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['groups', tenantId], (old: Group[] = []) => old.filter(g => g.id !== id));
        }
    });

    const addPaymentMutation = useMutation({
        mutationFn: (payment: Payment) => api.payments.create({ ...payment, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newPayment) => {
            queryClient.setQueryData(['payments', tenantId], (old: Payment[] = []) => [...old, newPayment]);

            // Update invoice statuses for allocated payments; journal entries are generated server-side
            if (newPayment.type === 'INCOMING') {
                const allocations = newPayment.allocations || (newPayment.invoiceId ? [{ invoiceId: newPayment.invoiceId, amount: newPayment.amount }] : []);

                // 1. Update invoice statuses for each allocation
                allocations.forEach(alloc => {
                    const invoice = invoices.find(i => i.id === alloc.invoiceId);
                    if (invoice) {
                        const newPaidAmount = Math.min(
                            (invoice.paidAmount || 0) + alloc.amount,
                            invoice.amount
                        );
                        const isFullPayment = newPaidAmount >= invoice.amount;
                        updateInvoiceMutation.mutate({
                            ...invoice,
                            status: isFullPayment ? 'PAID' : 'PARTIALLY_PAID',
                            paidAmount: newPaidAmount,
                            paymentDate: newPayment.date
                        });
                    }
                });
            }
            // Journal entries are generated server-side on payment creation
            queryClient.invalidateQueries({ queryKey: ['journal', tenantId] });
        }
    });

    const addSupplierInvoiceMutation = useMutation({
        mutationFn: (invoice: SupplierInvoice) => api.supplierInvoices.create({ ...invoice, tenantId: tenantId || invoice.tenantId || 'tenant_default' }),
        onSuccess: (newInvoice) => {
            queryClient.setQueryData(['supplierInvoices', tenantId], (old: SupplierInvoice[] = []) => [...old, newInvoice]);

            // Journal entries are generated server-side on supplier invoice creation
            queryClient.invalidateQueries({ queryKey: ['journal', tenantId] });
        }
    });

    const updateSupplierInvoiceMutation = useMutation({
        mutationFn: api.supplierInvoices.update,
        onSuccess: (updatedInvoice) => {
            queryClient.setQueryData(['supplierInvoices', tenantId], (old: SupplierInvoice[] = []) => old.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));

            // Journal entries are generated server-side on supplier invoice update
            queryClient.invalidateQueries({ queryKey: ['journal', tenantId] });
        }
    });

    const deleteSupplierInvoiceMutation = useMutation({
        mutationFn: api.supplierInvoices.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['supplierInvoices', tenantId], (old: SupplierInvoice[] = []) => old.filter(i => i.id !== id));
        }
    });

    const addBankTransactionMutation = useMutation({
        mutationFn: (tx: BankTransaction) => api.bankTransactions.create({ ...tx, tenantId: tenantId || tx.tenantId || 'tenant_default' }),
        onSuccess: (newTx) => {
            queryClient.setQueryData(['bankTransactions', tenantId], (old: BankTransaction[] = []) => [...old, newTx]);

            // Journal entries are generated server-side on bank transaction creation
            queryClient.invalidateQueries({ queryKey: ['journal', tenantId] });
        }
    });

    const updateBankTransactionMutation = useMutation({
        mutationFn: api.bankTransactions.update,
        onSuccess: (updatedTx) => {
            queryClient.setQueryData(['bankTransactions', tenantId], (old: BankTransaction[] = []) => old.map(t => t.id === updatedTx.id ? updatedTx : t));

            // AUTOMATIC ACCOUNTING GENERATION (Bank Ops) - If status changed to RECONCILED or just updated
            // Note: In a real system, we'd check if entry already exists. Here we just add if accountCode is present.
            // Ideally, we should only do this on creation or specific status change to avoid duplicates.
            // For now, we'll assume this is primarily used for manual entry correction.
        }
    });

    const deleteBankTransactionMutation = useMutation({
        mutationFn: api.bankTransactions.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['bankTransactions', tenantId], (old: BankTransaction[] = []) => old.filter(t => t.id !== id));
        }
    });

    const addBudgetMutation = useMutation({
        mutationFn: api.budgets.create,
        onSuccess: (newBudget) => {
            queryClient.setQueryData(['budgets', tenantId], (old: Budget[] = []) => [...old, newBudget]);
        }
    });

    const updateBudgetMutation = useMutation({
        mutationFn: api.budgets.update,
        onSuccess: (updatedBudget) => {
            queryClient.setQueryData(['budgets', tenantId], (old: Budget[] = []) => old.map(b => b.id === updatedBudget.id ? updatedBudget : b));
        }
    });

    const deleteBudgetMutation = useMutation({
        mutationFn: api.budgets.delete,
        onSuccess: (id) => {
            queryClient.setQueryData(['budgets', tenantId], (old: Budget[] = []) => old.filter(b => b.id !== id));
        }
    });

    const addSupplierMutation = useMutation({
        mutationFn: (supplier: Supplier) => api.suppliers.create({ ...supplier, tenantId: tenantId || supplier.tenantId || 'tenant_default' }),
        onSuccess: (newSupplier) => {
            queryClient.setQueryData(['suppliers', tenantId], (old: Supplier[] = []) => [...old, newSupplier]);
        }
    });

    const updateSupplierMutation = useMutation({
        mutationFn: api.suppliers.update,
        onSuccess: (updatedSupplier) => {
            queryClient.setQueryData(['suppliers', tenantId], (old: Supplier[] = []) => old.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
        }
    });

    const deleteSupplierMutation = useMutation({
        mutationFn: api.suppliers.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['suppliers', tenantId], (old: Supplier[] = []) => old.filter(s => s.id !== id));
        }
    });

    // --- BRANCH MUTATIONS ---
    const addBranchMutation = useMutation({
        mutationFn: (branch: Branch) => api.branches.create({ ...branch, tenantId: tenantId || branch.tenantId || 'tenant_default' }),
        onSuccess: (newBranch) => {
            queryClient.setQueryData(['branches', tenantId], (old: Branch[] = []) => [...old, newBranch]);
        }
    });

    const updateBranchMutation = useMutation({
        mutationFn: api.branches.update,
        onSuccess: (updatedBranch) => {
            queryClient.setQueryData(['branches', tenantId], (old: Branch[] = []) => old.map(b => b.id === updatedBranch.id ? updatedBranch : b));
        }
    });

    const deleteBranchMutation = useMutation({
        mutationFn: api.branches.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['branches', tenantId], (old: Branch[] = []) => old.filter(b => b.id !== id));
        }
    });

    // --- Commands Mutations ---
    const addCommandMutation = useMutation({
        mutationFn: (cmd: Command) => api.commands.create({ ...cmd, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newCmd) => {
            queryClient.setQueryData(['commands', tenantId], (old: Command[] = []) => [...old, newCmd]);
        }
    });
    const updateCommandMutation = useMutation({
        mutationFn: (cmd: Command) => api.commands.update(cmd),
        onSuccess: (updatedCmd) => {
            queryClient.setQueryData(['commands', tenantId], (old: Command[] = []) => old.map(c => c.id === updatedCmd.id ? updatedCmd : c));
        }
    });
    const deleteCommandMutation = useMutation({
        mutationFn: api.commands.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['commands', tenantId], (old: Command[] = []) => old.filter(c => c.id !== id));
        }
    });

    // --- POIs Mutations ---
    const addPOIMutation = useMutation({
        mutationFn: (poi: POI) => api.pois.create({ ...poi, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newPOI) => {
            queryClient.setQueryData(['pois', tenantId], (old: POI[] = []) => [...old, newPOI]);
        }
    });
    const updatePOIMutation = useMutation({
        mutationFn: (poi: POI) => api.pois.update(poi),
        onSuccess: (updatedPOI) => {
            queryClient.setQueryData(['pois', tenantId], (old: POI[] = []) => old.map(p => p.id === updatedPOI.id ? updatedPOI : p));
        }
    });
    const deletePOIMutation = useMutation({
        mutationFn: api.pois.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['pois', tenantId], (old: POI[] = []) => old.filter(p => p.id !== id));
        }
    });

    // --- AlertConfigs Mutations ---
    const addAlertConfigMutation = useMutation({
        mutationFn: (cfg: AlertConfig) => api.alertConfigs.create(cfg),
        onSuccess: (newCfg) => {
            queryClient.setQueryData(['alertConfigs', tenantId], (old: AlertConfig[] = []) => [...old, newCfg]);
        }
    });
    const updateAlertConfigMutation = useMutation({
        mutationFn: (cfg: AlertConfig) => api.alertConfigs.update(cfg),
        onSuccess: (updatedCfg) => {
            queryClient.setQueryData(['alertConfigs', tenantId], (old: AlertConfig[] = []) => old.map(c => c.id === updatedCfg.id ? updatedCfg : c));
        }
    });
    const deleteAlertConfigMutation = useMutation({
        mutationFn: api.alertConfigs.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['alertConfigs', tenantId], (old: AlertConfig[] = []) => old.filter(c => c.id !== id));
        }
    });

    // --- CatalogItem Mutations ---
    const addCatalogItemMutation = useMutation({
        mutationFn: (item: CatalogItem) => api.catalog.create({ ...item, tenantId: tenantId || item.tenantId || 'tenant_default' }),
        onSuccess: (newItem) => {
            queryClient.setQueryData(['catalog', tenantId], (old: CatalogItem[] = []) => [...old, newItem]);
        }
    });
    const updateCatalogItemMutation = useMutation({
        mutationFn: api.catalog.update,
        onSuccess: (updatedItem) => {
            queryClient.setQueryData(['catalog', tenantId], (old: CatalogItem[] = []) => old.map(i => i.id === updatedItem.id ? updatedItem : i));
        }
    });
    const deleteCatalogItemMutation = useMutation({
        mutationFn: api.catalog.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['catalog', tenantId], (old: CatalogItem[] = []) => old.filter(i => i.id !== id));
        }
    });

    // --- MaintenanceRules Mutations ---
    const addMaintenanceRuleMutation = useMutation({
        mutationFn: (rule: MaintenanceRule) => api.maintenanceRules.create({ ...rule, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newRule) => {
            queryClient.setQueryData(['maintenanceRules', tenantId], (old: MaintenanceRule[] = []) => [...old, newRule]);
        }
    });
    const updateMaintenanceRuleMutation = useMutation({
        mutationFn: (rule: MaintenanceRule) => api.maintenanceRules.update(rule),
        onSuccess: (updatedRule) => {
            queryClient.setQueryData(['maintenanceRules', tenantId], (old: MaintenanceRule[] = []) => old.map(r => r.id === updatedRule.id ? updatedRule : r));
        }
    });
    const deleteMaintenanceRuleMutation = useMutation({
        mutationFn: api.maintenanceRules.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['maintenanceRules', tenantId], (old: MaintenanceRule[] = []) => old.filter(r => r.id !== id));
        }
    });

    // --- ScheduleRules Mutations ---
    const addScheduleRuleMutation = useMutation({
        mutationFn: (rule: ScheduleRule) => api.scheduleRules.create({ ...rule, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newRule) => {
            queryClient.setQueryData(['scheduleRules', tenantId], (old: ScheduleRule[] = []) => [...old, newRule]);
        }
    });
    const updateScheduleRuleMutation = useMutation({
        mutationFn: (rule: ScheduleRule) => api.scheduleRules.update(rule),
        onSuccess: (updatedRule) => {
            queryClient.setQueryData(['scheduleRules', tenantId], (old: ScheduleRule[] = []) => old.map(r => r.id === updatedRule.id ? updatedRule : r));
        }
    });
    const deleteScheduleRuleMutation = useMutation({
        mutationFn: api.scheduleRules.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['scheduleRules', tenantId], (old: ScheduleRule[] = []) => old.filter(r => r.id !== id));
        }
    });

    // --- EcoDrivingProfiles Mutations ---
    const addEcoDrivingProfileMutation = useMutation({
        mutationFn: (profile: EcoDrivingProfile) => api.ecoDrivingProfiles.create({ ...profile, tenantId: tenantId || 'tenant_default' }),
        onSuccess: (newProfile) => {
            queryClient.setQueryData(['ecoDrivingProfiles', tenantId], (old: EcoDrivingProfile[] = []) => [...old, newProfile]);
        }
    });
    const updateEcoDrivingProfileMutation = useMutation({
        mutationFn: (profile: EcoDrivingProfile) => api.ecoDrivingProfiles.update(profile),
        onSuccess: (updatedProfile) => {
            queryClient.setQueryData(['ecoDrivingProfiles', tenantId], (old: EcoDrivingProfile[] = []) => old.map(p => p.id === updatedProfile.id ? updatedProfile : p));
        }
    });
    const deleteEcoDrivingProfileMutation = useMutation({
        mutationFn: api.ecoDrivingProfiles.delete,
        onSuccess: (_, id) => {
            queryClient.setQueryData(['ecoDrivingProfiles', tenantId], (old: EcoDrivingProfile[] = []) => old.filter(p => p.id !== id));
        }
    });

    const toggleImmobilizationMutation = useMutation({
        mutationFn: ({ vehicleId, immobilize }: { vehicleId: string, immobilize: boolean }) => api.vehicles.toggleImmobilization(vehicleId, immobilize),
        onSuccess: (_, { vehicleId, immobilize }) => {
            queryClient.setQueryData(['vehicles', tenantId], (old: Vehicle[] = []) => old.map(v => v.id === vehicleId ? { ...v, status: immobilize ? 'STOPPED' : 'MOVING' } : v));
        }
    });

    // --- DEFINE FUNCTIONS IN PROVIDER SCOPE ---
    const normalizedAlerts: Alert[] = alerts.map(a => ({
        ...a,
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : String(a.createdAt)
    } as Alert));

    const getVehicleAlerts = async (vehicleId: string): Promise<Alert[]> => {
        return normalizedAlerts.filter(a => a.vehicleId === vehicleId);
    };

    const getVehicleHistory = api.vehicles.getHistory;
    const getVehicleHistorySnapped = api.vehicles.getHistory;
    const getMaintenanceRecords = async (vehicleId: string) => {
        return maintenanceRecords.filter(r => r.vehicleId === vehicleId);
    };

    const contextValue = useMemo((): DataContextType => ({
            vehicles,
            zones,
            clients,
            tiers: Array.isArray(rawTiers) ? rawTiers : [],
            alerts: normalizedAlerts,
            leads,
            stock,
            interventions,
            users,
            contracts,
            invoices,
            quotes,
            tickets: Array.isArray(rawTickets) ? rawTickets : [],
            branches: Array.isArray(rawBranches) ? rawBranches : [],
            catalogItems: Array.isArray(rawCatalog) ? rawCatalog : [],
            journalEntries: rawJournal,
            payments,


            addClient: (client: Client, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => addClientMutation.mutate(client, options),
            updateClient: updateClientMutation.mutate,
            deleteClient: deleteClientMutation.mutate,
            bulkUpdateClientStatus: (ids, status) => bulkUpdateClientStatusMutation.mutate({ ids, status }),

            // Tier Actions
            addTier: addTierMutation.mutate,
            updateTier: updateTierMutation.mutate,
            deleteTier: deleteTierMutation.mutate,

            markAlertAsRead: (id: string) => markAlertAsReadMutation.mutate(id),
            addAlertComment: (id: string, comment: string) => addAlertCommentMutation.mutate({ id, comment }),

            addVehicle: addVehicleMutation.mutate,
            updateVehicle: updateVehicleMutation.mutate,
            addLead: (l, options) => addLeadMutation.mutate(l, options), // Added
            updateLead: (l, options) => updateLeadMutation.mutate(l, options),
            updateLeadStatus: (id, status) => updateLeadStatusMutation.mutate({ id, status }),
            deleteLead: (id) => deleteLeadMutation.mutate(id),
            addDevice: (d) => addDeviceMutation.mutate(d),
            updateDevice: (d) => updateDeviceMutation.mutate(d),
            deleteDevice: (id) => deleteDeviceMutation.mutate(id),
            updateIntervention: (i) => updateInterventionMutation.mutate(i),
            addIntervention: (i) => addInterventionMutation.mutate(i),
            deleteIntervention: (id) => deleteInterventionMutation.mutate(id),
            addInvoice: (i) => addInvoiceMutation.mutate(i),
            updateInvoice: (i) => updateInvoiceMutation.mutate(i),
            deleteInvoice: (id) => deleteInvoiceMutation.mutate(id),
            addQuote: (q) => addQuoteMutation.mutate(q),
            updateQuote: (q) => updateQuoteMutation.mutate(q),
            deleteQuote: (id) => deleteQuoteMutation.mutate(id),
            addTicket: (t) => addTicketMutation.mutateAsync(t),
            updateTicket: (t) => updateTicketMutation.mutate(t),
            deleteTicket: (id) => deleteTicketMutation.mutate(id),
            addUser: (u) => addUserMutation.mutateAsync(u),
            updateUser: (u) => updateUserMutation.mutate(u),
            deleteUser: (id) => deleteUserMutation.mutate(id),
            addContract: (c) => addContractMutation.mutate(c),
            updateContract: (c) => updateContractMutation.mutateAsync(c),
            deleteContract: (id) => deleteContractMutation.mutate(id),
            addBranch: (b) => addBranchMutation.mutate(b),
            updateBranch: (b) => updateBranchMutation.mutate(b),
            deleteBranch: (id) => deleteBranchMutation.mutate(id),
            addCatalogItem: (i) => addCatalogItemMutation.mutate(i),
            updateCatalogItem: (i) => updateCatalogItemMutation.mutate(i),
            deleteCatalogItem: (id) => deleteCatalogItemMutation.mutate(id),
            addJournalEntry: addJournalEntryMutation.mutate,
            createGroupedJournalEntry: (payload) => createGroupedJournalEntryMutation.mutateAsync(payload).then(() => {}),

            drivers: rawDrivers,
            addDriver: (d) => addDriverMutation.mutate(d),
            updateDriver: (d) => updateDriverMutation.mutate(d),
            deleteDriver: (id) => deleteDriverMutation.mutate(id),

            techs: rawTechs,
            addTech: (t) => addTechMutation.mutate(t),
            updateTech: (t) => updateTechMutation.mutate(t),
            deleteTech: (id) => deleteTechMutation.mutate(id),

            groups: rawGroups,
            addGroup: (g) => addGroupMutation.mutate(g),
            updateGroup: (g) => updateGroupMutation.mutate(g),
            deleteGroup: (id) => deleteGroupMutation.mutate(id),

            tasks: rawTasks,
            addTask: (t) => addTaskMutation.mutateAsync(t),
            updateTask: (t) => updateTaskMutation.mutateAsync(t),
            deleteTask: (id) => deleteTaskMutation.mutate(id),

            automationRules: rawAutomationRules,
            addAutomationRule: (r) => addAutomationRuleMutation.mutate(r),
            updateAutomationRule: (id, data) => updateAutomationRuleMutation.mutate({ id, data }),
            toggleAutomationRule: (id) => toggleAutomationRuleMutation.mutate(id),
            deleteAutomationRule: (id) => deleteAutomationRuleMutation.mutate(id),

            addPayment: addPaymentMutation.mutate,

            supplierInvoices: rawSupplierInvoices,
            addSupplierInvoice: addSupplierInvoiceMutation.mutate,
            updateSupplierInvoice: updateSupplierInvoiceMutation.mutate,
            deleteSupplierInvoice: deleteSupplierInvoiceMutation.mutate,

            bankTransactions: rawBankTransactions,
            addBankTransaction: addBankTransactionMutation.mutate,
            updateBankTransaction: updateBankTransactionMutation.mutate,
            deleteBankTransaction: deleteBankTransactionMutation.mutate,

            budgets: rawBudgets,
            addBudget: addBudgetMutation.mutate,
            updateBudget: updateBudgetMutation.mutate,
            deleteBudget: deleteBudgetMutation.mutate,

            suppliers: rawSuppliers,
            addSupplier: addSupplierMutation.mutate,
            updateSupplier: updateSupplierMutation.mutate,
            deleteSupplier: deleteSupplierMutation.mutate,

            stockMovements: rawStockMovements,
            fuelRecords: rawFuelRecords,
            maintenanceRecords: rawMaintenanceRecords,
            addStockMovement: addStockMovementMutation.mutate,

            commands: rawCommands,
            addCommand: (c) => addCommandMutation.mutate(c),
            updateCommand: (c) => updateCommandMutation.mutate(c),
            deleteCommand: (id) => deleteCommandMutation.mutate(id),

            pois: rawPOIs,
            addPOI: (p) => addPOIMutation.mutate(p),
            updatePOI: (p) => updatePOIMutation.mutate(p),
            deletePOI: (id) => deletePOIMutation.mutate(id),

            alertConfigs: rawAlertConfigs,
            addAlertConfig: (c) => addAlertConfigMutation.mutate(c),
            updateAlertConfig: (c) => updateAlertConfigMutation.mutate(c),
            deleteAlertConfig: (id) => deleteAlertConfigMutation.mutate(id),

            maintenanceRules: rawMaintenanceRules,
            addMaintenanceRule: (r) => addMaintenanceRuleMutation.mutate(r),
            updateMaintenanceRule: (r) => updateMaintenanceRuleMutation.mutate(r),
            deleteMaintenanceRule: (id) => deleteMaintenanceRuleMutation.mutate(id),

            scheduleRules: rawScheduleRules,
            addScheduleRule: (r) => addScheduleRuleMutation.mutate(r),
            updateScheduleRule: (r) => updateScheduleRuleMutation.mutate(r),
            deleteScheduleRule: (id) => deleteScheduleRuleMutation.mutate(id),

            ecoDrivingProfiles: rawEcoDrivingProfiles,
            addEcoDrivingProfile: (p) => addEcoDrivingProfileMutation.mutate(p),
            updateEcoDrivingProfile: (p) => updateEcoDrivingProfileMutation.mutate(p),
            deleteEcoDrivingProfile: (id) => deleteEcoDrivingProfileMutation.mutate(id),

            getVehicleHistory,
            getVehicleHistorySnapped,

            getFuelRecords: api.fuel.list,
            getFuelHistory: api.fuel.getHistory,
            getFuelStats: api.fuel.getStats,
            addFuelRecord: api.fuel.add,
            getMaintenanceRecords,
            addMaintenanceRecord: addMaintenanceRecordMutation.mutate,

            getVehicleAlerts,

            toggleImmobilization: (vehicleId, immobilize) => toggleImmobilizationMutation.mutate({ vehicleId, immobilize }),

            anomalies: [],
            userActivity: rawUserActivity,

            // Pull-to-refresh: Invalidate all primary queries
            refreshData: async () => {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
                    queryClient.invalidateQueries({ queryKey: ['alerts'] }),
                    queryClient.invalidateQueries({ queryKey: ['clients'] }),
                    queryClient.invalidateQueries({ queryKey: ['interventions'] }),
                    queryClient.invalidateQueries({ queryKey: ['stock'] }),
                ]);
            },

            ticketCategories,
            ticketSubcategories,
            slaConfig,

            isSocketConnected,
            isDataStale,
            isLoading: loadingVehicles || loadingClients,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }), [vehicles, zones, clients, rawTiers, normalizedAlerts, leads, stock, interventions,
            users, contracts, invoices, quotes, rawTickets, rawBranches, rawCatalog, rawJournal,
            payments, rawDrivers, rawTechs, rawGroups, rawTasks, rawAutomationRules,
            rawSupplierInvoices, rawBankTransactions, rawBudgets, rawSuppliers, rawStockMovements,
            rawFuelRecords, rawMaintenanceRecords, rawCommands, rawPOIs, rawAlertConfigs,
            rawMaintenanceRules, rawScheduleRules, rawEcoDrivingProfiles, rawUserActivity,
            ticketCategories, ticketSubcategories, slaConfig,
            addClientMutation, updateClientMutation, deleteClientMutation, bulkUpdateClientStatusMutation,
            addTierMutation, updateTierMutation, deleteTierMutation, markAlertAsReadMutation,
            addVehicleMutation, updateVehicleMutation, addLeadMutation, updateLeadMutation,
            updateLeadStatusMutation, deleteLeadMutation, addDeviceMutation, updateDeviceMutation,
            deleteDeviceMutation, updateInterventionMutation, addInterventionMutation,
            deleteInterventionMutation, addInvoiceMutation, updateInvoiceMutation, deleteInvoiceMutation,
            addQuoteMutation, updateQuoteMutation, deleteQuoteMutation, addTicketMutation,
            updateTicketMutation, deleteTicketMutation, addUserMutation, updateUserMutation,
            deleteUserMutation, addContractMutation, updateContractMutation, deleteContractMutation,
            addBranchMutation, updateBranchMutation, deleteBranchMutation, addCatalogItemMutation,
            updateCatalogItemMutation, deleteCatalogItemMutation, addJournalEntryMutation,
            createGroupedJournalEntryMutation, addDriverMutation, updateDriverMutation, deleteDriverMutation,
            addTechMutation, updateTechMutation, deleteTechMutation, addGroupMutation, updateGroupMutation,
            deleteGroupMutation, addTaskMutation, updateTaskMutation, deleteTaskMutation,
            addAutomationRuleMutation, updateAutomationRuleMutation, toggleAutomationRuleMutation,
            deleteAutomationRuleMutation, addPaymentMutation, addSupplierInvoiceMutation,
            updateSupplierInvoiceMutation, deleteSupplierInvoiceMutation, addBankTransactionMutation,
            updateBankTransactionMutation, deleteBankTransactionMutation, addBudgetMutation,
            updateBudgetMutation, deleteBudgetMutation, addSupplierMutation, updateSupplierMutation,
            deleteSupplierMutation, addStockMovementMutation, addCommandMutation, updateCommandMutation,
            deleteCommandMutation, addPOIMutation, updatePOIMutation, deletePOIMutation,
            addAlertConfigMutation, updateAlertConfigMutation, deleteAlertConfigMutation,
            addMaintenanceRuleMutation, updateMaintenanceRuleMutation, deleteMaintenanceRuleMutation,
            addScheduleRuleMutation, updateScheduleRuleMutation, deleteScheduleRuleMutation,
            addEcoDrivingProfileMutation, updateEcoDrivingProfileMutation, deleteEcoDrivingProfileMutation,
            addMaintenanceRecordMutation, toggleImmobilizationMutation, queryClient,
            getVehicleHistory, getVehicleHistorySnapped, getMaintenanceRecords, getVehicleAlerts,
            isSocketConnected, isDataStale, loadingVehicles, loadingClients]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
};