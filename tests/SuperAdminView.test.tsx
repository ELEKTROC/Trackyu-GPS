import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuperAdminView } from '../features/admin/components/SuperAdminView';
import { ThemeProvider } from '../contexts/ThemeContext';

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

// Mock DataContext
vi.mock('../contexts/DataContext', () => ({
  useDataContext: () => ({
    users: [],
    addUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    currentUser: { role: 'SUPER_ADMIN' },
  }),
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

// Mock ToastContext
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', name: 'Admin', role: 'SUPER_ADMIN', tenantId: 'hq', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true,
  }),
}));

describe('SuperAdminView', () => {
  it('renders super admin view', () => {
    render(
      <ThemeProvider>
        <SuperAdminView />
      </ThemeProvider>
    );

    expect(screen.getAllByText('Revendeurs').length).toBeGreaterThan(0);
    // Text may be split across elements
    expect(screen.getAllByText(/Revendeurs/i).length).toBeGreaterThan(0);
  });
});
