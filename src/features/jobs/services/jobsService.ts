import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { jobSchema, JobStatus, JobPriority } from '../types/job.schema';
import { assertTransition } from './jobStateMachine';
import { bulkDeleteBlocker, DELETE_ALLOWED_STATUSES, DELETE_QUANTITY_FILTERS } from '../lib/pending-queue';
import { edgeFunctionFetch } from '@/lib/edgeFunctionFetch';

export type { JobStatus, JobPriority };

// Base Job type from DB, but with strictly typed status and priority
export interface Job extends Omit<Database['public']['Tables']['jobs']['Row'], 'status' | 'priority'> {
  status: JobStatus;
  priority: JobPriority;
}

export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export interface JobWithRelations extends Job {
  machines: { name: string; code: string } | null;
  techniques: Database['public']['Tables']['techniques']['Row'] | null;
}

export interface JobDeleteRefusal {
  id: string;
  reason: string;
}

export interface JobDeleteResult {
  /** IDs que o banco realmente apagou. */
  deleted: string[];
  /** IDs preservados, com o motivo em linguagem de negócio. */
  refused: JobDeleteRefusal[];
}

/**
 * Exclusao de uma ou varias OS em uma unica operacao.
 *
 * Duas garantias que a exclusao OS por OS nao dava:
 * 1. o DELETE reaplica no banco os mesmos criterios da tela, entao uma OS
 *    promovida automaticamente (queue -> ready) entre a leitura e a exclusao
 *    nao e apagada;
 * 2. as linhas realmente apagadas voltam via select('id'), entao quem chama
 *    sabe o que saiu e o que foi recusado — inclusive quando a policy de
 *    exclusao do banco barra o usuario e o DELETE nao afeta nenhuma linha
 *    sem devolver erro.
 */
async function deleteJobsByIds(ids: string[]): Promise<JobDeleteResult> {
  if (ids.length === 0) return { deleted: [], refused: [] };

  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, produced_quantity, lost_pieces')
    .in('id', ids);
  if (error) throw error;

  const rows = new Map((data ?? []).map(row => [row.id, row]));
  const refused: JobDeleteRefusal[] = [];
  const allowed: string[] = [];

  for (const id of ids) {
    const row = rows.get(id);
    if (!row) {
      refused.push({ id, reason: 'OS não encontrada' });
      continue;
    }
    const blocker = bulkDeleteBlocker({ ...row, status: row.status as JobStatus });
    if (blocker) refused.push({ id, reason: blocker });
    else allowed.push(id);
  }

  const deleted: string[] = [];
  if (allowed.length > 0) {
    // Um unico DELETE para o lote inteiro: uma transacao, o que preserva a
    // cadeia de auditoria (entradas concorrentes gravariam o mesmo antecessor).
    const { data: deletedRows, error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .in('id', allowed)
      .in('status', [...DELETE_ALLOWED_STATUSES])
      .or(DELETE_QUANTITY_FILTERS.produced)
      .or(DELETE_QUANTITY_FILTERS.lost)
      .select('id');
    if (deleteError) throw deleteError;

    deleted.push(...(deletedRows ?? []).map(row => row.id));

    const deletedIds = new Set(deleted);
    for (const id of allowed) {
      if (!deletedIds.has(id)) {
        refused.push({ id, reason: 'a OS mudou de situação ou o usuário não tem permissão de exclusão' });
      }
    }
  }

  return { deleted, refused };
}

export const jobsService = {
  async getAll(filters?: { status?: string; technique_id?: string; date?: string; recentOnly?: boolean }): Promise<JobWithRelations[]> {
    let query = supabase.from('jobs').select('*, machines(name, code), techniques:technique_id(*)');
    
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.technique_id) query = query.eq('technique_id', filters.technique_id);
    if (filters?.date) query = query.eq('scheduled_date', filters.date);
    if (filters?.recentOnly) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.or(`status.neq.finished,created_at.gt.${thirtyDaysAgo}`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    // Propagate the error instead of silently returning an empty list. Swallowing
    // it here made connectivity/RLS failures indistinguishable from "no jobs" in
    // the UI; callers (React Query) already handle thrown errors and surface them.
    if (error) throw error;

    // Runtime validation with Schema fallback
    return (data || []).map(row => {
      const result = jobSchema.safeParse(row);
      if (!result.success) {
        logger.warn(`Job validation failed for ID ${row.id}`, result.error.format(), 'jobsService');
        return row as unknown as JobWithRelations;
      }
      return result.data as unknown as JobWithRelations;
    });
  },

  async getById(id: string): Promise<JobWithRelations> {
    const { data, error } = await supabase.from('jobs').select('*, machines(name, code), techniques:technique_id(*)').eq('id', id).single();
    if (error) throw error;
    return data as unknown as JobWithRelations;
  },

  async create(job: JobInsert): Promise<Job> {
    const { data, error } = await supabase.from('jobs').insert(job).select().single();
    if (error) throw error;
    return data as unknown as Job;
  },

  async update(id: string, updates: JobUpdate): Promise<Job> {
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as unknown as Job;
  },

  async updateStatus(id: string, status: JobStatus, cancelReason?: string): Promise<Job> {
    const [{ data: { user } }, { data: current, error: fetchErr }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('jobs').select('status, actual_start_time, actual_end_time, operator_id').eq('id', id).single(),
    ]);
    if (fetchErr) throw fetchErr;

    assertTransition(current.status as JobStatus, status);

    const updateData: JobUpdate = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'cancelled') {
      // O trigger trg_validate_job_cancel_reason recusa cancelamento sem
      // motivo; a tela precisa barrar antes de chegar no banco.
      const reason = cancelReason?.trim();
      if (!reason) throw new Error('Informe o motivo do cancelamento.');
      if (reason.length > 2000) throw new Error('O motivo do cancelamento deve ter no máximo 2000 caracteres.');
      updateData.cancel_reason = reason;
    }

    if (status === 'production') {
      // Retomada (paused/delayed/rework → production) preserva o início
      // original — só carimba quando o job nunca iniciou.
      if (!current.actual_start_time) updateData.actual_start_time = new Date().toISOString();
      // Só atribui operador no primeiro início — retomada por
      // coordenador/manager não pode roubar a produção do operador
      // que executou o job.
      if (user && !current.operator_id) updateData.operator_id = user.id;
    } else if (status === 'finished') {
      // Retorno direto packaging → finished preserva o fim real de produção
      // (a embalagem não reabre o ciclo). Retrabalho (rework → production →
      // finished) é conclusão nova: carimba o horário atual.
      if (!(current.status === 'packaging' && current.actual_end_time)) {
        updateData.actual_end_time = new Date().toISOString();
      }
    }

    const job = await this.update(id, updateData);

    // Push status update to Bitrix24 (fire and forget)
    this.syncToBitrix24(id, status);

    return job;
  },

  async syncToBitrix24(jobId: string, status: JobStatus) {
    edgeFunctionFetch('bitrix24-sync?action=push', {
      method: 'POST',
      body: JSON.stringify({ jobId, status }),
    }).catch((err: unknown) => {
      logger.warn('Bitrix24 sync failed (non-critical)', { jobId, status, error: String(err) }, 'jobsService');
    });
  },

  async delete(id: string): Promise<void> {
    const { refused } = await deleteJobsByIds([id]);
    const [refusal] = refused;
    if (refusal) throw new Error(`Esta OS nao pode ser excluida: ${refusal.reason}.`);
  },

  deleteMany(ids: string[]): Promise<JobDeleteResult> {
    return deleteJobsByIds(ids);
  },

  async getByDateRange(start: string, end: string): Promise<JobWithRelations[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, machines(name, code), techniques:technique_id(*)')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date');
    if (error) throw error;
    return (data || []) as unknown as JobWithRelations[];
  },
};
