import { z } from "https://esm.sh/zod@3.22.4";

// --- Shared Types ---
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

// --- Webhook Contracts ---
export const WebhookSourceSchema = z.enum(["bitrix24", "stripe", "external_system"]);

export const WebhookPayloadSchema = z.object({
  source: WebhookSourceSchema,
  event: z.string(),
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

export const WebhookResponseSchema = z.object({
  processed: z.boolean(),
  source: WebhookSourceSchema.optional(),
  event: z.string().optional(),
  timestamp: z.string().datetime(),
  details: z.any().optional(),
});

// --- ERP API Contracts ---

// Jobs
export const ERPJobRequestSchema = z.object({
  order_number: z.string().min(1),
  client: z.string().min(1),
  product: z.string().min(1),
  quantity: z.number().positive(),
  technique_id: z.string().uuid(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  machine_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const ERPJobResponseSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  client: z.string(),
  product: z.string(),
  quantity: z.number().nonnegative(),
  status: z.string(),
  created_at: z.string(),
});

export const ERPJobPatchSchema = z.object({
  status: z.enum(["queue", "ready", "scheduled", "production", "finished", "paused", "cancelled", "delayed", "rework"]).optional(),
  machine_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  produced_quantity: z.number().nonnegative().finite().optional(),
  lost_pieces: z.number().nonnegative().finite().optional(),
}).strict();

// Production Lots
export const ERPLotRequestSchema = z.object({
  job_id: z.string().uuid(),
  lot_number: z.string().min(1),
  quantity: z.number().positive(),
  operator_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// Pagination / List Response
export const ERPListResponseSchema = z.object({
  data: z.array(z.any()),
  total: z.number().nonnegative(),
  limit: z.number().positive(),
  offset: z.number().nonnegative(),
});

// --- Validation Helper ---
export async function validateContract<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string; details: any }> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: "Contract validation failed",
    details: result.error.format(),
  };
}
