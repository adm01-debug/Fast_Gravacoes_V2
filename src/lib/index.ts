/**
 * Barrel export for core lib utilities.
 * Import from '@/lib' for convenience.
 */

// Error handling
export { ErrorCodes, categorizeError, createAppError } from './errorHandling';

// Validation
export { safeParse, safeParseArray, uuidSchema, paginationSchema, dateRangeSchema } from './validation';

// Resilience
export { CircuitBreaker, CircuitOpenError } from './circuitBreaker';
export { retryWithBackoff, isNetworkRetryable } from './retryWithBackoff';
export { RateLimiter, apiLimiter, searchLimiter, authLimiter } from './rateLimiter';

// Security
export { escapeHtml, stripTags, sanitizeText, sanitizeUrl, sanitizeInput } from './sanitize';

// Logging
export { logger } from './logger';

// Utilities
export { cn } from './utils';
