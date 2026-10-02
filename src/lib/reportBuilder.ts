import { BarChart3, FileText, LayoutDashboard, Settings2, Table2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

export type PublicTables = keyof Database['public']['Tables'];

export const REPORT_TABLES = [
  { id: 'jobs', name: 'Jobs e Produção', icon: FileText },
  { id: 'machines', name: 'Máquinas e Ativos', icon: LayoutDashboard },
  { id: 'profiles', name: 'Operadores e Equipe', icon: BarChart3 },
  { id: 'inventory_items', name: 'Estoque e Materiais', icon: Table2 },
  { id: 'maintenance_records', name: 'Manutenção e TPM', icon: Settings2 },
];

export const TABLE_COLUMNS: Record<string, string[]> = {
  jobs: ['id', 'order_number', 'client', 'product', 'status', 'quantity', 'produced_quantity', 'lost_pieces', 'created_at'],
  machines: ['id', 'code', 'name', 'technique_id', 'is_active', 'created_at'],
  profiles: ['id', 'display_name', 'full_name', 'avatar_url', 'created_at'],
  inventory_items: ['id', 'name', 'category', 'current_stock', 'unit', 'min_stock_level'],
  maintenance_records: ['id', 'machine_id', 'status', 'maintenance_type_id', 'start_time', 'end_time'],
};

export const TABLE_FILTER_FIELDS: Record<string, string> = {
  jobs: 'created_at',
  machines: 'created_at',
  profiles: 'created_at',
  inventory_items: 'created_at',
  maintenance_records: 'start_time',
};

export const STATUS_OPTIONS: Record<string, string[]> = {
  jobs: ['finished', 'production', 'scheduled', 'queue', 'delayed'],
  maintenance_records: ['pending', 'in_progress', 'completed', 'cancelled'],
};


