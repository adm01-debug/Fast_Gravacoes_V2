import { z } from 'zod';

export const maintenanceSchema = z.object({
  id: z.string().uuid(),
  machine_id: z.string().uuid('Máquina é obrigatória'),
  maintenance_type_id: z.string().uuid('Tipo de manutenção é obrigatório'),
  schedule_id: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  notes: z.string().max(5000, 'Observações muito longas').nullable().optional(),
  performed_by_name: z.string().max(150, 'Nome muito longo').nullable().optional(),
  downtime_minutes: z.number().int().nonnegative().max(43_200, 'Tempo de parada não pode exceder 30 dias').nullable().optional(),
  total_cost: z.number().nonnegative().max(1_000_000, 'Custo inválido').nullable().optional(),
});

export const maintenanceFormSchema = maintenanceSchema.omit({ id: true, status: true });

export type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;
export type Maintenance = z.infer<typeof maintenanceSchema>;
