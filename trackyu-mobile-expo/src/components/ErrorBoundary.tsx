/**
 * TrackYu Mobile - Error Boundary
 * Classe component — ne peut pas utiliser useTheme(), couleurs statiques brand.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error(`[ErrorBoundary:${this.props.name ?? 'unknown'}]`, error, info);
    }
    Sentry.captureException(error, {
      tags: { errorBoundary: this.props.name ?? 'unknown' },
      contexts: { react: { componentStack: info.componentStack ?? undefined } },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AlertTriangle size={48} color="#E8771A" />
          <Text style={styles.title}>
            {this.props.name ? `Erreur dans "${this.props.name}"` : 'Une erreur est survenue'}
          </Text>
          <Text style={styles.message} numberOfLines={3}>
            {this.state.errorMessage}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Réessayer"
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0D0D0F',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E8771A',
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

/**
 * HOC qui enveloppe un écran avec un ErrorBoundary dédié.
 * Un crash isolé à l'écran n'arrache plus tout l'arbre React.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  name: string
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary name={name}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${name})`;
  return Wrapped;
}
