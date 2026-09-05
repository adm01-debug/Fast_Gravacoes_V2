import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 as TrashIcon, Save as SaveIcon, Plus as PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePackagingSlaOverrides,
  usePackagingSlaOverrideMutations,
  type PackagingSlaOverride,
} from '../hooks/usePackagingSlaOverrides';
import { useTechniquesData } from '@/features/jobs/hooks/useSchedulingData';
import { usePackagingSettings } from '../hooks/usePackagingSettings';

const NONE_TECH = '__none__';

interface FormState {
  id?: string;
  technique_id: string | null;
  client: string;
  sla_triage_hours: number;
  sla_packaging_hours: number;
  sla_total_hours: number;
  warning_threshold_pct: number;
  notes: string;
  is_active: boolean;
}

function emptyForm(defaults: { triage: number; packaging: number; total: number; warn: number }): FormState {
  return {
    technique_id: null,
    client: '',
    sla_triage_hours: defaults.triage,
    sla_packaging_hours: defaults.packaging,
    sla_total_hours: defaults.total,
    warning_threshold_pct: defaults.warn,
    notes: '',
    is_active: true,
  };
}

export function PackagingSlaOverridesManager() {
  const { data: overrides, isLoading } = usePackagingSlaOverrides();
  const { data: techniques } = useTechniquesData();
  const { data: settings } = usePackagingSettings();
  const { save, remove } = usePackagingSlaOverrideMutations();

  const defaults = {
    triage: settings?.sla_triage_hours ?? 4,
    packaging: settings?.sla_packaging_hours ?? 8,
    total: settings?.sla_total_hours ?? 24,
    warn: settings?.warning_threshold_pct ?? 75,
  };

  const [form, setForm] = useState<FormState>(emptyForm(defaults));

  const techniqueById = new Map((techniques ?? []).map((t) => [t.id, t]));

  const startEdit = (o: PackagingSlaOverride) => {
    setForm({
      id: o.id,
      technique_id: o.technique_id,
      client: o.client ?? '',
      sla_triage_hours: Number(o.sla_triage_hours),
      sla_packaging_hours: Number(o.sla_packaging_hours),
      sla_total_hours: Number(o.sla_total_hours),
      warning_threshold_pct: Number(o.warning_threshold_pct),
      notes: o.notes ?? '',
      is_active: o.is_active,
    });
  };

  const reset = () => setForm(emptyForm(defaults));

  const handleSave = () => {
    const client = form.client.trim();
    if (!form.technique_id && !client) {
      toast.error('Informe uma técnica, cliente ou ambos.');
      return;
    }
    if (form.sla_triage_hours <= 0 || form.sla_packaging_hours <= 0 || form.sla_total_hours <= 0) {
      toast.error('Os prazos devem ser maiores que zero.');
      return;
    }
    save.mutate(
      {
        id: form.id,
        technique_id: form.technique_id,
        client: client || null,
        sla_triage_hours: form.sla_triage_hours,
        sla_packaging_hours: form.sla_packaging_hours,
        sla_total_hours: form.sla_total_hours,
        warning_threshold_pct: form.warning_threshold_pct,
        notes: form.notes || null,
        is_active: form.is_active,
      },
      {
        onSuccess: () => {
          toast.success(form.id ? 'Override atualizado.' : 'Override criado.');
          reset();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Erro ao salvar override.';
          toast.error(msg);
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remover este override de SLA?')) return;
    remove.mutate(id, {
      onSuccess: () => toast.success('Override removido.'),
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Erro ao remover.';
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            {form.id ? 'Editar override de SLA' : 'Novo override de SLA'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="ovr-technique">Técnica</Label>
              <Select
                value={form.technique_id ?? NONE_TECH}
                onValueChange={(v) => setForm((f) => ({ ...f, technique_id: v === NONE_TECH ? null : v }))}
              >
                <SelectTrigger id="ovr-technique">
                  <SelectValue placeholder="Todas as técnicas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_TECH}>Todas as técnicas</SelectItem>
                  {(techniques ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ovr-client">Cliente</Label>
              <Input
                id="ovr-client"
                value={form.client}
                placeholder="Nome do cliente (opcional)"
                onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label htmlFor="ovr-triage">Triagem (h)</Label>
              <Input
                id="ovr-triage"
                type="number"
                min={0.1}
                step={0.5}
                value={form.sla_triage_hours}
                onChange={(e) => setForm((f) => ({ ...f, sla_triage_hours: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="ovr-pack">Embalagem (h)</Label>
              <Input
                id="ovr-pack"
                type="number"
                min={0.1}
                step={0.5}
                value={form.sla_packaging_hours}
                onChange={(e) => setForm((f) => ({ ...f, sla_packaging_hours: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="ovr-total">Total (h)</Label>
              <Input
                id="ovr-total"
                type="number"
                min={0.1}
                step={1}
                value={form.sla_total_hours}
                onChange={(e) => setForm((f) => ({ ...f, sla_total_hours: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="ovr-warn">Warn (%)</Label>
              <Input
                id="ovr-warn"
                type="number"
                min={10}
                max={99}
                step={5}
                value={form.warning_threshold_pct}
                onChange={(e) => setForm((f) => ({ ...f, warning_threshold_pct: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ovr-notes">Observações</Label>
            <Textarea
              id="ovr-notes"
              value={form.notes}
              placeholder="Motivo do prazo diferenciado, contrato, etc."
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="ovr-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="ovr-active">Ativo</Label>
            </div>
            <div className="flex gap-2">
              {form.id && (
                <Button variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave} disabled={save.isPending}>
                <SaveIcon className="w-4 h-4 mr-2" />
                {form.id ? 'Salvar alterações' : 'Criar override'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overrides existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !overrides || overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum override configurado. Usando SLA global ({defaults.triage}h triagem / {defaults.packaging}h embalagem / {defaults.total}h total).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escopo</TableHead>
                    <TableHead className="text-right">Triagem</TableHead>
                    <TableHead className="text-right">Embalagem</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Warn</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.map((o) => {
                    const tech = o.technique_id ? techniqueById.get(o.technique_id) : null;
                    const scopeLabel = [
                      tech ? `Técnica: ${tech.name}` : null,
                      o.client ? `Cliente: ${o.client}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <TableRow key={o.id} className="cursor-pointer" onClick={() => startEdit(o)}>
                        <TableCell className="font-medium">{scopeLabel || '—'}</TableCell>
                        <TableCell className="text-right">{o.sla_triage_hours}h</TableCell>
                        <TableCell className="text-right">{o.sla_packaging_hours}h</TableCell>
                        <TableCell className="text-right">{o.sla_total_hours}h</TableCell>
                        <TableCell className="text-right">{o.warning_threshold_pct}%</TableCell>
                        <TableCell>
                          {o.is_active ? (
                            <Badge variant="outline" className="border-primary/50 text-primary">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remover"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(o.id);
                            }}
                          >
                            <TrashIcon className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Prioridade de resolução: <strong>cliente + técnica</strong> &gt; <strong>cliente</strong> &gt; <strong>técnica</strong> &gt; SLA global.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
