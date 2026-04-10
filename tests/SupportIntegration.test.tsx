import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupportViewV2 as SupportView } from '../features/support/components/SupportViewV2';
import { DataContext } from '../contexts/DataContext';
import { ToastContext } from '../contexts/ToastContext';
import { AuthContext } from '../contexts/AuthContext';
import { Ticket, Client, Vehicle } from '../types';

// Mock Data
const mockTickets: Ticket[] = [
  { 
    id: 'T-5001', 
    tenantId: 'tenant_default', 
    clientId: 'CLT-1001', 
    subject: 'Technique - Panne GPS - TRK-001', 
    status: 'OPEN', 
    priority: 'HIGH', 
    category: 'Technique',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    description: 'Le véhicule ne remonte plus de position.',
    messages: []
  },
  { 
    id: 'T-5002', 
    tenantId: 'tenant_default', 
    clientId: 'CLT-1002', 
    subject: 'Facturation - Erreur', 
    status: 'RESOLVED', 
    priority: 'MEDIUM', 
    category: 'Facturation',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
    description: 'Erreur de montant.',
    messages: []
  }
];

const mockClients: Client[] = [
  { id: 'CLT-1001', name: 'Logistics Pro', type: 'B2B', status: 'ACTIVE', tenantId: 'tenant_default', createdAt: new Date(), updatedAt: new Date() },
  { id: 'CLT-1002', name: 'Transport Express', type: 'B2B', status: 'ACTIVE', tenantId: 'tenant_default', createdAt: new Date(), updatedAt: new Date() }
];

const mockVehicles: Vehicle[] = [
  { id: 'TRK-001', name: 'Scania R500', type: 'TRUCK', status: 'MOVING', plate: 'AB-123-CD', clientId: 'CLT-1001', createdAt: new Date(), updatedAt: new Date() }
];

// Helper to render with providers
const renderWithContext = (ui: React.ReactElement, contextValues: any = {}) => {
  const mockShowToast = vi.fn();
  
  const defaultContext = {
    tickets: mockTickets,
    clients: mockClients,
    vehicles: mockVehicles,
    interventions: [],
    users: [],
    stock: [],
    tiers: [],
    slaConfig: null,
    ticketCategories: [
      { id: 'cat-1', name: 'Technique' },
      { id: 'cat-2', name: 'Facturation' },
      { id: 'cat-3', name: 'Commercial' }
    ],
    ticketSubcategories: [
      { id: 'sub-1', categoryId: 'cat-1', name: 'Panne GPS' },
      { id: 'sub-2', categoryId: 'cat-1', name: 'Installation' },
      { id: 'sub-3', categoryId: 'cat-2', name: 'Erreur montant' }
    ],
    invoices: [],
    addTicket: vi.fn(),
    updateTicket: vi.fn(),
    addIntervention: vi.fn(),
    ...contextValues
  };

  const defaultAuthContext = {
    user: { id: 'USR-001', name: 'Test User', role: 'SUPERADMIN', permissions: [], email: 'test@test.com', avatar: '' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: vi.fn().mockReturnValue(true)
  };

  return {
    ...render(
      <AuthContext.Provider value={defaultAuthContext}>
        <ToastContext.Provider value={{ showToast: mockShowToast, toasts: [], removeToast: vi.fn() }}>
          <DataContext.Provider value={defaultContext as any}>
            {ui}
          </DataContext.Provider>
        </ToastContext.Provider>
      </AuthContext.Provider>
    ),
    mockShowToast,
    mockAddTicket: defaultContext.addTicket,
    mockUpdateTicket: defaultContext.updateTicket
  };
};

describe('SupportView Integration', () => {
  it('renders the ticket list correctly', () => {
    renderWithContext(<SupportView />);
    
    expect(screen.getByText(/Tickets Support/i)).toBeInTheDocument();
    expect(screen.getByText('Technique - Panne GPS - TRK-001')).toBeInTheDocument();
    expect(screen.getByText('Facturation - Erreur')).toBeInTheDocument();
  });

  it('filters tickets by status', async () => {
    renderWithContext(<SupportView />);
    
    // Initial state shows all (or default filter)
    expect(screen.getByText('Technique - Panne GPS - TRK-001')).toBeInTheDocument();
    
    // Click on "Résolu" filter
    const resolvedFilter = screen.getByText('Résolu');
    fireEvent.click(resolvedFilter);
    
    // Should show resolved ticket
    expect(screen.getByText('Facturation - Erreur')).toBeInTheDocument();
    
    // Should NOT show open ticket
    expect(screen.queryByText('Technique - Panne GPS - TRK-001')).not.toBeInTheDocument();
  });

  it('opens the new ticket modal', async () => {
    renderWithContext(<SupportView />);
    
    const newTicketBtn = screen.getByTitle('Créer un ticket');
    fireEvent.click(newTicketBtn);
    
    expect(screen.getByText('Nouveau Ticket')).toBeInTheDocument();
    expect(screen.getByLabelText(/Client/i)).toBeInTheDocument();
  });

  it('creates a new ticket', async () => {
    const { mockAddTicket, mockShowToast } = renderWithContext(<SupportView />);
    
    // Open modal
    fireEvent.click(screen.getByTitle('Créer un ticket'));
    
    // Fill form
    // Client
    const clientSelect = screen.getByLabelText(/Client/i);
    fireEvent.change(clientSelect, { target: { value: 'CLT-1001' } });

    // Category - Use exact match to avoid matching "Sous-catégorie"
    const categorySelect = screen.getByLabelText(/^Catégorie$/i);
    fireEvent.change(categorySelect, { target: { value: 'Technique' } });

    // SubCategory
    const subCategorySelect = screen.getByLabelText(/Sous-catégorie/i);
    fireEvent.change(subCategorySelect, { target: { value: 'Panne GPS' } });

    // Description
    const descInput = screen.getByLabelText(/Description Détaillée/i);
    fireEvent.change(descInput, { target: { value: 'Test Description' } });
    
    // Submit
    const submitBtn = screen.getByText('Créer le Ticket');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(mockAddTicket).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith("Nouveau ticket créé", "success");
    });
  });
});
