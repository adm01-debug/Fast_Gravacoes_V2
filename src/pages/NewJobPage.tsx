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
import { CalendarIcon, Plus, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedulingData } from '@/features/jobs';
import { supabase } from '@/integrations/supabase/client';
import { calculateEstimatedTime } from '@/features/analytics/hooks/useKPIs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { MachineSuggestionPanel } from '@/components/scheduling/MachineSuggestionPanel';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

export default function NewJobPage() {
  const navigate = useNavigate();
  const { techniques, getMachinesByTechnique, refetchJobs } = useSchedulingData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
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
    }
  });

  const techniqueId = watch('technique_id');
  const availableMachines = techniqueId ? getMachinesByTechnique(techniqueId) : [];

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
        <Breadcrumbs />

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl text-title font-bold gradient-text">Novo Agendamento</h1>
            <p className="text-muted-foreground">Cadastre um novo job de produção</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Informações do Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Data Agendada</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
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

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gradient-primary" disabled={isSubmitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Criando...' : 'Criar Job'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
