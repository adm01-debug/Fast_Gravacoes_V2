import { Database } from "@/integrations/supabase/types";

export type JobStatus = 'queue' | 'ready' | 'scheduled' | 'production' | 'finished' | 'paused' | 'cancelled' | 'delayed' | 'rework' | 'buffer' | 'packaging';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

type DbRow = Database['public']['Tables']['jobs']['Row'];

// Making all DB fields nullable/optional in the interface to support both strict DB rows and BI views
export interface Job {
  id: string;
  order_number?: string | null;
  client?: string | null;
  product?: string | null;
  quantity?: number;
  produced_quantity?: number | null;
  technique_id?: string | null;
  machine_id?: string | null;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  estimated_duration?: number;
  status: JobStatus;
  priority?: JobPriority;
  gravure_color?: string | null;
  notes?: string | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  lost_pieces?: number | null;
  product_category_id?: string | null;
  operator_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sort_order?: number | null;
  production_photos?: string[] | null;
  shipment_id?: string | null;
  shipping_status?: string | null;
  // Extra BI fields
  product_name?: string | null;
  delay_time?: string | null;
  responsible_name?: string | null;
  efficiency?: string | number | null;
}

export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export interface JobWithRelations extends Job {
  machines?: { name: string; code: string } | null;
  techniques?: Database['public']['Tables']['techniques']['Row'] | null;
}
