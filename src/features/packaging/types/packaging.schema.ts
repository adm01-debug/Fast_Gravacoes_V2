import { z } from 'zod';

export const packagingTaskStatusSchema = z.enum([
  'pending',
  'in_triage',
  'packaging',
  'ready_to_ship',
  'on_hold',
]);
export type PackagingTaskStatus = z.infer<typeof packagingTaskStatusSchema>;

export const packagingDefectTypeSchema = z.enum([
  'print_misalignment',
  'color_deviation',
  'scratch',
  'contamination',
  'wrong_material',
  'dimensional',
  'other',
]);
export type PackagingDefectType = z.infer<typeof packagingDefectTypeSchema>;

export const packagingDefectSeveritySchema = z.enum(['minor', 'major', 'critical']);
export type PackagingDefectSeverity = z.infer<typeof packagingDefectSeveritySchema>;

export const packagingDefectDecisionSchema = z.enum(['rework', 'discard', 'accept_with_note']);
export type PackagingDefectDecision = z.infer<typeof packagingDefectDecisionSchema>;

export const packagingTaskSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  status: packagingTaskStatusSchema,
  assigned_to: z.string().uuid().nullable(),
  received_quantity: z.number().int().nonnegative(),
  approved_quantity: z.number().int().nonnegative(),
  rejected_quantity: z.number().int().nonnegative(),
  package_type: z.string().nullable(),
  packages_count: z.number().int().nonnegative().nullable(),
  total_weight_kg: z.number().nonnegative().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  notes: z.string().max(2000).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PackagingTask = z.infer<typeof packagingTaskSchema>;

export const packagingRegisterFormSchema = z.object({
  package_type: z.string().min(1, 'Selecione o tipo de embalagem'),
  packages_count: z.coerce.number().int().positive('Informe o número de pacotes'),
  total_weight_kg: z.coerce.number().nonnegative('Peso deve ser positivo').optional(),
  approved_quantity: z.coerce.number().int().nonnegative(),
  notes: z.string().max(2000).optional(),
});
export type PackagingRegisterForm = z.infer<typeof packagingRegisterFormSchema>;

export const defectTriageFormSchema = z
  .object({
    quantity: z.coerce.number().int().positive('Quantidade deve ser positiva'),
    defect_type: packagingDefectTypeSchema,
    severity: packagingDefectSeveritySchema,
    decision: packagingDefectDecisionSchema,
    photo_url: z.string().url().optional().or(z.literal('')),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const photoRequired = data.severity === 'critical' || data.decision === 'rework';
    if (photoRequired && (!data.photo_url || data.photo_url.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['photo_url'],
        message:
          data.severity === 'critical'
            ? 'Foto obrigatória para defeitos críticos'
            : 'Foto obrigatória quando a decisão é retrabalho',
      });
    }
  });
export type DefectTriageForm = z.infer<typeof defectTriageFormSchema>;

export const DEFECT_TYPE_LABELS: Record<PackagingDefectType, string> = {
  print_misalignment: 'Desalinhamento de impressão',
  color_deviation: 'Desvio de cor',
  scratch: 'Arranhão',
  contamination: 'Contaminação',
  wrong_material: 'Material errado',
  dimensional: 'Dimensional',
  other: 'Outro',
};

export const SEVERITY_LABELS: Record<PackagingDefectSeverity, string> = {
  minor: 'Menor',
  major: 'Maior',
  critical: 'Crítico',
};

export const DECISION_LABELS: Record<PackagingDefectDecision, string> = {
  rework: 'Retrabalho',
  discard: 'Descarte',
  accept_with_note: 'Aceitar com nota',
};

export const TASK_STATUS_LABELS: Record<PackagingTaskStatus, string> = {
  pending: 'Pendente',
  in_triage: 'Em triagem',
  packaging: 'Embalando',
  ready_to_ship: 'Pronto para envio',
  on_hold: 'Em espera',
};

export const DELAY_CATEGORIES = [
  { value: 'atraso_producao', label: 'Atraso vindo da produção' },
  { value: 'fila_manuseio', label: 'Fila no setor de manuseio' },
  { value: 'retrabalho', label: 'Retrabalho / defeito' },
  { value: 'falta_material', label: 'Falta de material de embalagem' },
  { value: 'falta_operador', label: 'Falta de operador' },
  { value: 'sistema', label: 'Problema de sistema / integração' },
  { value: 'outro', label: 'Outro motivo' },
] as const;

export type DelayCategory = (typeof DELAY_CATEGORIES)[number]['value'];

export const delayReasonSchema = z.object({
  delay_category: z.enum(DELAY_CATEGORIES.map(c => c.value) as [DelayCategory, ...DelayCategory[]]),
  delay_reason: z.string().min(3, 'Descreva o motivo com pelo menos 3 caracteres').max(500),
});
export type DelayReasonForm = z.infer<typeof delayReasonSchema>;
