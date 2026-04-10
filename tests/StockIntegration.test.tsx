import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StockView } from '../features/stock/components/StockView';
import { DataContext } from '../contexts/DataContext';
import { ToastContext } from '../contexts/ToastContext';
import type { DeviceStock, Vehicle } from '../types';

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
const mockStock: DeviceStock[] = [
  {
    id: 'DEV-001',
    tenantId: 'tenant1',
    type: 'BOX',
    model: 'FMB120',
    serialNumber: '123456789012345',
    imei: '123456789012345',
    status: 'IN_STOCK',
    location: 'CENTRAL',
  },
  {
    id: 'DEV-002',
    tenantId: 'tenant1',
    type: 'BOX',
    model: 'FMB920',
    serialNumber: '987654321098765',
    imei: '987654321098765',
    status: 'INSTALLED',
    location: 'CENTRAL',
    assignedVehicleId: 'TRK-001',
  },
  {
    id: 'SIM-001',
    tenantId: 'tenant1',
    type: 'SIM',
    model: 'Orange',
    serialNumber: '893301234567890',
    iccid: '893301234567890',
    status: 'IN_STOCK',
    location: 'CENTRAL',
  },
];

const mockVehicles: Vehicle[] = [
  {
    id: 'TRK-001',
    licensePlate: 'AA-123-BB',
    brand: 'Renault',
    model: 'Master',
    status: 'ACTIVE',
    tenantId: 'tenant1',
    createdAt: '',
    updatedAt: '',
  },
];

// Mock useTheme used by child components
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: any) => children,
}));

// Mock useAuth used by child components
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'User', role: 'ADMIN', tenantId: 'tenant1', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true,
  }),
}));

// Helper to render with providers
const renderWithContext = (ui: React.ReactElement, contextValues: any = {}) => {
  const mockShowToast = vi.fn();

  const defaultContext = {
    stock: mockStock,
    vehicles: mockVehicles,
    users: [],
    catalogItems: [],
    tiers: [],
    stockMovements: [],
    updateDevice: vi.fn(),
    addDevice: vi.fn(),
    deleteDevice: vi.fn(),
    addCatalogItem: vi.fn(),
    ...contextValues,
  };

  return {
    ...render(
      <ToastContext.Provider value={{ showToast: mockShowToast, toasts: [], removeToast: vi.fn() }}>
        <DataContext.Provider value={defaultContext as any}>{ui}</DataContext.Provider>
      </ToastContext.Provider>
    ),
    mockShowToast,
    mockUpdateDevice: defaultContext.updateDevice,
  };
};

describe('StockView Integration', () => {
  it('renders the stock list correctly', () => {
    // Start on devices tab where the list is visible
    renderWithContext(<StockView initialTab="DEVICES" />);

    // Check for device list items
    expect(screen.getAllByText('FMB120').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FMB920').length).toBeGreaterThan(0);
    expect(screen.getAllByText('123456789012345').length).toBeGreaterThan(0);
  });

  it('filters stock by tab', async () => {
    renderWithContext(<StockView initialTab="DEVICES" />);

    // Default on devices tab - GPS Boxes visible
    expect(screen.getAllByText('FMB120').length).toBeGreaterThan(0);

    // Switch to SIM tab
    const simTab = screen.getByText('Cartes SIM');
    fireEvent.click(simTab);

    // After switching to SIM tab, GPS devices should not appear
    expect(screen.queryByText('FMB120')).not.toBeInTheDocument();
  });

  it('filters stock by search', async () => {
    renderWithContext(<StockView initialTab="DEVICES" />);

    // Search input is in the devices tab
    const searchInput = screen.getByPlaceholderText('Rechercher (IMEI, ICCID...)');
    fireEvent.change(searchInput, { target: { value: '987654321098765' } });

    expect(screen.getAllByText('FMB920').length).toBeGreaterThan(0);
    expect(screen.queryByText('FMB120')).not.toBeInTheDocument();
  });

  it('opens assignment modal', async () => {
    renderWithContext(<StockView initialTab="DEVICES" />);

    // Find the "Assigner" button for the IN_STOCK item
    const assignBtns = screen.getAllByText('Assigner');
    fireEvent.click(assignBtns[0]);

    // Modal title for GPS assignment
    expect(screen.getAllByText(/Assigner/i).length).toBeGreaterThan(0);
  });
});
