/**
 * Retry utility with exponential backoff and jitter.
 * Use for unreliable network calls (API requests, Supabase operations).
 */

import { logger } from '@/lib/logger';

interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential growth (default: 2) */
  factor?: number;
  /** Whether to add random jitter (default: true) */
  jitter?: boolean;
  /** Predicate to decide if the error is retryable (default: all errors) */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry with the attempt number and delay */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  factor: 2,
  jitter: true,
  isRetryable: () => true,
  onRetry: () => {},
};

function computeDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.factor, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

  if (options.jitter) {
    // Full jitter: random value between 0 and capped delay
    return Math.floor(Math.random() * cappedDelay);
  }

  return cappedDelay;
}

/**
 * Execute an async function with automatic retries and exponential backoff.
 *
 * @example
 * const data = await retryWithBackoff(
 *   () => supabase.from('jobs').select('*'),
 *   { maxRetries: 3, baseDelay: 500 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries || !opts.isRetryable(error)) {
        throw error;
      }

      const delay = computeDelay(attempt, opts);
      opts.onRetry(attempt + 1, delay, error);

      logger.warn(
        `Retry ${attempt + 1}/${opts.maxRetries} in ${delay}ms`,
        { error: error instanceof Error ? error.message : String(error) },
        'retryWithBackoff'
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Default retryable check: retries on network errors, timeouts, and 5xx/429.
 */
export function isNetworkRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}
