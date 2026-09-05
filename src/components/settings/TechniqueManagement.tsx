import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryConfig';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { Edit2, Plus, Trash2, Hammer, Clock, Zap, Printer, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSchedulingData } from '@/features/jobs';

interface TechniqueRow {
  id: string;
  name: string;
  short_name: string;
  color: string;
  setup_time: number;
  low_threshold?: number | null;
  medium_threshold?: number | null;
  high_threshold?: number | null;
}

export function TechniqueManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<TechniqueRow | null>(null);
  const { getMachinesByTechnique, getJobsByTechnique, isLoading: isLoadingData } = useSchedulingData();

  const { data: techniques, isLoading: isLoadingTech } = useQuery({
    queryKey: QUERY_KEYS.TECHNIQUES_ADMIN,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('techniques')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = isLoadingTech || isLoadingData;

  const saveMutation = useMutation({
    mutationFn: async (technique: TechniqueRow) => {
      const { data, error } = await supabase
        .from('techniques')
        .upsert(technique)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TECHNIQUES_ADMIN });
      setIsDialogOpen(false);
      setEditingTechnique(null);
      toast.success('Técnica salva com sucesso');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao salvar técnica');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('techniques').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TECHNIQUES_ADMIN });
      toast.success('Técnica excluída');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao excluir técnica');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nameValue = formData.get('name') as string;
    const techniqueData: TechniqueRow = {
      id: editingTechnique?.id || (nameValue ? nameValue.toLowerCase().replace(/\s+/g, '-') : crypto.randomUUID()),
      name: String(formData.get('name') ?? ''),
      short_name: String(formData.get('short_name') ?? ''),
      color: String(formData.get('color') ?? ''),
      setup_time: parseInt(formData.get('setup_time') as string, 10),
      low_threshold: parseInt(formData.get('low_threshold') as string, 10) || 30,
      medium_threshold: parseInt(formData.get('medium_threshold') as string, 10) || 70,
      high_threshold: parseInt(formData.get('high_threshold') as string, 10) || 90,
    };
    saveMutation.mutate(techniqueData);
  };

  if (isLoading) return <div>Carregando técnicas...</div>;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />
            Técnicas de Gravação
          </CardTitle>
          <CardDescription>Gerencie as técnicas de produção e seus parâmetros de setup</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setEditingTechnique(null)}>
              <Plus className="h-4 w-4" /> Nova Técnica
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingTechnique ? 'Editar Técnica' : 'Nova Técnica'}</DialogTitle>
                <DialogDescription>
                  Configure os detalhes da técnica de gravação.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" name="name" defaultValue={editingTechnique?.name} placeholder="Ex: Serigrafia Têxtil" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="short_name">Nome Curto (Sigla)</Label>
                    <Input id="short_name" name="short_name" defaultValue={editingTechnique?.short_name} placeholder="Ex: SERI" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="color">Cor Identificadora</Label>
                    <div className="flex gap-2">
                      <Input id="color" name="color" type="color" className="w-12 p-1 h-10 cursor-pointer" defaultValue={editingTechnique?.color || '#3b82f6'} required />
                      <Input name="color_text" defaultValue={editingTechnique?.color || '#3b82f6'} className="flex-1 font-mono uppercase" onChange={(e) => {
                        const colorInput = document.getElementById('color') as HTMLInputElement;
                        if (colorInput) colorInput.value = e.target.value;
                      }} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="setup_time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Setup Padrão (Minutos)
                    </Label>
                    <Input id="setup_time" name="setup_time" type="number" defaultValue={editingTechnique?.setup_time || 10} required />
                  </div>
                </div>

                <div className="pt-2 border-t border-border mt-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Limites de OEE (%)</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="low_threshold" className="text-[10px]">Crítico (&lt;)</Label>
                      <Input id="low_threshold" name="low_threshold" type="number" defaultValue={editingTechnique?.low_threshold || 30} className="h-8" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="medium_threshold" className="text-[10px]">Alerta (&lt;)</Label>
                      <Input id="medium_threshold" name="medium_threshold" type="number" defaultValue={editingTechnique?.medium_threshold || 70} className="h-8" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="high_threshold" className="text-[10px]">Excelente (&gt;)</Label>
                      <Input id="high_threshold" name="high_threshold" type="number" defaultValue={editingTechnique?.high_threshold || 90} className="h-8" />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar Técnica'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Técnica</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Ativos</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead>Limites OEE</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {techniques?.map((tech) => (
              <TableRow key={tech.id} className="group">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm" style={{ backgroundColor: tech.color }} />
                    {tech.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">{tech.short_name}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
                      <Printer className="h-3 w-3" /> {getMachinesByTechnique(tech.id).length} Máquinas
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
                      <Activity className="h-3 w-3" /> {getJobsByTechnique(tech.id).filter(j => j.status !== 'finished').length} Jobs Ativos
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Clock className="h-3 w-3" /> {tech.setup_time} min
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge className="bg-destructive/10 text-destructive border-none text-[10px] h-5 px-1.5">&lt;{tech.low_threshold || 30}%</Badge>
                    <Badge className="bg-warning/10 text-warning border-none text-[10px] h-5 px-1.5">&lt;{tech.medium_threshold || 70}%</Badge>
                    <Badge className="bg-success/10 text-success border-none text-[10px] h-5 px-1.5">&gt;{tech.high_threshold || 90}%</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingTechnique(tech);
                      setIsDialogOpen(true);
                    }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      const machineCount = getMachinesByTechnique(tech.id).length;
                      const jobCount = getJobsByTechnique(tech.id).length;
                      let msg = 'Tem certeza que deseja excluir esta técnica?';
                      if (machineCount > 0 || jobCount > 0) {
                        msg = `Atenção: Esta técnica possui ${machineCount} máquinas e ${jobCount} jobs vinculados. A exclusão pode causar inconsistências. Continuar?`;
                      }
                      if (confirm(msg)) {
                        deleteMutation.mutate(tech.id);
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
