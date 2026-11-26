import { z } from 'zod';

export const auditActionSchema = z.union([
  z.enum(['INSERT', 'UPDATE', 'DELETE']),
  z.literal('status_change'),
  z.string() // Fallback for custom actions
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  entity_type: z.string(),
  entity_id: z.string(),
  action: auditActionSchema,
  actor_id: z.string().uuid().nullable(),
  actor_email: z.string().nullable(),
  old_values: z.unknown().nullable(),
  new_values: z.unknown().nullable(),
  changed_fields: z.array(z.string()).nullable(),
    // 41 registros historicos da tabela chegaram sem hash; recusar a linha
    // esconderia o evento inteiro da trilha (integridade ja e checada por
    // verify_audit_chain).
    hash: z.string().nullable(),
  previous_hash: z.string().nullable(),
  metadata: z.unknown().nullable(),
  created_at: z.string(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

  // public.audit_log guarda as colunas como old_data/new_data, enquanto o schema
  // (e o AuditEntryCard) leem old_values/new_values. Sem a troca, TODO registro
  // falhava no safeParse e a trilha renderizava vazia (useAuditTrail).
  export function auditRowFromDb(row: Record<string, unknown>): Record<string, unknown> {
    return {
      ...row,
      old_values: row.old_values ?? row.old_data ?? null,
      new_values: row.new_values ?? row.new_data ?? null,
    };
  }

export const auditChainVerificationSchema = z.object({
  total_records: z.coerce.number(),
  verified: z.coerce.number(),
  broken: z.coerce.number(),
  first_broken_id: z.string().uuid().nullable(),
});

export type AuditChainVerification = z.infer<typeof auditChainVerificationSchema>;

export const auditFiltersSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().uuid().optional(),
  action: auditActionSchema.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.number().int().positive().max(500).default(100),
});

export type AuditFilters = z.infer<typeof auditFiltersSchema>;
