import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { jobSchema, JobStatus, JobPriority } from '../types/job.schema';
import { assertTransition } from './jobStateMachine';
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

  async updateStatus(id: string, status: JobStatus): Promise<Job> {
    const [{ data: { user } }, { data: current, error: fetchErr }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('jobs').select('status').eq('id', id).single(),
    ]);
    if (fetchErr) throw fetchErr;

    assertTransition(current.status as JobStatus, status);

    const updateData: JobUpdate = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'production') {
      updateData.actual_start_time = new Date().toISOString();
      if (user) updateData.operator_id = user.id;
    } else if (status === 'finished') {
      updateData.actual_end_time = new Date().toISOString();
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
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) throw error;
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
