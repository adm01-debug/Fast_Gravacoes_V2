/* eslint-disable react-hooks/incompatible-library -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedulingData } from '@/features/jobs';
import { supabase } from '@/integrations/supabase/client';
import { calculateEstimatedTime } from '@/features/analytics/hooks/useKPIs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { MachineSuggestionPanel } from '@/components/scheduling/MachineSuggestionPanel';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useDirtyForm, useDirtyGuard } from '@/contexts/DirtyFormContext';
import { useAuth } from '@/features/auth';

const jobSchema = z.object({
  order_number: z.string().min(1, 'Número da OS é obrigatório').trim(),
  client: z.string().min(1, 'Cliente é obrigatório').trim(),
  product: z.string().min(1, 'Produto é obrigatório').trim(),
  quantity: z.string().refine(v => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0, {
    message: 'Quantidade deve ser um número maior que zero'
  }),
  technique_id: z.string().min(1, 'Técnica é obrigatória'),
  machine_id: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().optional(),
  priority: z.string().default('medium'),
  gravure_color: z.string().optional(),
});

type JobFormValues = z.infer<typeof jobSchema>;

const DRAFT_KEY_BASE = 'fg-new-job-draft';

// Chave por usuário: impede que um rascunho de uma conta apareça para a
// próxima pessoa que usar o mesmo navegador (privacidade do cliente/OS).
function draftKeyFor(userId: string | undefined): string {
  return `${DRAFT_KEY_BASE}:${userId ?? 'anon'}`;
}

interface JobDraft {
  values: JobFormValues;
  scheduled_date?: string;
  saved_at: string;
}

function readDraft(key: string): JobDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as JobDraft;
    return draft?.values ? draft : null;
  } catch {
    return null;
  }
}

const STEPS: Array<{ id: string; title: string; fields: Array<keyof JobFormValues> }> = [
  {
    id: 'identificacao',
    title: 'Identificação',
    fields: ['order_number', 'client', 'product', 'quantity', 'technique_id'],
  },
  {
    id: 'agendamento',
    title: 'Agendamento e detalhes',
    fields: [],
  },
];

const defaultValues: JobFormValues = {
  order_number: '',
  client: '',
  product: '',
  quantity: '',
  technique_id: '',
  machine_id: '',
  start_time: '',
  end_time: '',
  notes: '',
  priority: 'medium',
  gravure_color: '',
};

export default function NewJobPage() {
  const navigate = useNavigate();
  const { techniques, getMachinesByTechnique, refetchJobs } = useSchedulingData();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>();
  const [step, setStep] = useState(0);
  const { goBack } = useSmartBack();
  const { confirmIfDirty } = useDirtyGuard();

  const draftKey = draftKeyFor(user?.id);
  const draft = useMemo(() => readDraft(draftKey), [draftKey]);

  const { control, handleSubmit, watch, setValue, trigger, getValues, formState: { errors, isDirty } } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: draft?.values ?? defaultValues,
  });

  // Guarda de formulário sujo: Voltar/swipe/atalhos pedem confirmação.
  // Inclui mudanças na data agendada (fora do react-hook-form) e um
  // rascunho restaurado ainda não enviado.
  const restoredDate = draft?.scheduled_date ?? '';
  const currentDate = date ? format(date, 'yyyy-MM-dd') : '';
  const [draftPending, setDraftPending] = useState(() => Boolean(draft));
  const clearDraft = useCallback(() => {
    setDraftPending(false);
    try { localStorage.removeItem(draftKey); } catch { /* opcional */ }
  }, [draftKey]);
  useDirtyForm(isDirty || currentDate !== restoredDate || draftPending, clearDraft);

  // Restaura rascunho salvo (data fica fora do react-hook-form).
  useEffect(() => {
    if (draft?.scheduled_date) {
      const parsed = new Date(`${draft.scheduled_date}T00:00:00`);
      if (!isNaN(parsed.getTime())) setDate(parsed);
    }
    if (draft) toast.info('Rascunho restaurado — continue de onde parou.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste rascunho a cada alteração — permite retomar depois.
  const persistDraft = useCallback((values: JobFormValues) => {
    // A data mora fora do form — um rascunho "só com data" também vale
    // guardar, senão ela some num reload.
    const hasContent = Boolean(date) || Object.values(values).some(v => typeof v === 'string' && v.trim() !== '' && v !== 'medium');
    if (hasContent) {
      const payload: JobDraft = {
        values,
        scheduled_date: date ? format(date, 'yyyy-MM-dd') : undefined,
        saved_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload));
      } catch {
        // storage cheio/indisponível — rascunho opcional
      }
    } else {
      clearDraft();
    }
  }, [date, draftKey, clearDraft]);

  useEffect(() => {
    const subscription = watch((values) => persistDraft(values as JobFormValues));
    return () => subscription.unsubscribe();
  }, [watch, persistDraft]);

  // A data vive fora do react-hook-form — o watch não dispara quando só
  // ela muda; repersiste o rascunho com a nova data.
  useEffect(() => {
    persistDraft(getValues());
  }, [date, getValues, persistDraft]);

  const techniqueId = watch('technique_id');
  const availableMachines = techniqueId ? getMachinesByTechnique(techniqueId) : [];

  const handleNextStep = async () => {
    const fields = STEPS[step].fields;
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleCancel = () => {
    confirmIfDirty(goBack);
  };

  const onSubmit = async (data: JobFormValues) => {
    setIsSubmitting(true);

    try {
      const selectedTechnique = techniques.find(t => t.id === data.technique_id);
      const estimatedDuration = calculateEstimatedTime({
        quantity: parseInt(data.quantity, 10),
        techniqueSetupTime: selectedTechnique?.setup_time ?? 10,
      });

      const { error } = await supabase.from('jobs').insert({
        order_number: data.order_number,
        client: data.client,
        product: data.product,
        quantity: parseInt(data.quantity, 10),
        technique_id: data.technique_id,
        machine_id: data.machine_id || null,
        scheduled_date: date ? format(date, 'yyyy-MM-dd') : null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        notes: data.notes || null,
        priority: data.priority,
        gravure_color: data.gravure_color || null,
        status: 'queue',
        estimated_duration: estimatedDuration,
      });

      if (error) throw error;

      try { localStorage.removeItem(draftKey); } catch { /* rascunho opcional */ }
      toast.success('Job criado com sucesso!');
      refetchJobs();
      navigate('/');
    } catch (error) {
      toast.error('Erro ao criar job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader
          title="Novo Agendamento"
          description="Cadastre um novo job de produção"
          showBreadcrumbs={false}
        />

        {/* Stepper de progresso */}
        <nav aria-label="Etapas do cadastro" className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                  i < step && 'bg-primary text-primary-foreground border-primary',
                  i === step && 'bg-primary/10 text-primary border-primary',
                  i > step && 'text-muted-foreground border-border'
                )}
                aria-current={i === step ? 'step' : undefined}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-sm truncate',
                  i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border min-w-4" aria-hidden />}
            </div>
          ))}
        </nav>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">
                {step === 0 ? 'Informações do Job' : 'Agendamento e detalhes'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order_number">Número da OS *</Label>
                      <Controller
                        name="order_number"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="order_number" placeholder="Ex: OS-2024-001" className={errors.order_number ? 'border-destructive' : ''} />
                        )}
                      />
                      {errors.order_number && <p className="text-xs text-destructive">{errors.order_number.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client">Cliente *</Label>
                      <Controller
                        name="client"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="client" placeholder="Nome do cliente" className={errors.client ? 'border-destructive' : ''} />
                        )}
                      />
                      {errors.client && <p className="text-xs text-destructive">{errors.client.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product">Produto *</Label>
                      <Controller
                        name="product"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="product" placeholder="Descrição do produto" className={errors.product ? 'border-destructive' : ''} />
                        )}
                      />
                      {errors.product && <p className="text-xs text-destructive">{errors.product.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantidade *</Label>
                      <Controller
                        name="quantity"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="quantity" type="number" placeholder="0" min="1" className={errors.quantity ? 'border-destructive' : ''} />
                        )}
                      />
                      {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Técnica *</Label>
                        <Controller
                          name="technique_id"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={(v) => { field.onChange(v); setValue('machine_id', ''); }} value={field.value}>
                              <SelectTrigger className={errors.technique_id ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Selecione a técnica" />
                              </SelectTrigger>
                              <SelectContent>
                                {techniques.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.technique_id && <p className="text-xs text-destructive">{errors.technique_id.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Máquina</Label>
                        <Controller
                          name="machine_id"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={!techniqueId}>
                              <SelectTrigger>
                                <SelectValue placeholder={techniqueId ? "Selecione a máquina" : "Selecione uma técnica primeiro"} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableMachines.map((machine) => (
                                  <SelectItem key={machine.id} value={machine.id}>{machine.code} - {machine.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <MachineSuggestionPanel
                      techniqueId={techniqueId}
                      onSelectMachine={(id) => setValue('machine_id', id)}
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Data Agendada</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Hora Início</Label>
                      <Controller
                        name="start_time"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="start_time" type="time" />
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">Hora Fim</Label>
                      <Controller
                        name="end_time"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="end_time" type="time" />
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gravure_color">Cor da Gravação</Label>
                      <Controller
                        name="gravure_color"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} id="gravure_color" placeholder="Ex: Preto, Branco, CMYK" />
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <Textarea {...field} id="notes" placeholder="Observações adicionais sobre o job..." rows={3} />
                      )}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-between gap-3 pt-4">
                <div>
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(s - 1, 0))}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  {step < STEPS.length - 1 ? (
                    <Button type="button" className="gradient-primary" onClick={handleNextStep}>
                      Próximo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" className="gradient-primary" disabled={isSubmitting}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Criando...' : 'Criar Job'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
