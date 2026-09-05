import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { jobSchema } from '../types/job.schema';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobKey = keyof Job;

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
  filters: Record<string, string | string[]>;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const DEFAULT_OPTIONS: PaginationOptions = {
  page: 1,
  pageSize: 20,
  sortBy: 'created_at',
  sortOrder: 'desc',
  search: '',
  filters: {},
};

export function usePaginatedJobs(initialOptions?: Partial<PaginationOptions>) {
  const [options, setOptions] = useState<PaginationOptions>({
    ...DEFAULT_OPTIONS,
    ...initialOptions,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['paginated-jobs', options],
    queryFn: async () => {
      const { page, pageSize, sortBy, sortOrder, search, filters } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' });

      // Apply search — quote values containing PostgREST structural chars (, ( ) ")
      // so that e.g. "ACME, Inc" is treated as a literal value, not a filter separator.
      const term = search.trim();
      if (term) {
        const ilikePat = `%${term}%`;
        const needsQuote = /[,"().:]/.test(term);
        const v = needsQuote ? `"${ilikePat.replace(/"/g, '""')}"` : ilikePat;
        query = query.or(`client.ilike.${v},product.ilike.${v},order_number.ilike.${v}`);
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.length > 0) {
          if (Array.isArray(value)) {
            query = query.in(key as JobKey, value);
          } else {
            query = query.eq(key as JobKey, value);
          }
        }
      });

      // Apply sorting and pagination
      query = query
        .order(sortBy as JobKey, { ascending: sortOrder === 'asc' })
        .range(from, to);

      const { data: jobs, error, count } = await query;

      if (error) throw error;

      // Runtime validation
      const validatedJobs = (jobs || []).map(job => {
        const result = jobSchema.safeParse(job);
        if (!result.success) {
          import('@/lib/logger').then(({ logger }) => {
            logger.warn('Job validation failed (Paginated)', { error: result.error, jobId: job.id }, 'usePaginatedJobs');
          });
          return job as Job;
        }
        return result.data as Job;
      });

      const totalCount = count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: validatedJobs,
        totalCount,
        totalPages,
        currentPage: page,
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
  });

  const goToPage = useCallback((page: number) => {
    setOptions(prev => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setOptions(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const previousPage = useCallback(() => {
    setOptions(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setOptions(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    setOptions(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setOptions(prev => ({ ...prev, search, page: 1 }));
  }, []);

  const setFilters = useCallback((filters: Record<string, string | string[]>) => {
    setOptions(prev => ({ ...prev, filters, page: 1 }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptions({ ...DEFAULT_OPTIONS, ...initialOptions });
  }, [initialOptions]);

  return {
    ...data,
    isLoading,
    error,
    refetch,
    options,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    setSort,
    setSearch,
    setFilters,
    resetOptions,
  };
}
