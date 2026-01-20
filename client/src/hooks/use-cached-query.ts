import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getCachedData, setCachedData, API_TO_CACHE_KEY } from '@/lib/localCache';

export function useCachedQuery<T>(
  queryKey: readonly [string, ...unknown[]],
  options?: Omit<UseQueryOptions<T, Error, T, readonly [string, ...unknown[]]>, 'queryKey' | 'initialData'>
): UseQueryResult<T, Error> {
  const endpoint = queryKey[0] as string;
  const cacheKey = API_TO_CACHE_KEY[endpoint];
  const hasLoggedCache = useRef(false);
  const hasLoggedServer = useRef(false);
  
  // Get initial data from localStorage
  const initialData = cacheKey ? getCachedData<T>(cacheKey) : undefined;
  
  // Log cache hit on first render
  if (!hasLoggedCache.current && cacheKey) {
    if (initialData) {
      const count = Array.isArray(initialData) ? initialData.length : 1;
      console.log(`%c[CACHE] ${endpoint} -> Cargado desde caché local (${count} registros)`, 'color: #4CAF50; font-weight: bold');
    } else {
      console.log(`%c[CACHE] ${endpoint} -> Sin datos en caché, esperando servidor...`, 'color: #FF9800; font-weight: bold');
    }
    hasLoggedCache.current = true;
  }
  
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
      
      // Log server update (only once per mount)
      if (!hasLoggedServer.current) {
        const count = Array.isArray(query.data) ? query.data.length : 1;
        console.log(`%c[SERVER] ${endpoint} -> Actualizado desde servidor (${count} registros)`, 'color: #2196F3; font-weight: bold');
        hasLoggedServer.current = true;
      }
    }
  }, [query.data, cacheKey, query.isPlaceholderData, endpoint]);
  
  return query;
}
