import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TechView } from '../features/tech/components/TechView';
import { DataContext } from '../contexts/DataContext';
import { ToastContext } from '../contexts/ToastContext';
import { AuthContext } from '../contexts/AuthContext';
import type { Intervention, User, DeviceStock } from '../types';

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

// Mock Data
const mockInterventions: Intervention[] = [
  {
    id: 'INT-001',
    tenantId: 'tenant_default',
    clientId: 'CLT-1001',
    vehicleId: 'TRK-001',
    technicianId: 'TECH-001',
    type: 'INSTALLATION',
    status: 'SCHEDULED',
    scheduledDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: 'Installation GPS',
    duration: 60,
    nature: 'Installation',
    location: '',
  },
  {
    id: 'INT-002',
    tenantId: 'tenant_default',
    clientId: 'CLT-1002',
    vehicleId: 'TRK-002',
    technicianId: 'TECH-001',
    type: 'DEPANNAGE',
    status: 'COMPLETED',
    scheduledDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    createdAt: new Date().toISOString(),
    description: 'Réparation Sonde',
    duration: 45,
    nature: 'Dépannage',
    location: '',
  },
];

const mockUsers: User[] = [
  {
    id: 'TECH-001',
    name: 'Technicien 1',
    role: 'Technicien',
    email: 'tech1@fleet.co',
    avatar: '',
    permissions: [],
    status: 'Actif' as const,
  },
  {
    id: 'ADMIN-001',
    name: 'Admin',
    role: 'SUPERADMIN',
    email: 'admin@fleet.co',
    avatar: '',
    permissions: [],
    status: 'Actif' as const,
  },
];

const mockStock: DeviceStock[] = [
  {
    id: 'DEV-001',
    tenantId: 'tenant_default',
    type: 'BOX',
    serialNumber: '123456789012345',
    model: 'FMB120',
    status: 'IN_STOCK',
    location: 'TECH',
    technicianId: 'TECH-001',
  },
];

// Helper to render with providers
const renderWithContext = (ui: React.ReactElement, contextValues: any = {}) => {
  const mockShowToast = vi.fn();

  const defaultContext = {
    interventions: mockInterventions,
    users: mockUsers,
    stock: mockStock,
    vehicles: [],
    clients: [],
    tickets: [],
    tiers: [],
    branches: [],
    invoices: [],
    contracts: [],
    ticketCategories: [],
    ticketSubcategories: [],
    slaConfig: null,
    updateIntervention: vi.fn(),
    deleteIntervention: vi.fn(),
    addIntervention: vi.fn(),
    updateDevice: vi.fn(),
    updateTicket: vi.fn(),
    ...contextValues,
  };

  const defaultAuthContext = {
    user: mockUsers[0], // Default as Technician
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn().mockReturnValue(true),
  };

  return {
    ...render(
      <AuthContext.Provider value={defaultAuthContext as any}>
        <ToastContext.Provider value={{ showToast: mockShowToast } as any}>
          <DataContext.Provider value={defaultContext as any}>{ui}</DataContext.Provider>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
    mockShowToast,
    mockUpdateIntervention: defaultContext.updateIntervention,
    mockAddIntervention: defaultContext.addIntervention,
  };
};

describe('TechView Integration', () => {
  it('renders the intervention list correctly', () => {
    renderWithContext(<TechView />);

    // Check for the "Liste" button which indicates the view is loaded
    expect(screen.getByText('Liste')).toBeInTheDocument();
    // Check for the intervention description or ID
    expect(screen.getByText('INT-001')).toBeInTheDocument();
    // Use getAllByText because 'INSTALLATION' might appear in the filter dropdown too
    expect(screen.getAllByText('INSTALLATION')[0]).toBeInTheDocument();
  });

  it('filters interventions by status', async () => {
    renderWithContext(<TechView />);

    // Open filter menu
    const filterBtn = screen.getByText('Filtres');
    fireEvent.click(filterBtn);

    // Find the status select
    const statusSelect = screen.getByDisplayValue('Tous les statuts');
    fireEvent.change(statusSelect, { target: { value: 'SCHEDULED' } });

    // Check if filtered
    expect(screen.getByText('INT-001')).toBeInTheDocument();
  });

  it('opens the new intervention modal', async () => {
    renderWithContext(<TechView />);

    const newBtn = screen.getByText('Nouvelle Intervention');
    fireEvent.click(newBtn);

    expect(screen.getByText('Intervention Nouvelle')).toBeInTheDocument();
  });

  it('displays technician stock', async () => {
    renderWithContext(<TechView />);

    // Switch to Stock view
    const stockTab = screen.getByText('Stock');
    fireEvent.click(stockTab);

    expect(screen.getByText('FMB120')).toBeInTheDocument();
    expect(screen.getByText('123456789012345')).toBeInTheDocument();
  });
});
