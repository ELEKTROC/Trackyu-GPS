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
  })
}));

// Mock useCurrency
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({
    currency: 'XOF',
    formatPrice: (amount: number) => `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`,
  })
}));

// Mock useConfirmDialog
vi.mock('../components/ConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    ConfirmDialogComponent: () => null,
  })
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false, error: null }),
  };
});

// Mock Data
const mockClients = [
  { id: 'c1', name: 'Client A', email: 'a@test.com', phone: '123', address: '123 St', status: 'ACTIVE', type: 'CORPORATE' }
];

const mockInterventions = [
  { 
    id: 'int1', 
    clientId: 'c1', 
    vehicleId: 'v1', 
    techId: 't1', 
    type: 'INSTALLATION', 
    nature: 'GPS',
    status: 'COMPLETED', 
    date: '2023-01-01',
    description: 'Install GPS',
    cost: 100
  },
  { 
    id: 'int2', 
    clientId: 'c1', 
    vehicleId: 'v1', 
    techId: 't1', 
    type: 'REPAIR', 
    nature: 'Maintenance',
    status: 'SCHEDULED', // Not completed, should not show
    date: '2023-01-02',
    description: 'Repair GPS',
    cost: 50
  }
];

const mockInvoices = [];

// Mock Functions
const mockAddInvoice = vi.fn();
const mockShowToast = vi.fn();

const renderWithContext = (component: React.ReactNode) => {
  return render(
    <ToastContext.Provider value={{ showToast: mockShowToast, toasts: [], removeToast: vi.fn() }}>
      <DataContext.Provider value={{
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
        resetData: vi.fn()
      } as any}>
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
    expect(screen.getByText('Gestion de la Facturation')).toBeInTheDocument();
    expect(screen.getByText('Créer')).toBeInTheDocument();
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

    // Should see the completed intervention
    expect(screen.getByText(/INSTALLATION - GPS/i)).toBeInTheDocument();
    
    // Should NOT see the scheduled intervention
    expect(screen.queryByText(/REPAIR - Maintenance/i)).not.toBeInTheDocument();
  });

  it('creates an invoice from selected intervention', async () => {
    renderWithContext(<FinanceView mode="INVOICES" />);
    
    const importButton = screen.getByText(/Importer Interv./i);
    fireEvent.click(importButton);

    // Select the intervention
    const interventionRow = screen.getByText(/INSTALLATION - GPS/i);
    fireEvent.click(interventionRow);

    // Click "Enregistrer" (since it opens the form directly)
    const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(saveButton);

    // Verify addInvoice was called
    expect(mockAddInvoice).toHaveBeenCalled();
    const createdInvoice = mockAddInvoice.mock.calls[0][0];
    
    expect(createdInvoice.clientId).toBe('c1');
    expect(createdInvoice.items[0].description).toContain('Intervention: INSTALLATION - GPS');
    expect(createdInvoice.items[0].price).toBe(100);
  });
});
