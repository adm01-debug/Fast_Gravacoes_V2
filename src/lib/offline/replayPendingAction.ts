import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import type { PendingAction, ReplayResult } from '@/lib/offline/offlineQueue';

export async function processPendingAction(action: PendingAction): Promise<ReplayResult> {
    try {
      switch (action.type) {
        case 'update_job': {
          const { jobId, updates, baseUpdatedAt } = action.payload as {
            jobId: string;
            updates: TablesUpdate<'jobs'>;
            baseUpdatedAt?: string;
          };
          let query = supabase.from('jobs').update(updates).eq('id', jobId);
          if (baseUpdatedAt) query = query.eq('updated_at', baseUpdatedAt);
          const { data, error } = await query.select('id');
          if (error) throw error;
          if (baseUpdatedAt && (!data || data.length === 0)) {
            // The job changed on the server since this action was queued —
            // applying the stale payload would silently clobber that change.
            return 'conflict';
          }
          break;
        }

        case 'register_production': {
          const { jobId, producedQuantity, lostPieces, notes, photos, baseUpdatedAt } = action.payload as {
            jobId: string;
            producedQuantity: number;
            lostPieces: number;
            notes?: string;
            photos?: string[];
            baseUpdatedAt?: string;
          };
          let query = supabase
            .from('jobs')
            .update({
              produced_quantity: producedQuantity,
              lost_pieces: lostPieces,
              notes,
              production_photos: photos,
              status: 'finished',
              actual_end_time: new Date().toISOString(),
            })
            .eq('id', jobId);
          if (baseUpdatedAt) query = query.eq('updated_at', baseUpdatedAt);
          const { data, error } = await query.select('id');
          if (error) throw error;
          if (baseUpdatedAt && (!data || data.length === 0)) {
            return 'conflict';
          }
          break;
        }

        case 'qr_scan': {
          const { jobId, operatorId, action: scanAction, deviceInfo, notes } = action.payload as {
            jobId: string;
            operatorId: string;
            action: string;
            deviceInfo?: string;
            notes?: string;
          };
          // Upsert on the client-generated action.id: if this exact action
          // was already applied in a previous pass (server committed but the
          // response was lost, so the queue entry survived), replaying it is
          // a no-op instead of inserting a duplicate scan-history row.
          const { error } = await supabase
            .from('qr_scan_history')
            .upsert({
              id: action.id,
              job_id: jobId,
              operator_id: operatorId,
              action: scanAction,
              device_info: deviceInfo,
              notes,
            }, { onConflict: 'id' });
          if (error) throw error;
          break;
        }

        default:
          return 'retry';
      }

      return 'success';
    } catch (error) {
      logger.warn(`Pending action ${action.type} failed (retry ${action.retryCount})`, error, 'useOfflineSync');
      return 'retry';
    }
  }
