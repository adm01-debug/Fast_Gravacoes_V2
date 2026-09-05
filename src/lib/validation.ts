/**
 * Runtime validation utilities using Zod.
 * Use these to validate API responses and user inputs at runtime boundaries.
 */
import { z, ZodSchema, ZodError } from 'zod';
import { logger } from '@/lib/logger';

export interface ParseResult<T> {
  success: true;
  data: T;
}

export interface ParseError {
  success: false;
  error: ZodError;
}

/**
 * Safely parse a single value against a Zod schema.
 * Logs validation failures in dev mode.
 */
export function safeParse<T>(schema: ZodSchema<T>, data: unknown, context?: string): ParseResult<T> | ParseError {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn(
      `Validation failed${context ? ` [${context}]` : ''}`,
      result.error.flatten(),
      'validation'
    );
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}

/**
 * Safely parse an array of items, filtering out invalid entries.
 * Returns only the valid items with a count of rejected ones.
 */
export function safeParseArray<T>(
  schema: ZodSchema<T>,
  items: unknown[],
  context?: string
): { valid: T[]; rejected: number } {
  const valid: T[] = [];
  let rejected = 0;

  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      rejected++;
    }
  }

  if (rejected > 0) {
    logger.warn(
      `${rejected} items rejected during validation${context ? ` [${context}]` : ''}`,
      undefined,
      'validation'
    );
  }

  return { valid, rejected };
}

// ── Common Schemas ──────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
}).refine(d => new Date(d.start) <= new Date(d.end), {
  message: 'Data inicial deve ser anterior à data final',
});
