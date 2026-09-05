import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type {
  PackagingTask,
  PackagingTaskStatus,
  DefectTriageForm,
  PackagingRegisterForm,
} from '../types/packaging.schema';

// Supabase generated types don't include the new packaging tables yet.
// Access them through a locally-typed handle to preserve type-safety at the call sites
// without polluting the codebase with `any` casts.
type PgResult = { data: unknown; error: Error | null };
type PgBuilder = {
  select: (cols?: string) => PgBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => PgBuilder;
  eq: (col: string, val: unknown) => PgBuilder;
  in: (col: string, vals: unknown[]) => PgBuilder;
  or: (filter: string) => PgBuilder;
  maybeSingle: () => Promise<PgResult>;
  single: () => Promise<PgResult>;
  then: PromiseLike<PgResult>['then'];
};
type UntypedSupabase = {
  from: (table: string) => {
    select: (cols?: string) => PgBuilder;
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) => PgBuilder;
    update: (values: Record<string, unknown>) => PgBuilder;
  };
};
const db = supabase as unknown as UntypedSupabase;

export interface PackagingTaskWithJob extends PackagingTask {
  jobs?: {
    id: string;
    order_number: string | null;
    client: string | null;
    product: string | null;
    quantity: number | null;
    technique_id: string | null;
    techniques?: { name: string; short_name: string } | null;
  } | null;
}

export interface PackagingDefectRow {
  id: string;
  packaging_task_id: string;
  quantity: number;
  defect_type: string;
  severity: string;
  decision: string;
  photo_url: string | null;
  reported_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const packagingService = {
  async listTasks(filter?: { status?: PackagingTaskStatus | PackagingTaskStatus[] }): Promise<PackagingTaskWithJob[]> {
    let query = db
      .from('packaging_tasks')
      .select('*, jobs:job_id (id, order_number, client, product, quantity, technique_id, techniques:technique_id (name, short_name))')
      .order('created_at', { ascending: false });

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        query = query.in('status', filter.status);
      } else {
        query = query.eq('status', filter.status);
      }
    }

    const { data, error } = await query;
    if (error) {
      logger.error('packagingService.listTasks failed', error, 'packagingService');
      throw error;
    }
    return (data ?? []) as PackagingTaskWithJob[];
  },

  async getTask(id: string): Promise<PackagingTaskWithJob | null> {
    const { data, error } = await db
      .from('packaging_tasks')
      .select('*, jobs:job_id (id, order_number, client, product, quantity, technique_id, techniques:technique_id (name, short_name))')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      logger.error('packagingService.getTask failed', error, 'packagingService');
      throw error;
    }
    return (data as PackagingTaskWithJob) ?? null;
  },

  async assignToMe(taskId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    // Optimistic lock: only take if unassigned or already mine.
    const { error } = await db
      .from('packaging_tasks')
      .update({ assigned_to: user.id, status: 'in_triage', started_at: new Date().toISOString() })
      .eq('id', taskId)
      .or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
    if (error) throw error;
  },

  /**
   * Bulk-assign multiple packaging tasks to a single user.
   * - Overrides current assignee (used for SLA rescue).
   * - Leaves status untouched (does not force in_triage) so an already-in-progress task keeps its state.
   * - Returns count of rows affected client-side.
   */
  async bulkAssign(taskIds: string[], userId: string): Promise<number> {
    if (taskIds.length === 0) return 0;
    const { error } = await db
      .from('packaging_tasks')
      .update({ assigned_to: userId })
      .in('id', taskIds);
    if (error) throw error;
    return taskIds.length;
  },

  async updateStatus(
    taskId: string,
    status: PackagingTaskStatus,
    extra?: { delay_reason?: string; delay_category?: string; was_overdue?: boolean },
  ): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === 'ready_to_ship') patch.completed_at = new Date().toISOString();
    if (extra?.delay_reason) patch.delay_reason = extra.delay_reason;
    if (extra?.delay_category) patch.delay_category = extra.delay_category;
    if (typeof extra?.was_overdue === 'boolean') patch.was_overdue_on_complete = extra.was_overdue;
    const { error } = await db
      .from('packaging_tasks')
      .update(patch)
      .eq('id', taskId);
    if (error) throw error;
  },

  async registerPackaging(taskId: string, values: PackagingRegisterForm): Promise<void> {
    const { error } = await db
      .from('packaging_tasks')
      .update({
        package_type: values.package_type,
        packages_count: values.packages_count,
        total_weight_kg: values.total_weight_kg ?? null,
        approved_quantity: values.approved_quantity,
        notes: values.notes ?? null,
        status: 'packaging',
      })
      .eq('id', taskId);
    if (error) throw error;
  },

  async listDefects(taskId: string): Promise<PackagingDefectRow[]> {
    const { data, error } = await db
      .from('packaging_defects')
      .select('*')
      .eq('packaging_task_id', taskId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PackagingDefectRow[];
  },

  async recordDefect(taskId: string, form: DefectTriageForm): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { error } = await db.from('packaging_defects').insert({
      packaging_task_id: taskId,
      quantity: form.quantity,
      defect_type: form.defect_type,
      severity: form.severity,
      decision: form.decision,
      photo_url: form.photo_url || null,
      notes: form.notes ?? null,
      reported_by: user.id,
    });
    if (error) throw error;

    // Increment rejected count on parent task
    const { data: task } = await db
      .from('packaging_tasks')
      .select('rejected_quantity')
      .eq('id', taskId)
      .single();
    if (task) {
      const current = (task as { rejected_quantity: number }).rejected_quantity ?? 0;
      await db
        .from('packaging_tasks')
        .update({ rejected_quantity: current + form.quantity })
        .eq('id', taskId);
    }
  },

  async uploadDefectPhoto(taskId: string, file: File): Promise<string> {
    const path = `packaging/${taskId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from('production-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data } = await supabase.storage
      .from('production-photos')
      .createSignedUrl(path, 60 * 60 * 24 * 30);
    return data?.signedUrl ?? '';
  },
};
