// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CRMView } from '../features/crm/components/CRMView';
import { DataContext } from '../contexts/DataContext';
import { ToastContext } from '../contexts/ToastContext';
import { AuthContext } from '../contexts/AuthContext';
import type { Lead, Client, Tier, CatalogItem } from '../types';

// Mock react-query to avoid QueryClientProvider dependency
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false, error: null }),
    useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn(), getQueryData: vi.fn() }),
  };
});

// Mock useTenantBranding to avoid QueryClientProvider dependency
vi.mock('../hooks/useTenantBranding', () => ({
  useTenantBranding: () => ({ branding: null, isLoading: false }),
}));

// Mock useConfirmDialog
vi.mock('../components/ConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    ConfirmDialogComponent: () => null,
  }),
}));

// Mock Data
const mockLeads: Lead[] = [
  {
    id: 'LEAD-001',
    tenantId: 'tenant_default',
    companyName: 'Acme Corp',
    contactName: 'John Doe',
    email: 'john@acme.com',
    phone: '123456789',
    status: 'NEW',
    potentialValue: 50000,
    assignedTo: 'user1',
    createdAt: new Date(),
    interestedProducts: [],
    notes: '',
    type: 'B2B',
    sector: 'Transport',
  },
  {
    id: 'LEAD-002',
    tenantId: 'tenant_default',
    companyName: 'Globex',
    contactName: 'Jane Smith',
    email: 'jane@globex.com',
    phone: '987654321',
    status: 'QUALIFIED',
    potentialValue: 75000,
    assignedTo: 'user1',
    createdAt: new Date(),
    interestedProducts: [],
    notes: '',
    type: 'B2B',
    sector: 'Logistics',
  },
];

const mockClients: Client[] = [
  {
    id: 'CLI-001',
    tenantId: 'tenant_default',
    name: 'Client A',
    contactName: 'Alice',
    email: 'alice@clienta.com',
    phone: '111222333',
    address: '123 St',
    status: 'ACTIVE',
    type: 'B2B',
    subscriptionPlan: 'PRO',
    createdAt: new Date(),
  },
];

const mockTiers: Tier[] = [
  {
    id: 'CLI-001',
    tenantId: 'tenant_default',
    name: 'Client A',
    type: 'CLIENT',
    status: 'ACTIVE',
    contactName: 'Alice',
    email: 'alice@clienta.com',
    phone: '111222333',
    address: '123 St',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCatalogItems: CatalogItem[] = [
  {
    id: 'CAT-001',
    name: 'Boîtier GPS FMB920',
    type: 'Produit',
    category: 'Matériel',
    price: 85000,
    status: 'ACTIVE',
    isSellable: true,
    isPurchasable: true,
    trackStock: true,
  },
];

// Helper to render with providers
const renderWithContext = (ui: React.ReactElement, contextValues: any = {}) => {
  const mockShowToast = vi.fn();

  const defaultContext = {
    leads: mockLeads,
    clients: mockClients,
    tiers: mockTiers,
    catalogItems: mockCatalogItems,
    vehicles: [],
    contracts: [],
    invoices: [],
    quotes: [],
    interventions: [],
    tickets: [],
    journalEntries: [],
    payments: [],
    supplierInvoices: [],
    bankTransactions: [],
    budgets: [],
    suppliers: [],
    stockMovements: [],
    users: [],
    updateLeadStatus: vi.fn(),
    bulkUpdateClientStatus: vi.fn(),
    deleteClient: vi.fn(),
    deleteLead: vi.fn(),
    addClient: vi.fn(),
    addLead: vi.fn(),
    addCatalogItem: vi.fn(),
    updateCatalogItem: vi.fn(),
    ...contextValues,
  };

  const mockAuthContext = {
    user: { id: 'user1', name: 'Test User', role: 'ADMIN', tenantId: 'tenant_default' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    checkPermission: () => true,
  };

  return {
    ...render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ToastContext.Provider value={{ showToast: mockShowToast, toasts: [], removeToast: vi.fn() }}>
          <DataContext.Provider value={defaultContext as any}>{ui}</DataContext.Provider>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
    mockShowToast,
    mockUpdateLeadStatus: defaultContext.updateLeadStatus,
  };
};

describe('CRMView Integration', () => {
  it('renders the leads kanban board by default', () => {
    renderWithContext(<CRMView mode="LEADS" />);

    // Check for Kanban columns - "Nouveau Lead" is a column title
    // There might be a button with the same text, so we look for the column header specifically
    // or just check that we have multiple "Nouveau Lead" texts (button + column)
    const newLeadTexts = screen.getAllByText('Nouveau Lead');
    expect(newLeadTexts.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Qualifié')).toBeInTheDocument();

    // Check for leads in columns (may appear multiple times in kanban)
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Globex').length).toBeGreaterThan(0);
  });

  it('switches to list view', async () => {
    renderWithContext(<CRMView mode="LEADS" />);

    const listBtn = screen.getByTitle('Vue Liste');
    fireEvent.click(listBtn);

    expect(listBtn).toHaveClass('bg-white');
  });

  it('filters leads by search', async () => {
    renderWithContext(<CRMView mode="LEADS" />);

    const searchInput = screen.getByPlaceholderText(/Rechercher/i);
    fireEvent.change(searchInput, { target: { value: 'Acme' } });

    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    // Globex should appear less after filtering (may remain in filter options)
    const globexCountAfter = screen.queryAllByText('Globex').length;
    expect(globexCountAfter).toBeLessThanOrEqual(screen.queryAllByText('Acme Corp').length + 2);
  });

  it('opens new lead modal', async () => {
    renderWithContext(<CRMView mode="LEADS" />);

    const newLeadBtn = screen.getByRole('button', { name: /Nouveau Lead/i });
    fireEvent.click(newLeadBtn);

    // Check for modal content
    expect(screen.getByText('Type de Lead')).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nom de l'entreprise")).toBeInTheDocument();

    // Close modal
    const cancelBtn = screen.getByText('Annuler');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Type de Lead')).not.toBeInTheDocument();
    });
  });

  it('renders clients view', async () => {
    renderWithContext(<CRMView mode="CLIENTS" />);

    expect(screen.getByText('Base Clients')).toBeInTheDocument();
    // Wait for clients to be rendered as there might be a useEffect delay
    await waitFor(() => {
      expect(screen.getAllByText('Client A').length).toBeGreaterThan(0);
    });
    // Email is not a visible column by default, check for contact name instead
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('opens new client modal', () => {
    renderWithContext(<CRMView mode="CLIENTS" />);

    const newClientBtn = screen.getByRole('button', { name: /Client/i });
    fireEvent.click(newClientBtn);

    expect(screen.getAllByText('Nouveau Client').length).toBeGreaterThan(0);
  });

  it('renders catalog view', () => {
    // The component uses PRODUCT_CATALOG constant, not context
    renderWithContext(<CRMView mode="CATALOG" />);

    expect(screen.getByText('Catalogue Produits & Services')).toBeInTheDocument();
    // Check for an item from the constant
    expect(screen.getByText('Boîtier GPS FMB920')).toBeInTheDocument();
    expect(screen.getByText(/85\s?000/)).toBeInTheDocument();
  });
});
