import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 60, // Garbage collect after 1 hour
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
