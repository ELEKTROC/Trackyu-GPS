import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginView } from '../features/auth/components/LoginView';
import { AuthProvider } from '../contexts/AuthContext';

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin
  }),
  AuthProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock ToastContext
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('LoginView', () => {
  it('renders login form', () => {
    render(<LoginView />);
    expect(screen.getByText('Se connecter')).toBeDefined();
    expect(screen.getByPlaceholderText('Saisissez votre compte')).toBeDefined();
  });

  it('calls login on submit', async () => {
    render(<LoginView />);
    
    const emailInput = screen.getByPlaceholderText('Saisissez votre compte');
    const passwordInput = screen.getByPlaceholderText('Entrez votre mot de passe');
    const submitButton = screen.getByText('Se connecter');

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password');
    });
  });
});
