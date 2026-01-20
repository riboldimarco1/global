import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getCachedData, setCachedData, API_TO_CACHE_KEY } from '@/lib/localCache';

export type CacheStatus = 'loading' | 'from_cache' | 'from_server' | 'no_cache';

export type CachedQueryResult<T> = UseQueryResult<T, Error> & {
  cacheStatus: CacheStatus;
};

export function useCachedQuery<T>(
  queryKey: readonly [string, ...unknown[]],
  options?: Omit<UseQueryOptions<T, Error, T, readonly [string, ...unknown[]]>, 'queryKey' | 'initialData'>
): CachedQueryResult<T> {
  const endpoint = queryKey[0] as string;
  const cacheKey = API_TO_CACHE_KEY[endpoint];
  const hasLoggedCache = useRef(false);
  const hasLoggedServer = useRef(false);
  const hadInitialCache = useRef(false);
  
  // Get initial data from localStorage
  const initialData = cacheKey ? getCachedData<T>(cacheKey) : undefined;
  
  // Track if we had cache initially
  if (!hasLoggedCache.current && cacheKey) {
    hadInitialCache.current = !!initialData;
    if (initialData) {
      const count = Array.isArray(initialData) ? initialData.length : 1;
      console.log(`%c[CACHE] ${endpoint} -> Cargado desde caché local (${count} registros)`, 'color: #4CAF50; font-weight: bold');
    } else {
      console.log(`%c[CACHE] ${endpoint} -> Sin datos en caché, esperando servidor...`, 'color: #FF9800; font-weight: bold');
    }
    hasLoggedCache.current = true;
  }
  
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>(
    initialData ? 'from_cache' : 'loading'
  );
  
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
        setCacheStatus('from_server');
      }
    }
  }, [query.data, cacheKey, query.isPlaceholderData, endpoint]);
  
  // Update status when query finishes loading without cache
  useEffect(() => {
    if (!query.isLoading && !hadInitialCache.current && query.data) {
      setCacheStatus('from_server');
    }
  }, [query.isLoading, query.data]);
  
  return { ...query, cacheStatus };
}
