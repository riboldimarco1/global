import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getCachedData, setCachedData, API_TO_CACHE_KEY } from '@/lib/localCache';

export function useCachedQuery<T>(
  queryKey: readonly [string, ...unknown[]],
  options?: Omit<UseQueryOptions<T, Error, T, readonly [string, ...unknown[]]>, 'queryKey' | 'initialData'>
): UseQueryResult<T, Error> {
  const endpoint = queryKey[0] as string;
  const cacheKey = API_TO_CACHE_KEY[endpoint];
  
  // Get initial data from localStorage
  const initialData = cacheKey ? getCachedData<T>(cacheKey) : undefined;
  
  const query = useQuery<T, Error, T, readonly [string, ...unknown[]]>({
    queryKey,
    ...options,
    initialData: initialData ?? undefined,
    // If we have cached data, don't show loading state initially
    initialDataUpdatedAt: initialData ? Date.now() - 1000 : undefined,
    // Keep data fresh but don't block on loading if we have cache
    staleTime: initialData ? 0 : undefined,
  });
  
  // Update localStorage when new data arrives from server
  useEffect(() => {
    if (query.data && cacheKey && !query.isPlaceholderData) {
      setCachedData(cacheKey, query.data);
    }
  }, [query.data, cacheKey, query.isPlaceholderData]);
  
  return query;
}
