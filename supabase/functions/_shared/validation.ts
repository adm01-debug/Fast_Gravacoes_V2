import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const webhookPayloadSchema = z.object({
  source: z.string().min(1, "Source is required"),
  event: z.string().min(1, "Event is required"),
  data: z.record(z.any()).optional().default({}),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

export const bitrix24DataSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().optional(),
  status: z.string().optional(),
});

export const stripeDataSchema = z.object({
  id: z.string(),
  object: z.string().optional(),
});

export const mlPredictionPayloadSchema = z.object({
  action: z.enum(["batch_analyze", "single_machine"]).default("batch_analyze"),
  machine_id: z.string().uuid().optional(),
});

export type MLPredictionPayload = z.infer<typeof mlPredictionPayloadSchema>;

export const approvePasswordResetSchema = z.object({
  requestId: z.string().uuid("ID da solicitação inválido"),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
  redirectUrl: z.string().url().optional(),
});

export type ApprovePasswordResetPayload = z.infer<typeof approvePasswordResetSchema>;

export const lockoutRequestSchema = z.object({
  email: z.string().email("E-mail inválido"),
  action: z.enum(["check", "record_failure", "record_success"]),
});

export type LockoutRequestPayload = z.infer<typeof lockoutRequestSchema>;

export const validateIPRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  user_email: z.string().email("E-mail inválido"),
  user_agent: z.string().optional(),
  action: z.enum([
    "login_attempt",
    "login_success",
    "login_failed",
    "mfa_required",
    "mfa_failed",
    "mfa_success",
  ]),
  failure_reason: z.string().optional(),
});

export type ValidateIPRequestPayload = z.infer<typeof validateIPRequestSchema>;

// Payload de Database Webhook do Supabase (INSERT em tabela-monitorada).
// `record` é o objeto da linha; campos conhecidos são tipados, o restante
// passa pelo passthrough.
export const tpmAlertWebhookSchema = z.object({
  event_type: z.string().optional(),
  schema: z.string().optional(),
  table: z.string().optional(),
  record: z.object({
    machine_id: z.string().optional(),
    alert_type: z.string().optional(),
    message: z.string().optional(),
    severity: z.string().optional(),
    created_at: z.string().optional(),
  }).passthrough().optional().nullable(),
  old_record: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type TpmAlertWebhookPayload = z.infer<typeof tpmAlertWebhookSchema>;

export const tpmExecutionAlertWebhookSchema = z.object({
  event_type: z.string().optional(),
  schema: z.string().optional(),
  table: z.string().optional(),
  record: z.object({
    execution_id: z.string().optional(),
    parameter_name: z.string().optional(),
    actual_value: z.string().optional(),
    expected_range: z.string().optional(),
    description: z.string().optional(),
    severity: z.string().optional(),
    created_at: z.string().optional(),
    evidence_urls: z.array(z.string()).optional(),
  }).passthrough().optional().nullable(),
  old_record: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type TpmExecutionAlertWebhookPayload = z.infer<typeof tpmExecutionAlertWebhookSchema>;


