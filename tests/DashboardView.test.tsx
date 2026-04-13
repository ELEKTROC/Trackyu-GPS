import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardView } from '../features/dashboard/components/DashboardView';
import { ThemeProvider } from '../contexts/ThemeContext';
import { api } from '../services/api';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock API
vi.mock('../services/api', () => ({
  api: {
    analytics: {
      getDashboardStats: vi.fn(),
    },
  },
}));

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

// Mock AuthContext - DashboardView uses useAuth
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Admin', role: 'ADMIN', tenantId: 'tenant1', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true,
  }),
}));

// Mock DataContext - DashboardView uses useDataContext internally
vi.mock('../contexts/DataContext', () => ({
  useDataContext: () => ({
    tiers: [],
    contracts: [],
    invoices: [],
    alerts: [],
    fuelRecords: [],
    maintenanceRecords: [],
  }),
}));

// Mock useCurrency hook
vi.mock('../hooks/useCurrency', () => ({
  useCurrency: () => ({
    currency: 'XOF',
    formatPrice: (amount: number) => `${amount} FCFA`,
  }),
}));

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => {
  const OriginalModule = vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 800 }}>{children}</div>,
    AreaChart: () => <div>AreaChart</div>,
    Area: () => <div>Area</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    CartesianGrid: () => <div>CartesianGrid</div>,
    Tooltip: () => <div>Tooltip</div>,
    BarChart: () => <div>BarChart</div>,
    Bar: () => <div>Bar</div>,
    PieChart: () => <div>PieChart</div>,
    Pie: () => <div>Pie</div>,
    Cell: () => <div>Cell</div>,
    Legend: () => <div>Legend</div>,
  };
});

const mockVehicles = [
  { id: 'V1', name: 'Vehicle 1', status: 'MOVING' },
  { id: 'V2', name: 'Vehicle 2', status: 'STOPPED' },
];

const mockMetrics = {
  totalVehicles: 10,
  activeVehicles: 8,
  maintenanceVehicles: 1,
  alertVehicles: 1,
  totalFuel: 500,
  totalDistance: 1000,
  averageScore: 95,
  avgFuelEfficiency: 0,
  avgDriverScore: 95,
  alerts: 1,
} as any;

const mockStats = {
  revenue: { daily: [], monthly: [] },
  costs: { fuel: 100, maintenance: 50 },
  alerts: { count: 5, critical: 1 },
  utilization: 85,
};

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.analytics.getDashboardStats as any).mockResolvedValue(mockStats);
  });

  it('renders dashboard with metrics', async () => {
    render(
      <ThemeProvider>
        <DashboardView vehicles={mockVehicles as any} metrics={mockMetrics} />
      </ThemeProvider>
    );

    expect(screen.getByText('Véhicules Actifs')).toBeDefined();

    await waitFor(() => {
      expect(api.analytics.getDashboardStats).toHaveBeenCalled();
    });
  });
});
