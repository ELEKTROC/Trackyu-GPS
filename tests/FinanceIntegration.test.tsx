import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinanceView } from '../features/finance/components/FinanceView';
import { DataContext } from '../contexts/DataContext';
import { ToastContext } from '../contexts/ToastContext';
// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Admin', role: 'ADMIN', tenantId: 'tenant1', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true,
  }),
}));

// Mock useCurrency
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({
    currency: 'XOF',
    formatPrice: (amount: number) => `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`,
  }),
}));

// Mock useConfirmDialog
vi.mock('../components/ConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    ConfirmDialogComponent: () => null,
  }),
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false, error: null }),
    useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn(), getQueryData: vi.fn() }),
    useMutation: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue('INV-2026-0001'),
      isPending: false,
      isLoading: false,
    }),
  };
});

// Mock useTenantBranding
vi.mock('../hooks/useTenantBranding', () => ({
  useTenantBranding: () => ({ branding: null, isLoading: false }),
}));

// Mock Data
const mockClients = [
  {
    id: 'c1',
    name: 'Client A',
    email: 'a@test.com',
    phone: '123',
    address: '123 St',
    status: 'ACTIVE',
    type: 'CORPORATE',
  },
];

const mockInterventions = [
  {
    id: 'int1',
    tenantId: 'tenant1',
    clientId: 'c1',
    vehicleId: 'v1',
    technicianId: 'TECH-001',
    type: 'INSTALLATION',
    nature: 'Installation',
    status: 'COMPLETED',
    scheduledDate: '2023-01-01T10:00:00.000Z',
    createdAt: '2023-01-01T08:00:00.000Z',
    duration: 60,
    location: 'Paris',
    description: 'Install GPS',
    cost: 100,
  },
  {
    id: 'int2',
    tenantId: 'tenant1',
    clientId: 'c1',
    vehicleId: 'v1',
    technicianId: 'TECH-001',
    type: 'DEPANNAGE',
    nature: 'Maintenance',
    status: 'SCHEDULED',
    scheduledDate: '2023-01-02T10:00:00.000Z',
    createdAt: '2023-01-02T08:00:00.000Z',
    duration: 45,
    location: 'Lyon',
    description: 'Repair GPS',
    cost: 50,
  },
];

const mockInvoices: any[] = [];

// Mock Functions
const mockAddInvoice = vi.fn();
const mockShowToast = vi.fn();

const renderWithContext = (component: React.ReactNode) => {
  return render(
    <ToastContext.Provider value={{ showToast: mockShowToast } as any}>
      <DataContext.Provider
        value={
          {
            clients: mockClients,
            tiers: [],
            catalogItems: [],
            interventions: mockInterventions,
            invoices: mockInvoices,
            quotes: [],
            contracts: [],
            vehicles: [],
            zones: [],
            alerts: [],
            leads: [],
            stock: [],
            users: [],
            tickets: [],
            addClient: vi.fn(),
            updateClient: vi.fn(),
            deleteClient: vi.fn(),
            bulkUpdateClientStatus: vi.fn(),
            markAlertAsRead: vi.fn(),
            addVehicle: vi.fn(),
            updateVehicle: vi.fn(),
            addLead: vi.fn(),
            updateLeadStatus: vi.fn(),
            deleteLead: vi.fn(),
            addDevice: vi.fn(),
            updateDevice: vi.fn(),
            deleteDevice: vi.fn(),
            updateIntervention: vi.fn(),
            addIntervention: vi.fn(),
            deleteIntervention: vi.fn(),
            addContract: vi.fn(),
            updateContract: vi.fn(),
            deleteContract: vi.fn(),
            addInvoice: mockAddInvoice,
            updateInvoice: vi.fn(),
            deleteInvoice: vi.fn(),
            addQuote: vi.fn(),
            updateQuote: vi.fn(),
            deleteQuote: vi.fn(),
            addTicket: vi.fn(),
            updateTicket: vi.fn(),
            deleteTicket: vi.fn(),
            addUser: vi.fn(),
            updateUser: vi.fn(),
            deleteUser: vi.fn(),
            toggleSimulation: vi.fn(),
            isSimulationRunning: false,
            isLoading: false,
            resetData: vi.fn(),
          } as any
        }
      >
        {component}
      </DataContext.Provider>
    </ToastContext.Provider>
  );
};

describe('FinanceView Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the invoice list', () => {
    renderWithContext(<FinanceView mode="INVOICES" />);
    // Header renders "Facturation" for INVOICES mode (line 1202 FinanceView)
    expect(screen.getAllByText(/Facturation/i).length).toBeGreaterThan(0);
    // Create button renders "Nouvelle Facture" (line 1234 FinanceView)
    expect(screen.getAllByText(/Nouvelle Facture/i).length).toBeGreaterThan(0);
  });

  it('opens the import intervention modal', async () => {
    renderWithContext(<FinanceView mode="INVOICES" />);

    // Find and click the "Import Intervention" button
    const importButton = screen.getByText(/Importer Interv./i);
    fireEvent.click(importButton);

    expect(screen.getByText("Importer depuis l'Intervention")).toBeInTheDocument();
  });

  it('displays only completed interventions in the import list', async () => {
    renderWithContext(<FinanceView mode="INVOICES" />);

    const importButton = screen.getByText(/Importer Interv./i);
    fireEvent.click(importButton);

    // Should see the completed intervention (nature = 'Installation')
    expect(screen.getByText(/INSTALLATION - Installation/i)).toBeInTheDocument();

    // Should NOT see the scheduled intervention
    expect(screen.queryByText(/DEPANNAGE - Maintenance/i)).not.toBeInTheDocument();
  });

  it('ouvre le formulaire pré-rempli depuis une intervention', async () => {
    renderWithContext(<FinanceView mode="INVOICES" />);

    const importButton = screen.getByText(/Importer Interv./i);
    fireEvent.click(importButton);

    // Select the intervention (nature = 'Installation')
    const interventionRow = screen.getByText(/INSTALLATION - Installation/i);
    fireEvent.click(interventionRow);

    // Le formulaire de facture s'ouvre — vérifier que le bouton Enregistrer est présent
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument();
    });

    // La modal d'import est fermée, le formulaire est ouvert
    expect(screen.queryByText("Importer depuis l'Intervention")).not.toBeInTheDocument();
  });
});
