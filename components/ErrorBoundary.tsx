import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  /** 'page' (default): full-screen fallback. 'module': contained inline fallback. */
  variant?: 'page' | 'module';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error:', error.message);
    logger.error('Component stack:', errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.variant === 'module') {
        return (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center p-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Ce module a rencontré une erreur</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Les autres fonctionnalités restent disponibles.
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-elevated)] p-4">
          <div className="max-w-md w-full bg-[var(--bg-elevated)] rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Oups ! Une erreur est survenue</h1>
            <p className="text-[var(--text-secondary)] mb-6">
              L'application a rencontré un problème inattendu. Nous avons été notifiés.
            </p>
            {this.state.error && (
              <div className="mb-6 p-4 bg-[var(--bg-elevated)] bg-[var(--bg-surface)] rounded text-left overflow-auto max-h-32 text-xs font-mono text-red-500">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
