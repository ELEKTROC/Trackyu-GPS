/**
 * TrackYu Mobile - Main App Entry
 */
import React from 'react';
import { StatusBar, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from './lib/queryClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { RootNavigator } from './navigation';
import { linking } from './navigation/linking';
import { navigationRef } from './navigation/navigationRef';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useVehicleSync } from './hooks/useVehicleSync';
import { OfflineBanner } from './components/OfflineBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { useAppVersionCheck } from './hooks/useAppVersionCheck';
import { ThemeProvider, useTheme } from './theme';

// ── Sentry ────────────────────────────────────────────────────────────────────
const _sentryDsn: string = Constants.expoConfig?.extra?.sentryDsn ?? '';

// Champs à redacter dans les events Sentry (données personnelles / GPS)
const SENTRY_REDACT_FIELDS = new Set([
  'lat',
  'lng',
  'latitude',
  'longitude',
  'position',
  'coordinates',
  'nom',
  'name',
  'email',
  'phone',
  'tel',
  'mobile',
  'plate',
  'imei',
  'token',
  'password',
  'authorization',
]);

function redactSentryData(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENTRY_REDACT_FIELDS.has(k.toLowerCase()) ? '[Filtered]' : redactSentryData(v, depth + 1);
  }
  return result;
}

Sentry.init({
  dsn: _sentryDsn,
  environment: __DEV__ ? 'development' : 'production',
  beforeSend(event) {
    // Supprimer les events liés à l'auth et au réseau (pas actionnables)
    const errorType = event.extra?.['code'];
    if (errorType === 'AUTH' || errorType === 'NETWORK') return null;

    // Redacter les breadcrumbs (peuvent contenir des URLs avec tokens)
    // Note : dans Sentry 7.x, breadcrumbs.values peut être un ArrayIterator — on
    // le normalise en tableau avant d'appliquer .map() pour éviter un TypeError.
    if (event.breadcrumbs?.values) {
      const rawValues = event.breadcrumbs.values as unknown;
      const bcrumbs: Sentry.Breadcrumb[] = Array.isArray(rawValues)
        ? rawValues
        : typeof rawValues === 'function'
          ? Array.from((rawValues as () => Iterable<Sentry.Breadcrumb>)())
          : [];
      event.breadcrumbs.values = bcrumbs.map((b) => ({
        ...b,
        data: b.data ? (redactSentryData(b.data) as typeof b.data) : b.data,
      }));
    }

    // Redacter les headers de requête (Authorization, Cookie…)
    if (event.request?.headers) {
      event.request.headers = { ...event.request.headers, Authorization: '[Filtered]', Cookie: '[Filtered]' };
    }

    // Redacter les extra data (peuvent contenir des snapshots de véhicules/conducteurs)
    if (event.extra) {
      event.extra = redactSentryData(event.extra) as typeof event.extra;
    }

    return event;
  },
  tracesSampleRate: __DEV__ ? 0 : 0.2,
});

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

// ── React Query persister ─────────────────────────────────────────────────────
// SÉCURITÉ : par défaut aucune query n'est persistée sur disque.
// Seules les queries 'geocode' (coord → adresse, données publiques Nominatim)
// sont whitelistées pour survivre au redémarrage (maxAge 24 h).
// Les données sensibles (GPS, factures, tickets) restent en mémoire uniquement.
// Le buster '2' invalide le cache AsyncStorage des versions précédentes.
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'TRACKYU_QUERY_CACHE',
  throttleTime: 1000,
});

// ── Inner App — accès au ThemeContext ─────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
function AppInner(): React.JSX.Element {
  const { theme } = useTheme();
  const { isOnline } = useNetworkStatus();
  const versionStatus = useAppVersionCheck();
  usePushNotifications();
  useVehicleSync();

  const navigationTheme = {
    dark: theme.isDark,
    colors: {
      primary: theme.primary,
      background: theme.bg.primary,
      card: theme.bg.surface,
      text: theme.text.primary,
      border: theme.border,
      notification: theme.functional.error,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg.primary}
        translucent={false}
      />
      <AppUpdateBanner status={versionStatus} />
      <OfflineBanner visible={!isOnline} />
      <SessionExpiredModal />
      <ErrorBoundary name="Navigation">
        <RootNavigator />
      </ErrorBoundary>
    </NavigationContainer>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: 1000 * 60 * 60 * 24,
            buster: '2', // incrémenté pour invalider l'ancien cache en clair (sécurité)
            dehydrateOptions: {
              // Whitelist : seules les queries 'geocode' (coord → adresse) sont persistées
              shouldDehydrateQuery: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'geocode',
            },
          }}
        >
          <ThemeProvider>
            <AppInner />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default Sentry.wrap(App);
