/**
 * TrackYu Mobile — QueryClient singleton
 *
 * Extrait de App.tsx pour être partagé par :
 *   - App.tsx (PersistQueryClientProvider)
 *   - authStore.ts (queryClient.clear() au logout)
 *
 * SÉCURITÉ : la persistance AsyncStorage est volontairement désactivée
 * (shouldDehydrateQuery: () => false) pour éviter de stocker en clair
 * des données sensibles (GPS, factures, tickets) sur le système de fichiers.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 30, // 30 min en mémoire seulement (pas de persistance disque)
    },
    mutations: { retry: 1 },
  },
});
