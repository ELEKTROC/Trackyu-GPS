import { Client, Contract, Invoice, Quote, Ticket, Intervention, SystemUser, Lead, Alert, Vehicle, Tier, Anomaly, UserActivity, DeviceStock, Role } from '../types';

// --- HELPERS ---
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const COMPANY_PREFIXES = ['Transports', 'Logistique', 'Groupe', 'Société', 'Entreprise'];
const COMPANY_NAMES = ['Durand', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Lefebvre', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];
const COMPANY_SUFFIXES = ['Express', 'International', 'Services', 'Solutions', 'Global', 'Fret', 'Distribution', 'Logistics'];

const FIRST_NAMES = ['Jean', 'Pierre', 'Michel', 'Philippe', 'Alain', 'Patrick', 'Nicolas', 'Christophe', 'Sophie', 'Marie', 'Isabelle', 'Nathalie', 'Sylvie', 'Catherine', 'Céline'];
const LAST_NAMES = ['Dupont', 'Durand', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Lefebvre'];

const CITIES = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Nantes', 'Strasbourg', 'Toulouse', 'Nice', 'Rennes'];

// --- GENERATORS ---

export const generateClients = (count: number): Client[] => {
    return Array.from({ length: count }).map((_, i) => {
        const companyName = `${getRandomElement(COMPANY_PREFIXES)} ${getRandomElement(COMPANY_NAMES)} ${getRandomElement(COMPANY_SUFFIXES)}`;
        const contactName = `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`;
        
        return {
            id: `CLT-${1000 + i}`,
            tenantId: Math.random() > 0.8 ? 'tenant_partner_A' : 'tenant_default',
            name: companyName,
            type: Math.random() > 0.2 ? 'B2B' : 'B2C',
            status: Math.random() > 0.1 ? 'ACTIVE' : (Math.random() > 0.5 ? 'SUSPENDED' : 'CHURNED'),
            contactName: contactName,
            email: `contact@${companyName.toLowerCase().replace(/\s/g, '-')}.com`,
            phone: `+33 6 ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)}`,
            address: `${getRandomInt(1, 150)} rue de la République`,
            city: getRandomElement(CITIES),
            country: 'France',
            subscriptionPlan: Math.random() > 0.7 ? 'Enterprise' : (Math.random() > 0.4 ? 'Pro' : 'Standard'),
            createdAt: getRandomDate(new Date('2022-01-01'), new Date()),
            sector: 'Transport',
            segment: Math.random() > 0.8 ? 'VIP' : 'Standard',
            language: 'Français',
            paymentTerms: '30 jours',
            currency: 'EUR',
            paymentStatus: Math.random() > 0.8 ? 'OVERDUE' : 'UP_TO_DATE',
            balance: Math.random() > 0.8 ? -getRandomInt(100, 5000) : 0,
            contacts: []
        };
    });
};

export const generateContracts = (clients: Client[]): Contract[] => {
    return clients.flatMap(client => {
        if (client.status === 'CHURNED') return [];
        
        const hasContract = Math.random() > 0.1;
        if (!hasContract) return [];

        const startDate = getRandomDate(new Date('2022-01-01'), new Date());
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        return [{
            id: `CTR-${getRandomInt(1000, 9999)}`,
            tenantId: client.tenantId,
            clientId: client.id,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            status: new Date() > endDate ? 'EXPIRED' : 'ACTIVE',
            monthlyFee: getRandomInt(500, 5000),
            vehicleCount: getRandomInt(5, 100),
            pdfUrl: '#',
            billingCycle: 'MONTHLY',
            autoRenew: true
        }];
    });
};

export const generateInitialInterventions = (): Intervention[] => {
    return Array.from({ length: 10 }).map((_, i) => ({
        id: `INT-${1000 + i}`,
        tenantId: 'tenant_default',
        clientId: `CLT-${1000 + i}`,
        vehicleId: `VEH-${1000 + i}`,
        technicianId: 'TECH-001',
        status: Math.random() > 0.5 ? 'COMPLETED' : 'SCHEDULED',
        type: 'INSTALLATION',
        nature: 'Installation',
        scheduledDate: new Date().toISOString(),
        description: 'Installation GPS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: 60,
        location: 'Paris'
    }));
};

export const generateInvoices = (clients: Client[]): Invoice[] => {
    const invoices: Invoice[] = [];
    clients.forEach(client => {
        const count = getRandomInt(1, 5);
        for (let i = 0; i < count; i++) {
            const date = getRandomDate(new Date('2024-01-01'), new Date());
            const dueDate = new Date(date);
            dueDate.setDate(dueDate.getDate() + 30);
            
            const amount = getRandomInt(500, 5000);
            const status = Math.random() > 0.7 ? 'PAID' : (new Date() > dueDate ? 'OVERDUE' : 'SENT');

            invoices.push({
                id: `INV-2024-${getRandomInt(1000, 9999)}`,
                tenantId: client.tenantId,
                clientId: client.name, // Using name as per previous mock data structure, though ID is better
                number: `INV-2024-${getRandomInt(1000, 9999)}`,
                subject: `Facture ${getRandomElement(['Abonnement', 'Matériel', 'Installation'])}`,
                date: date.toISOString().split('T')[0],
                dueDate: dueDate.toISOString().split('T')[0],
                amount: amount,
                status: status as any,
                items: [{ description: 'Service GPS', quantity: 1, price: amount }],
                vatRate: 20,
                invoiceType: 'FACTURE'
            });
        }
    });
    return invoices;
};

export const generateQuotes = (clients: Client[]): Quote[] => {
    const quotes: Quote[] = [];
    clients.forEach(client => {
        if (Math.random() > 0.7) return;
        
        const date = getRandomDate(new Date('2024-06-01'), new Date());
        const amount = getRandomInt(1000, 10000);
        
        quotes.push({
            id: `DEV-2024-${getRandomInt(1000, 9999)}`,
            tenantId: client.tenantId,
            clientId: client.name,
            amount: amount,
            status: getRandomElement(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']),
            items: [{ description: 'Installation Flotte', quantity: getRandomInt(5, 20), price: 150 }],
            createdAt: date,
            vatRate: 20
        });
    });
    return quotes;
};

export const generateTickets = (clients: Client[]): Ticket[] => {
    const tickets: Ticket[] = [];
    clients.forEach(client => {
        if (Math.random() > 0.6) return;
        
        const count = getRandomInt(1, 3);
        for (let i = 0; i < count; i++) {
            const date = getRandomDate(new Date('2024-09-01'), new Date());
            
            tickets.push({
                id: `T-${getRandomInt(10000, 99999)}`,
                tenantId: client.tenantId,
                clientId: client.name,
                subject: getRandomElement(['Problème GPS', 'Demande installation', 'Question facture', 'Panne capteur']),
                description: 'Description du problème rencontré sur le terrain...',
                status: getRandomElement(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
                priority: getRandomElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
                category: 'TECH',
                messages: [],
                createdAt: date,
                updatedAt: date
            });
        }
    });
    return tickets;
};

export const generateInterventions = (clients: Client[], technicians: SystemUser[]): Intervention[] => {
    const interventions: Intervention[] = [];
    const techIds = technicians.map(t => t.id);
    
    // Ensure we have clients to generate interventions for
    const targetClients = clients.length > 0 ? clients : generateClients(10);
    
    targetClients.forEach(client => {
        // Increase probability of intervention generation (skip only 10%)
        if (Math.random() > 0.9) return;
        
        const count = getRandomInt(2, 5);
        for (let i = 0; i < count; i++) {
            // Generate dates around NOW ( +/- 30 days) to ensure visibility
            const now = new Date();
            const startRange = new Date(now);
            startRange.setDate(now.getDate() - 30);
            const endRange = new Date(now);
            endRange.setDate(now.getDate() + 30);

            const date = getRandomDate(startRange, endRange);
            const status = date < new Date() ? 'COMPLETED' : 'SCHEDULED';
            
            interventions.push({
                id: `INT-${getRandomInt(1000, 9999)}`,
                tenantId: client.tenantId,
                clientId: client.name,
                technicianId: getRandomElement(techIds) || 'TECH-001', // Fallback tech
                type: Math.random() > 0.5 ? 'INSTALLATION' : 'DEPANNAGE',
                nature: getRandomElement(['Installation', 'Dépannage', 'Remplacement']),
                status: status as any,
                scheduledDate: date.toISOString(),
                duration: getRandomInt(60, 180), // 1h to 3h
                location: `${client.city} - Site Principal`,
                createdAt: new Date(date.getTime() - 86400000 * 5).toISOString(),
                vehicleType: getRandomElement(['VL', 'VUL', 'PL']),
                licensePlate: `AA-${getRandomInt(100, 999)}-BB`
            });
        }
    });
    return interventions;
};

export const generateLeads = (count: number): Lead[] => {
    return Array.from({ length: count }).map((_, i) => {
        const companyName = `${getRandomElement(COMPANY_PREFIXES)} ${getRandomElement(COMPANY_NAMES)}`;
        return {
            id: `LEAD-${1000 + i}`,
            tenantId: 'tenant_default',
            companyName: companyName,
            contactName: `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`,
            email: `contact@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
            status: getRandomElement(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']),
            potentialValue: getRandomInt(1000, 50000),
            assignedTo: 'USR-002',
            createdAt: getRandomDate(new Date('2024-01-01'), new Date())
        };
    });
};

export const generateAlerts = (count: number, vehicles?: Vehicle[]): Alert[] => {
    return Array.from({ length: count }).map((_, i) => {
        const type = getRandomElement(['SPEEDING', 'GEOFENCE', 'FUEL_LEVEL', 'FUEL_THEFT']);
        const severity = getRandomElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
        
        let vehicleId = `TRK-${getRandomInt(100, 150)}`;
        let vehicleName = `Truck ${getRandomInt(100, 150)}`;

        if (vehicles && vehicles.length > 0) {
            const vehicle = getRandomElement(vehicles);
            vehicleId = vehicle.id;
            vehicleName = vehicle.name;
        }

        return {
            id: 1000 + i,
            vehicleId: vehicleId,
            vehicleName: vehicleName,
            type: type as any,
            severity: severity as any,
            message: `${type} alert detected for ${vehicleName}`,
            isRead: Math.random() > 0.5,
            createdAt: getRandomDate(new Date(Date.now() - 86400000 * 7), new Date()).toISOString()
        };
    });
};

export const generateTiers = (count: number): Tier[] => {
    const tiers: Tier[] = [];
    
    // 1. Create Resellers (approx 10%)
    const resellerCount = Math.max(2, Math.floor(count * 0.1));
    const resellers: Tier[] = [];
    
    // Add Specific Resellers requested by user
    const specificResellers: Tier[] = [
        {
            id: 'TIER-RES-ABIDJAN',
            tenantId: 'tenant_abidjan',
            type: 'RESELLER',
            name: 'ABIDJAN GPS',
            email: 'contact@abidjangps.ci',
            phone: '+225 07 07 07 07 07',
            address: 'Plateau, Abidjan',
            city: 'Abidjan',
            country: 'Côte d\'Ivoire',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            resellerData: {
                domain: 'abidjan-gps.tracking.com',
                logo: 'https://ui-avatars.com/api/?name=Abidjan+GPS&background=random'
            }
        },
        {
            id: 'TIER-RES-SMARTRACK',
            tenantId: 'tenant_smartrack',
            type: 'RESELLER',
            name: 'SMARTRACK SOLUTIONS',
            email: 'info@smartrack.sn',
            phone: '+221 77 777 77 77',
            address: 'Mermoz, Dakar',
            city: 'Dakar',
            country: 'Sénégal',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            resellerData: {
                domain: 'smartrack.tracking.com',
                logo: 'https://ui-avatars.com/api/?name=Smartrack&background=random'
            }
        }
    ];
    
    resellers.push(...specificResellers);
    tiers.push(...specificResellers);

    for (let i = 0; i < resellerCount - 2; i++) {
        const companyName = `${getRandomElement(COMPANY_PREFIXES)} ${getRandomElement(COMPANY_NAMES)} Reseller`;
        const reseller: Tier = {
            id: `TIER-RES-${1000 + i}`,
            tenantId: 'tenant_default',
            type: 'RESELLER',
            name: companyName,
            email: `contact@${companyName.toLowerCase().replace(/\s/g, '-')}.com`,
            phone: `+33 6 ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)}`,
            address: `${getRandomInt(1, 150)} rue de la République`,
            city: getRandomElement(CITIES),
            country: 'France',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            resellerData: {
                activeClients: 0 // Will update later
            }
        };
        resellers.push(reseller);
        tiers.push(reseller);
    }

    // 2. Create Clients (approx 60%)
    const clientCount = Math.floor(count * 0.6);
    for (let i = 0; i < clientCount; i++) {
        const companyName = `${getRandomElement(COMPANY_PREFIXES)} ${getRandomElement(COMPANY_NAMES)} ${getRandomElement(COMPANY_SUFFIXES)}`;
        const assignedReseller = Math.random() > 0.3 ? getRandomElement(resellers) : undefined; // 70% chance of having a reseller
        
        tiers.push({
            id: `TIER-CLT-${1000 + i}`,
            tenantId: 'tenant_default',
            type: 'CLIENT',
            name: companyName,
            email: `contact@${companyName.toLowerCase().replace(/\s/g, '-')}.com`,
            phone: `+33 6 ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)}`,
            address: `${getRandomInt(1, 150)} rue de la République`,
            city: getRandomElement(CITIES),
            country: 'France',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            clientData: {
                subscriptionPlan: 'Pro',
                fleetSize: getRandomInt(5, 50),
                resellerId: assignedReseller?.id
            }
        });
    }

    // 3. Create Suppliers & Prospects (Remaining)
    const remaining = count - resellerCount - clientCount;
    for (let i = 0; i < remaining; i++) {
        const type = i % 2 === 0 ? 'SUPPLIER' : 'PROSPECT';
        const companyName = `${getRandomElement(COMPANY_PREFIXES)} ${getRandomElement(COMPANY_NAMES)} ${type === 'SUPPLIER' ? 'Supply' : ''}`;
        
        tiers.push({
            id: `TIER-${type.substring(0,3)}-${1000 + i}`,
            tenantId: 'tenant_default',
            type: type,
            name: companyName,
            email: `contact@${companyName.toLowerCase().replace(/\s/g, '-')}.com`,
            phone: `+33 6 ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)} ${getRandomInt(10, 99)}`,
            address: `${getRandomInt(1, 150)} rue de la République`,
            city: getRandomElement(CITIES),
            country: 'France',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }

    return tiers;
};

export const generateInitialStock = (vehicles: Vehicle[]): DeviceStock[] => {
    const stock: DeviceStock[] = [];
    
    // 1. Installed Devices (linked to vehicles)
    vehicles.forEach(v => {
        stock.push({
            id: `DEV-${v.id}`,
            tenantId: v.tenantId,
            type: 'BOX',
            serialNumber: `IMEI-${v.id.split('-')[1]}`,
            imei: `IMEI-${v.id.split('-')[1]}`,
            model: 'FMB920',
            status: 'INSTALLED',
            assignedVehicleId: v.id,
            location: 'TECH',
            entryDate: new Date('2023-01-01').toISOString(),
            installationDate: new Date('2023-02-01').toISOString()
        });
    });

    // 2. Stock Devices
    for (let i = 0; i < 20; i++) {
        stock.push({
            id: `DEV-STOCK-${i}`,
            tenantId: 'tenant_default',
            type: 'BOX',
            serialNumber: `IMEI-STOCK-${i}`,
            imei: `IMEI-STOCK-${i}`,
            model: 'FMB140',
            status: 'IN_STOCK',
            location: 'CENTRAL',
            entryDate: new Date().toISOString()
        });
    }

    return stock;
};

export const generateAnomalies = (vehicles: Vehicle[]): Anomaly[] => {
    const anomalies: Anomaly[] = [];
    const types: Anomaly['type'][] = ['FUEL', 'GEOFENCE', 'SPEED', 'IDLE', 'MAINTENANCE'];
    const severities: Anomaly['severity'][] = ['CRITICAL', 'WARNING', 'INFO'];

    vehicles.forEach(vehicle => {
        if (Math.random() > 0.8) { // 20% chance of anomaly
            const type = getRandomElement(types);
            let description = '';
            let value: string | number | undefined = undefined;
            let threshold: string | number | undefined = undefined;

            switch (type) {
                case 'FUEL':
                    description = 'Perte de carburant suspecte détectée';
                    value = `${getRandomInt(10, 50)} L`;
                    threshold = '5 L';
                    break;
                case 'IDLE':
                    description = 'Stationnement moteur tournant excessif';
                    value = `${getRandomInt(30, 120)} min`;
                    threshold = '20 min';
                    break;
                case 'SPEED':
                    description = 'Excès de vitesse important';
                    value = `${getRandomInt(110, 150)} km/h`;
                    threshold = '90 km/h';
                    break;
                default:
                    description = `Anomalie de type ${type} détectée`;
            }

            anomalies.push({
                id: `ANM-${getRandomInt(10000, 99999)}`,
                vehicleId: vehicle.id,
                vehicleName: vehicle.name,
                type: type,
                severity: getRandomElement(severities),
                timestamp: new Date(Date.now() - getRandomInt(0, 86400000)).toISOString(),
                description: description,
                value: value,
                threshold: threshold,
                status: 'OPEN'
            });
        }
    });
    return anomalies;
};

export const generateUserActivity = (count: number): UserActivity[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `UA-${i}`,
        userId: `USR-${i}`,
        userName: `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`,
        email: `user${i}@example.com`,
        role: Math.random() > 0.8 ? 'ADMIN' : 'CLIENT',
        lastLogin: new Date(Date.now() - getRandomInt(0, 86400000)).toISOString(),
        status: Math.random() > 0.7 ? 'ONLINE' : (Math.random() > 0.5 ? 'AWAY' : 'OFFLINE'),
        failedAttempts: Math.random() > 0.9 ? getRandomInt(1, 5) : 0,
        accountStatus: Math.random() > 0.95 ? 'LOCKED' : 'ACTIVE',
        ipAddress: `192.168.1.${getRandomInt(1, 255)}`,
        location: getRandomElement(CITIES)
    }));
};

export const INITIAL_ROLES: Role[] = [
    {
        id: 'role_superadmin',
        name: 'Super Admin',
        isSystem: true,
        permissions: [
            'VIEW_DASHBOARD', 'VIEW_MAP', 'VIEW_REPORTS', 'VIEW_LOGS',
            'VIEW_VEHICLES', 'CREATE_VEHICLES', 'EDIT_VEHICLES', 'DELETE_VEHICLES',
            'VIEW_DRIVERS', 'CREATE_DRIVERS', 'EDIT_DRIVERS', 'DELETE_DRIVERS',
            'VIEW_CRM', 'VIEW_LEADS', 'CREATE_LEADS', 'EDIT_LEADS', 'DELETE_LEADS',
            'VIEW_CLIENTS', 'CREATE_CLIENTS', 'EDIT_CLIENTS', 'DELETE_CLIENTS',
            'VIEW_CONTRACTS', 'CREATE_CONTRACTS', 'EDIT_CONTRACTS', 'DELETE_CONTRACTS',
            'VIEW_FINANCE', 'VIEW_INVOICES', 'CREATE_INVOICES', 'EDIT_INVOICES', 'DELETE_INVOICES',
            'VIEW_PAYMENTS', 'CREATE_PAYMENTS', 'EDIT_PAYMENTS', 'DELETE_PAYMENTS',
            'VIEW_TECH', 'VIEW_INTERVENTIONS', 'CREATE_INTERVENTIONS', 'EDIT_INTERVENTIONS', 'DELETE_INTERVENTIONS',
            'VIEW_STOCK', 'CREATE_STOCK', 'EDIT_STOCK', 'DELETE_STOCK',
            'VIEW_DEVICES', 'CREATE_DEVICES', 'EDIT_DEVICES', 'DELETE_DEVICES',
            'VIEW_SUPPORT', 'VIEW_TICKETS', 'CREATE_TICKETS', 'EDIT_TICKETS', 'DELETE_TICKETS',
            'VIEW_ADMIN', 'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
            'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES'
        ]
    },
    {
        id: 'role_manager',
        name: 'Manager',
        isSystem: false,
        permissions: [
            'VIEW_DASHBOARD', 'VIEW_MAP', 'VIEW_REPORTS',
            'VIEW_VEHICLES', 'EDIT_VEHICLES',
            'VIEW_DRIVERS', 'EDIT_DRIVERS',
            'VIEW_CRM', 'VIEW_LEADS', 'EDIT_LEADS',
            'VIEW_CLIENTS', 'EDIT_CLIENTS',
            'VIEW_CONTRACTS',
            'VIEW_FINANCE', 'VIEW_INVOICES',
            'VIEW_TECH', 'VIEW_INTERVENTIONS',
            'VIEW_STOCK',
            'VIEW_SUPPORT', 'VIEW_TICKETS', 'EDIT_TICKETS'
        ]
    },
    {
        id: 'role_sales',
        name: 'Commercial',
        isSystem: false,
        permissions: [
            'VIEW_DASHBOARD', 'VIEW_CRM',
            'VIEW_LEADS', 'CREATE_LEADS', 'EDIT_LEADS',
            'VIEW_CLIENTS', 'CREATE_CLIENTS', 'EDIT_CLIENTS',
            'VIEW_CONTRACTS', 'CREATE_CONTRACTS',
            'VIEW_QUOTES', 'CREATE_QUOTES', 'EDIT_QUOTES'
        ]
    },
    {
        id: 'role_tech',
        name: 'Technicien',
        isSystem: false,
        permissions: [
            'VIEW_DASHBOARD', 'VIEW_TECH',
            'VIEW_INTERVENTIONS', 'EDIT_INTERVENTIONS',
            'VIEW_STOCK', 'EDIT_STOCK',
            'VIEW_DEVICES'
        ]
    },
    {
        id: 'role_support',
        name: 'Support Client',
        isSystem: false,
        permissions: [
            'VIEW_DASHBOARD', 'VIEW_SUPPORT',
            'VIEW_TICKETS', 'CREATE_TICKETS', 'EDIT_TICKETS',
            'VIEW_CLIENTS',
            'VIEW_VEHICLES'
        ]
    },
    {
        id: 'role_user',
        name: 'Utilisateur',
        isSystem: false,
        permissions: [
            'VIEW_DASHBOARD', 'VIEW_MAP'
        ]
    }
];

