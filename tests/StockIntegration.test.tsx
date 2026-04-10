import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StockView } from '../features/stock/components/StockView';
import { DataContext } from '../contexts/DataContext';
import { ToastContext } from '../contexts/ToastContext';
import { DeviceStock, Vehicle } from '../types';

// Mock Data
const mockStock: DeviceStock[] = [
  { 
    id: 'DEV-001', 
    type: 'BOX', 
    model: 'FMB120', 
    imei: '123456789012345', 
    status: 'IN_STOCK', 
    location: 'CENTRAL', 
    updatedAt: new Date() 
  },
  { 
    id: 'DEV-002', 
    type: 'BOX', 
    model: 'FMB920', 
    imei: '987654321098765', 
    status: 'INSTALLED', 
    location: 'CLIENT', 
    assignedVehicleId: 'TRK-001',
    updatedAt: new Date() 
  },
  {
    id: 'SIM-001',
    type: 'SIM',
    model: 'Orange',
    iccid: '893301234567890',
    status: 'IN_STOCK',
    location: 'CENTRAL',
    updatedAt: new Date()
  }
];

const mockVehicles: Vehicle[] = [
  { id: 'TRK-001', licensePlate: 'AA-123-BB', brand: 'Renault', model: 'Master', status: 'ACTIVE', tenantId: 'tenant1', createdAt: '', updatedAt: '' }
];

// Mock useTheme used by child components  
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false, toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: any) => children
}));

// Mock useAuth used by child components
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'User', role: 'ADMIN', tenantId: 'tenant1', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true
  })
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
    ...contextValues
  };

  return {
    ...render(
      <ToastContext.Provider value={{ showToast: mockShowToast, toasts: [], removeToast: vi.fn() }}>
        <DataContext.Provider value={defaultContext as any}>
          {ui}
        </DataContext.Provider>
      </ToastContext.Provider>
    ),
    mockShowToast,
    mockUpdateDevice: defaultContext.updateDevice
  };
};

describe('StockView Integration', () => {
  it('renders the stock list correctly', () => {
    renderWithContext(<StockView />);
    
    // Check for KPI cards
    expect(screen.getByText('En Stock (GPS)')).toBeInTheDocument();
    
    // Check for list items
    expect(screen.getByText('FMB120')).toBeInTheDocument();
    // IMEI appears twice (in ID column and IMEI column), so we use getAllByText
    expect(screen.getAllByText('123456789012345')[0]).toBeInTheDocument();
  });

  it('filters stock by tab', async () => {
    renderWithContext(<StockView />);
    
    // Default is GPS Boxes
    expect(screen.getByText('FMB120')).toBeInTheDocument();
    expect(screen.queryByText('893301234567890')).not.toBeInTheDocument(); // SIM should not be visible
    
    // Switch to SIM tab
    const simTab = screen.getByText('Cartes SIM');
    fireEvent.click(simTab);
    
    // Check SIM visibility
    // ICCID might also appear twice if we added a column for it, but let's check
    expect(screen.getAllByText('893301234567890')[0]).toBeInTheDocument();
    expect(screen.queryByText('FMB120')).not.toBeInTheDocument(); // GPS should be hidden
  });

  it('filters stock by search', async () => {
    renderWithContext(<StockView />);
    
    // Search for specific IMEI
    const searchInput = screen.getByPlaceholderText('Rechercher (IMEI, ICCID...)');
    fireEvent.change(searchInput, { target: { value: '987654321098765' } });
    
    expect(screen.getByText('FMB920')).toBeInTheDocument();
    expect(screen.queryByText('FMB120')).not.toBeInTheDocument();
  });

  it('opens assignment modal', async () => {
    renderWithContext(<StockView />);
    
    // Find the "Assigner" button for the IN_STOCK item
    const assignBtn = screen.getByText('Assigner');
    fireEvent.click(assignBtn);
    
    expect(screen.getByText('Assigner à un véhicule')).toBeInTheDocument();
  });
});
