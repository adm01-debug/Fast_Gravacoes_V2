/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];

interface InfiniteScrollOptions {
  tableName: TableName;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | string[]>;
  select?: string;
  enabled?: boolean;
}

export function useInfiniteScroll<T = Record<string, unknown>>({
  tableName,
  pageSize = 20,
  sortBy = 'created_at',
  sortOrder = 'desc',
  filters,
  select = '*',
  enabled = true,
}: InfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [sentinelRef, setSentinelRef] = useState<HTMLElement | null>(null);

  const query = useInfiniteQuery<T[]>({
    queryKey: ['infinite-scroll', tableName, pageSize, sortBy, sortOrder, filters, select],
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * pageSize;
      const to = from + pageSize - 1;

      // Casting to never to bypass deep type checks for dynamic table names while remaining safer than any
      let q = supabase.from(tableName as never).select(select);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.length > 0) {
            if (Array.isArray(value)) {
              q = q.in(key, value);
            } else {
              q = q.eq(key, value);
            }
          }
        });
      }

      q = q.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length;
    },
    enabled,
  });

  const allItems = query.data?.pages.flat() ?? [];

  useEffect(() => {
    if (!sentinelRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observerRef.current.observe(sentinelRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [sentinelRef, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const reset = useCallback(() => {
    query.refetch();
  }, [query]);

  return {
    items: allItems,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    error: query.error,
    fetchMore: query.fetchNextPage,
    reset,
    setSentinelRef,
    totalLoaded: allItems.length,
  };
}
