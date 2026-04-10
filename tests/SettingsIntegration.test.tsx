import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsView } from '../features/settings/components/SettingsView';
import React from 'react';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock all context hooks that SettingsView uses
vi.mock('../contexts/DataContext', () => ({
  useDataContext: () => ({
    clients: [],
    vehicles: [],
    users: [],
    tiers: [],
    alerts: [],
    ticketCategories: [],
    ticketSubcategories: [],
    slaConfig: null,
    invoices: [],
    contracts: [],
    updateUser: vi.fn(),
  })
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Admin', role: 'ADMIN', tenantId: 'tenant1', email: 'admin@test.com', permissions: [] },
    hasPermission: () => true,
    isAuthenticated: true,
  })
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkMode: false,
    toggleTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => children,
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => children,
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: () => <div>BarChart</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  LineChart: () => <div>LineChart</div>,
  Line: () => <div>Line</div>,
}));

describe('SettingsView Integration', () => {
  it('renders settings view', () => {
    render(<SettingsView />);
    expect(screen.getByText('Profil')).toBeDefined();
  });
});
