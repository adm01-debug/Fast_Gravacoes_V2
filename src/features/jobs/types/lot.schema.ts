import { z } from 'zod';

export const lotSchema = z.object({
  id: z.string().uuid(),
  lot_number: z.string().min(1, 'Número do lote é obrigatório').max(100, 'Número do lote muito longo'),
  job_id: z.string().uuid('Job é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser positiva').max(1_000_000, 'Quantidade muito alta'),
  status: z.enum(['in_production', 'completed', 'quarantine', 'approved', 'rejected']).default('in_production'),
  notes: z.string().max(2000, 'Observações muito longas').nullable().optional(),
});

export const lotFormSchema = lotSchema.omit({ id: true, status: true });

export type LotFormData = z.infer<typeof lotFormSchema>;
