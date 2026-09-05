import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  auditLogEntrySchema,
  auditChainVerificationSchema,
  type AuditLogEntry,
  type AuditChainVerification,
  type AuditFilters,
} from '@/lib/schemas/auditLog';

const CONTEXT = 'useAuditTrail';

async function fetchAuditEntries(filters: AuditFilters): Promise<AuditLogEntry[]> {
  // audit_log table isn't in generated Database types; cast client narrowly.
  const client = supabase as unknown as {
    from: (t: string) => ReturnType<typeof supabase.from>;
  };
  let query = client
    .from('audit_log')
    .select('*, actor_email')
    .order('created_at', { ascending: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.entityId) query = query.eq('entity_id', filters.entityId);
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.action) query = query.eq('action', filters.action);

  if (filters.fromDate) {
    const fromDate = new Date(filters.fromDate);
    query = query.gte('created_at', fromDate.toISOString());
  }
  if (filters.toDate) {
    const toDate = new Date(filters.toDate);
    // Include the entire end day
    toDate.setHours(23, 59, 59, 999);
    query = query.lte('created_at', toDate.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    logger.error('Failed to load audit entries', error, CONTEXT);
    throw error;
  }
  type AuditRow = Record<string, unknown> & { actor_email?: string | null; actor_name?: string };
  const rows = (data ?? []) as AuditRow[];
  const parsed = rows.map((row) => {
    const result = auditLogEntrySchema.safeParse(row);
    if (!result.success) {
      logger.warn('Audit row failed validation', result.error.flatten(), CONTEXT);
      return null;
    }
    return {
      ...result.data,
      actor_name: row.actor_email || row.actor_name, // Surface actor_email as actor_name for UI
    } as AuditLogEntry & { actor_name?: string };
  });
  return parsed.filter((x): x is AuditLogEntry & { actor_name?: string } => x !== null);
}

export function useAuditTrail(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-trail', filters],
    queryFn: () => fetchAuditEntries(filters),
    staleTime: 30_000,
  });
}

export function useEntityAuditTrail(
  entityType: string,
  entityId: string | undefined,
  options?: { fromDate?: string; toDate?: string },
) {
  return useQuery({
    queryKey: ['audit-trail', 'entity', entityType, entityId, options?.fromDate, options?.toDate],
    queryFn: () =>
      fetchAuditEntries({
        entityType,
        entityId: entityId ?? '',
        limit: 200,
        fromDate: options?.fromDate,
        toDate: options?.toDate,
      }),
    enabled: Boolean(entityId),
    staleTime: 15_000,
  });
}

export function useAuditChainVerification(enabled = false) {
  return useQuery<AuditChainVerification>({
    queryKey: ['audit-chain-verify'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('verify_audit_chain', { _limit: 1000 });
      if (error) {
        logger.error('Chain verification failed', error, CONTEXT);
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      const parsed = auditChainVerificationSchema.parse(row);
      return parsed;
    },
    staleTime: 0,
  });
}
