import { QueryClient } from '@tanstack/react-query';

// ============================================
// Query Configuration with Retry Mechanisms
// ============================================

// Stale time configuration
export const STALE_TIMES = {
  STATIC: 15 * 60 * 1000,    // 15 minutes for static data (techniques, machines)
  DYNAMIC: 45 * 1000,        // 45 seconds for dynamic data (jobs)
  REALTIME: 10 * 1000,       // 10 seconds for realtime data
  USER: 5 * 60 * 1000,       // 5 minutes for user data
} as const;

// Shared Query Keys to avoid duplication
export const QUERY_KEYS = {
  JOBS: ['jobs'],
  // Distinct from JOBS: jobsService.getAll({ recentOnly: true }) returns a
  // different result set (unfinished + last 30 days only) than the plain
  // JOBS key's full history. They must never share a cache entry — whichever
  // hook resolved/invalidated last would silently overwrite the other's data
  // for every consumer of that key (see useJobs vs useSchedulingData).
  JOBS_RECENT: ['jobs', 'recent'],
  MACHINES: ['machines'],
  TECHNIQUES: ['techniques'],
  PROFILES: ['profiles'],
  OPERATOR_PROFILES: ['operator-profiles'],
  PAGINATED_JOBS: ['paginated-jobs'],
  OPERATORS: ['operators'],
  SCHEDULING_DATA: ['scheduling-data'],
  USERS_MANAGEMENT: ['users-management'],
  USER_ROLES_MANAGEMENT: ['user-roles-management'],
  TECHNIQUES_ADMIN: ['techniques-admin'],
  AUDIT_TRAIL: ['audit-trail'],
  LOGIN_AUDIT: ['login-audit'],
  SECURITY_ALERTS: ['security-alerts'],
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 30000,  // 30 seconds
} as const;

/**
 * Exponential backoff retry delay calculator
 * @param attemptIndex - The current retry attempt (0-based)
 * @returns Delay in milliseconds before next retry
 */
export function calculateRetryDelay(attemptIndex: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attemptIndex),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

// PostgREST error codes that must not be retried (auth/permission/client errors).
// PGRST301 = JWT expired, PGRST302 = JWT invalid claim, PGRST303 = role claim missing,
// PGRST304 = JWT secret empty, 42501 = RLS/privilege denied, 28000 = invalid auth spec.
const NO_RETRY_POSTGREST_CODES = new Set([
  'PGRST301', 'PGRST302', 'PGRST303', 'PGRST304',
  '42501', '28000', '28P01',
]);

/**
 * Determines if an error should trigger a retry
 * @param error - The error to check
 * @returns true if the error is retryable
 */
export function shouldRetry(error: unknown): boolean {
  // Don't retry on 4xx errors (client errors) except 408 (timeout) and 429 (rate limit)
  if (error instanceof Error) {
    // PostgrestError (extends Error) carries a `code` property with a PostgreSQL/PostgREST
    // error code. Check it before falling through to message-based detection so that
    // RLS violations and JWT errors are never retried (they would always fail identically).
    const code = (error as Error & { code?: string }).code;
    if (code && NO_RETRY_POSTGREST_CODES.has(code)) {
      return false;
    }

    const message = error.message.toLowerCase();

    // Network errors - always retry
    if (message.includes('network') || message.includes('fetch')) {
      return true;
    }

    // Timeout errors - retry
    if (message.includes('timeout') || message.includes('408')) {
      return true;
    }

    // Rate limit - retry with backoff
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
      return true;
    }

    // Server errors (5xx) - retry
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Auth/permission errors - don't retry
    if (
      message.includes('401') || message.includes('403') ||
      message.includes('unauthorized') || message.includes('forbidden') ||
      message.includes('permission denied') || message.includes('jwt')
    ) {
      return false;
    }

    // Not found - don't retry
    if (message.includes('404') || message.includes('not found')) {
      return false;
    }

    // Validation errors - don't retry
    if (message.includes('400') || message.includes('422') || message.includes('validation')) {
      return false;
    }
  }

  // Default: retry up to max retries
  return true;
}

/**
 * Default query options with retry configuration
 */
export const defaultQueryOptions = {
  retry: (failureCount: number, error: unknown) => {
    if (failureCount >= RETRY_CONFIG.maxRetries) return false;
    return shouldRetry(error);
  },
  retryDelay: calculateRetryDelay,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

/**
 * Creates a configured QueryClient with global defaults
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...defaultQueryOptions,
        staleTime: STALE_TIMES.DYNAMIC,
        gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      },
      mutations: {
        retry: 1, // Mutations retry once by default
        retryDelay: RETRY_CONFIG.baseDelay,
      },
    },
  });
}

// ============================================
// Pagination Utilities
// ============================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/**
 * Calculates pagination range for Supabase queries
 * @param page - Current page (1-indexed)
 * @param pageSize - Items per page
 * @returns Object with from and to values for .range()
 */
export function calculateRange(page: number, pageSize: number): { from: number; to: number } {
  const validPage = Math.max(1, page);
  const validPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);

  const from = (validPage - 1) * validPageSize;
  const to = from + validPageSize - 1;

  return { from, to };
}

/**
 * Creates a paginated result object from query data
 */
export function createPaginatedResult<T>(
  data: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
