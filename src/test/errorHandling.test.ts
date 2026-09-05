import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  categorizeError,
  createAppError,
  ErrorCodes,
  isNetworkError,
  isAuthError,
  isErrorCode,
  withErrorHandling,
  createMutationErrorHandler,
  showErrorToast,
} from '@/lib/errorHandling';

// ── Mock dependencies ──────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
    getErrorHistory: vi.fn(() => []),
    clearHistory: vi.fn(),
  },
}));

// ── categorizeError ────────────────────────────────────────

describe('categorizeError', () => {
  it('returns UNKNOWN_ERROR for null/undefined', () => {
    expect(categorizeError(null)).toBe(ErrorCodes.UNKNOWN_ERROR);
    expect(categorizeError(undefined)).toBe(ErrorCodes.UNKNOWN_ERROR);
  });

  it('returns NETWORK_ERROR for network errors', () => {
    expect(categorizeError(new Error('network failure'))).toBe(ErrorCodes.NETWORK_ERROR);
    expect(categorizeError(new Error('Failed to fetch'))).toBe(ErrorCodes.NETWORK_ERROR);
    expect(categorizeError(new Error('fetch error'))).toBe(ErrorCodes.NETWORK_ERROR);
  });

  it('returns TIMEOUT for timeout errors', () => {
    expect(categorizeError(new Error('request timeout'))).toBe(ErrorCodes.TIMEOUT);
    expect(categorizeError(new Error('408 timeout'))).toBe(ErrorCodes.TIMEOUT);
  });

  it('returns RATE_LIMITED for rate limit errors', () => {
    expect(categorizeError(new Error('429 too many requests'))).toBe(ErrorCodes.RATE_LIMITED);
    expect(categorizeError(new Error('rate limit exceeded'))).toBe(ErrorCodes.RATE_LIMITED);
    expect(categorizeError(new Error('too many requests'))).toBe(ErrorCodes.RATE_LIMITED);
  });

  it('returns UNAUTHORIZED for auth errors', () => {
    expect(categorizeError(new Error('401 unauthorized'))).toBe(ErrorCodes.UNAUTHORIZED);
    expect(categorizeError(new Error('not authenticated'))).toBe(ErrorCodes.UNAUTHORIZED);
  });

  it('returns FORBIDDEN for forbidden errors', () => {
    expect(categorizeError(new Error('403 forbidden'))).toBe(ErrorCodes.FORBIDDEN);
    expect(categorizeError(new Error('access denied'))).toBe(ErrorCodes.FORBIDDEN);
  });

  it('returns SESSION_EXPIRED for JWT/token errors', () => {
    expect(categorizeError(new Error('jwt expired'))).toBe(ErrorCodes.SESSION_EXPIRED);
    expect(categorizeError(new Error('token expired'))).toBe(ErrorCodes.SESSION_EXPIRED);
    expect(categorizeError(new Error('session invalid'))).toBe(ErrorCodes.SESSION_EXPIRED);
  });

  it('returns NOT_FOUND for 404 errors', () => {
    expect(categorizeError(new Error('404 not found'))).toBe(ErrorCodes.NOT_FOUND);
    expect(categorizeError(new Error('resource not found'))).toBe(ErrorCodes.NOT_FOUND);
  });

  it('returns VALIDATION_ERROR for 400/422/invalid errors', () => {
    expect(categorizeError(new Error('400 bad request validation'))).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(categorizeError(new Error('422 unprocessable invalid'))).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  it('returns CONFLICT for 409 errors', () => {
    expect(categorizeError(new Error('409 conflict'))).toBe(ErrorCodes.CONFLICT);
    expect(categorizeError(new Error('duplicate key'))).toBe(ErrorCodes.CONFLICT);
  });

  it('returns SERVER_ERROR for 500 errors', () => {
    expect(categorizeError(new Error('500 internal server error'))).toBe(ErrorCodes.SERVER_ERROR);
  });

  it('returns SERVICE_UNAVAILABLE for 502/503 errors', () => {
    expect(categorizeError(new Error('503 service unavailable'))).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    expect(categorizeError(new Error('502 bad gateway'))).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
  });

  it('returns TIMEOUT for "gateway timeout" phrasing (timeout keyword matched first)', () => {
    // NOTE: "504 gateway timeout" contains the word "timeout", which is matched by
    // categorizeError before the 504 check is reached. This is existing behavior.
    expect(categorizeError(new Error('504 gateway timeout'))).toBe(ErrorCodes.TIMEOUT);
    // Use "504 server error" to hit the SERVICE_UNAVAILABLE path
    expect(categorizeError(new Error('504 service unavailable'))).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
  });

  it('handles plain string errors', () => {
    expect(categorizeError('network problem')).toBe(ErrorCodes.NETWORK_ERROR);
    expect(categorizeError('unknown issue xyz')).toBe(ErrorCodes.UNKNOWN_ERROR);
  });
});

// ── createAppError ─────────────────────────────────────────

describe('createAppError', () => {
  it('returns an AppError with correct structure', () => {
    const error = new Error('network failure');
    const appError = createAppError(error);

    expect(appError).toMatchObject({
      code: ErrorCodes.NETWORK_ERROR,
      severity: expect.stringMatching(/^(info|warning|error|critical)$/),
      retryable: expect.any(Boolean),
      timestamp: expect.any(Date),
    });
    expect(appError.message).toBeTruthy();
    expect(appError.originalError).toBe(error);
  });

  it('marks network/server errors as retryable', () => {
    const network = createAppError(new Error('network failure'));
    const server = createAppError(new Error('500 internal server error'));
    const rate = createAppError(new Error('429 rate limit'));

    expect(network.retryable).toBe(true);
    expect(server.retryable).toBe(true);
    expect(rate.retryable).toBe(true);
  });

  it('marks auth/validation errors as non-retryable', () => {
    const auth = createAppError(new Error('403 forbidden'));
    const notFound = createAppError(new Error('404 not found'));

    expect(auth.retryable).toBe(false);
    expect(notFound.retryable).toBe(false);
  });

  it('severity is critical for server errors', () => {
    const err = createAppError(new Error('500 internal server error'));
    expect(err.severity).toBe('critical');
  });

  it('severity is warning for auth errors', () => {
    const err = createAppError(new Error('401 unauthorized'));
    expect(err.severity).toBe('warning');
  });

  it('accepts optional context', () => {
    const ctx = { userId: '123', action: 'save' };
    const appError = createAppError(new Error('network'), ctx);
    expect(appError.context).toEqual(ctx);
  });
});

// ── isNetworkError / isAuthError / isErrorCode ─────────────

describe('error type guards', () => {
  it('isNetworkError returns true for network and timeout errors', () => {
    expect(isNetworkError(new Error('network failure'))).toBe(true);
    expect(isNetworkError(new Error('request timeout'))).toBe(true);
    expect(isNetworkError(new Error('404 not found'))).toBe(false);
  });

  it('isAuthError returns true for auth-related errors', () => {
    expect(isAuthError(new Error('401 unauthorized'))).toBe(true);
    expect(isAuthError(new Error('403 forbidden'))).toBe(true);
    expect(isAuthError(new Error('jwt expired'))).toBe(true);
    expect(isAuthError(new Error('network error'))).toBe(false);
  });

  it('isErrorCode matches specific error codes', () => {
    expect(isErrorCode(new Error('network failure'), ErrorCodes.NETWORK_ERROR)).toBe(true);
    expect(isErrorCode(new Error('network failure'), ErrorCodes.TIMEOUT)).toBe(false);
    expect(isErrorCode(null, ErrorCodes.UNKNOWN_ERROR)).toBe(true);
  });
});

// ── withErrorHandling ──────────────────────────────────────

describe('withErrorHandling', () => {
  it('returns the result of the function on success', async () => {
    const result = await withErrorHandling(async () => 42, { showToast: false });
    expect(result).toBe(42);
  });

  it('returns null and swallows error by default', async () => {
    const result = await withErrorHandling(async () => {
      throw new Error('network failure');
    }, { showToast: false });
    expect(result).toBeNull();
  });

  it('calls onError with AppError when provided', async () => {
    const onError = vi.fn();
    await withErrorHandling(
      async () => { throw new Error('network failure'); },
      { showToast: false, onError }
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: ErrorCodes.NETWORK_ERROR })
    );
  });

  it('returns the value even when onError is not called (success path)', async () => {
    const onError = vi.fn();
    const result = await withErrorHandling(async () => 'hello', { showToast: false, onError });
    expect(result).toBe('hello');
    expect(onError).not.toHaveBeenCalled();
  });
});

// ── createMutationErrorHandler ─────────────────────────────

describe('createMutationErrorHandler', () => {
  it('returns a function', () => {
    const handler = createMutationErrorHandler();
    expect(typeof handler).toBe('function');
  });

  it('calls the returned handler without throwing', () => {
    const handler = createMutationErrorHandler('Custom message');
    expect(() => handler(new Error('network failure'))).not.toThrow();
  });
});

// ── showErrorToast ─────────────────────────────────────────

describe('showErrorToast', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('does not throw for any error type', () => {
    expect(() => showErrorToast(null)).not.toThrow();
    expect(() => showErrorToast(new Error('network'))).not.toThrow();
    expect(() => showErrorToast('string error')).not.toThrow();
    expect(() => showErrorToast(undefined)).not.toThrow();
  });
});
