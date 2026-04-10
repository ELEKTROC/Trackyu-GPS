import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapView } from '../features/map/components/MapView';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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

// Mock Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>MapContainer {children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: ({ children }: any) => <div>Marker {children}</div>,
  Popup: ({ children }: any) => <div>Popup {children}</div>,
  useMap: () => ({ flyTo: vi.fn() }),
  Polyline: () => <div>Polyline</div>
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: any) => <div>Cluster {children}</div>
}));

// Mock useToast to avoid ToastProvider dependency
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
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

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Admin', role: 'ADMIN', tenantId: 'tenant1', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true,
  }),
}));

// Mock DataContext - MapView uses useDataContext internally
vi.mock('../contexts/DataContext', () => ({
  useDataContext: () => ({
    getVehicleHistory: vi.fn(),
    getVehicleHistorySnapped: vi.fn(),
    clients: [],
    branches: [],
  })
}));

const mockVehicles = [
  { id: 'V1', name: 'Vehicle 1', status: 'MOVING', location: { lat: 0, lng: 0 }, lastUpdated: new Date() },
  { id: 'V2', name: 'Vehicle 2', status: 'STOPPED', location: { lat: 1, lng: 1 }, lastUpdated: new Date() }
];

describe('MapView', () => {
  it('renders map view with vehicles', () => {
    render(
      <ThemeProvider>
        <MapView vehicles={mockVehicles as any} />
      </ThemeProvider>
    );

    expect(screen.getByText('MapContainer')).toBeDefined();
    // Search input placeholder updated to match current UI
    expect(screen.getByPlaceholderText('Nom, plaque, IMEI, client...')).toBeDefined();
  });
});
