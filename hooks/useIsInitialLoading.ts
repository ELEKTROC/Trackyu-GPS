import { useIsFetching } from '@tanstack/react-query';

/**
 * Hook to detect if we're in an initial loading state
 * Returns true when data is empty and queries are still fetching
 * 
 * @param queryKeys - Array of query key prefixes to check
 * @param dataArrays - Array of data arrays to check for emptiness
 * @returns boolean - true if initial loading, false otherwise
 */
export function useIsInitialLoading(
  queryKeys: string[],
  dataArrays: any[][]
): boolean {
  // Check if any of the specified queries are fetching
  const fetchingCounts = queryKeys.map(key => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useIsFetching({ queryKey: [key] })
  );
  
  const isAnyFetching = fetchingCounts.some(count => count > 0);
  const isAllDataEmpty = dataArrays.every(arr => !arr || arr.length === 0);
  
  return isAnyFetching && isAllDataEmpty;
}

/**
 * Simple hook for single query key
 */
export function useQueryLoading(queryKey: string, data: any[]): boolean {
  const fetchingCount = useIsFetching({ queryKey: [queryKey] });
  const isEmpty = !data || data.length === 0;
  
  return fetchingCount > 0 && isEmpty;
}
