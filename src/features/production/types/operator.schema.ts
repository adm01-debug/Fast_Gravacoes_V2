import { z } from 'zod';

export const operatorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(254, 'Email muito longo'),
  role: z.enum(['operator', 'coordinator', 'manager']),
  is_active: z.boolean().default(true),
  phone: z.string().regex(/^[\d\s\-\(\)\+]{0,20}$/, 'Telefone inválido').nullable().optional(),
  badge_number: z.string().max(20, 'Número de crachá muito longo').nullable().optional(),
});

export const operatorFormSchema = operatorSchema.omit({ id: true });

export type OperatorFormData = z.infer<typeof operatorFormSchema>;
export type Operator = z.infer<typeof operatorSchema>;
