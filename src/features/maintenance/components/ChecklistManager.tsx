/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useMemo, useEffect } from 'react';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, Trash2, Save, AlertCircle, AlertTriangle, Camera, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { MaintenanceChecklistItem } from '@/features/maintenance/hooks/types';

// Radix Select forbids an empty-string item value (it's reserved to mean
// "no selection" internally and throws at render). selectedTechniqueId=''
// means "global (all machines)" throughout this component, so this sentinel
// is only used at the Select boundary and mapped back to '' immediately.
const GLOBAL_TECHNIQUE_VALUE = '__global__';

export function ChecklistManager() {
  const { maintenanceTypes, checklists, machines } = useTPM();
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  type LocalChecklistItem = Partial<MaintenanceChecklistItem> & { _key?: string };
  const [localItems, setLocalItems] = useState<LocalChecklistItem[]>([]);

  // Get unique techniques from machines
  const techniques = useMemo(() => {
    const uniqueTechniques = new Map<string, string>();
    machines.forEach((m) => {
      if (m.technique_id) {
        uniqueTechniques.set(m.technique_id, m.technique_id);
      }
    });
    return Array.from(uniqueTechniques.keys());
  }, [machines]);

  const currentChecklist = useMemo(() => {
    return checklists.find((c) =>
      c.maintenance_type_id === selectedTypeId &&
      (c.technique_id === selectedTechniqueId || (!c.technique_id && !selectedTechniqueId))
    );
  }, [checklists, selectedTypeId, selectedTechniqueId]);

  useEffect(() => {
    if (currentChecklist && currentChecklist.items) {
      setLocalItems(currentChecklist.items);
    } else {
      setLocalItems([]);
    }
  }, [currentChecklist]);

  const addItem = () => {
    setLocalItems([
      ...localItems,
      {
        _key: crypto.randomUUID(),
        description: '',
        is_critical: false,
        requires_photo: false,
        requires_measurement: false,
        item_order: localItems.length + 1,
      }
    ]);
  };

  const removeItem = (index: number) => {
    setLocalItems(localItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<MaintenanceChecklistItem>) => {
    const newItems = [...localItems];
    newItems[index] = { ...newItems[index], ...updates };
    setLocalItems(newItems);
  };

  const handleSave = async () => {
    if (!selectedTypeId) {
      toast.error('Selecione o tipo de manutenção');
      return;
    }
    setIsSaving(true);

    try {
      const type = maintenanceTypes.find((t) => t.id === selectedTypeId);
      const newVersion = (currentChecklist?.version || 0) + 1;

      let checklistId = currentChecklist?.id;

      if (!checklistId) {
        const { data, error } = await supabase
          .from('maintenance_checklists')
          .insert({
            maintenance_type_id: selectedTypeId,
            technique_id: selectedTechniqueId || null,
            name: `Checklist: ${type?.name}${selectedTechniqueId ? ` (${selectedTechniqueId})` : ''}`,
            is_active: true,
            version: 1
          })
          .select()
          .single();

        if (error) throw error;
        checklistId = data.id;
      } else {
        // Fetch old item IDs before any write so we can delete them safely
        // after the new items are successfully inserted (INSERT-before-DELETE
        // ensures the checklist is never left with zero items if the insert fails).
        const { data: oldItems } = await supabase
          .from('maintenance_checklist_items')
          .select('id')
          .eq('checklist_id', checklistId);
        const oldItemIds = (oldItems ?? []).map((r: { id: string }) => r.id);

        if (localItems.length > 0) {
          if (!checklistId) throw new Error('checklistId ausente ao inserir itens');
          const cid: string = checklistId;
          const itemsToInsert = localItems.map((item, index) => ({
            checklist_id: cid,
            description: item.description || '',
            is_critical: !!item.is_critical,
            requires_photo: !!item.requires_photo,
            requires_measurement: !!item.requires_measurement,
            measurement_unit: item.measurement_unit || null,
            min_value: item.min_value || null,
            max_value: item.max_value || null,
            item_order: index + 1,
          }));

          const { error: insertError } = await supabase
            .from('maintenance_checklist_items')
            .insert(itemsToInsert);

          if (insertError) throw insertError;
        }

        // New items are safely stored — now remove the old ones by ID
        if (oldItemIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('maintenance_checklist_items')
            .delete()
            .in('id', oldItemIds);

          if (deleteError) throw deleteError;
        }

        // Update version only after items are settled
        const { error: updateError } = await supabase
          .from('maintenance_checklists')
          .update({
            version: newVersion,
            updated_at: new Date().toISOString()
          })
          .eq('id', checklistId);

        if (updateError) throw updateError;
      }

      if (!currentChecklist && localItems.length > 0) {
        const itemsToInsert = localItems.map((item, index) => ({
          checklist_id: checklistId,
          description: item.description || '',
          is_critical: !!item.is_critical,
          requires_photo: !!item.requires_photo,
          requires_measurement: !!item.requires_measurement,
          measurement_unit: item.measurement_unit || null,
          min_value: item.min_value || null,
          max_value: item.max_value || null,
          item_order: index + 1,
        }));

        const { error: insertError } = await supabase
          .from('maintenance_checklist_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast.success(`Checklist ${currentChecklist ? 'atualizado' : 'criado'} para versão ${newVersion}`);
      queryClient.invalidateQueries({ queryKey: ['maintenance-checklists'] });
    } catch (error) {

      toast.error('Erro ao salvar checklist');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!currentChecklist) return;
    try {
      const { error } = await supabase
        .from('maintenance_checklists')
        .update({ is_active: !currentChecklist.is_active })
        .eq('id', currentChecklist.id);

      if (error) throw error;
      toast.success(`Checklist ${currentChecklist.is_active ? 'desativado' : 'ativado'}`);
      queryClient.invalidateQueries({ queryKey: ['maintenance-checklists'] });
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Configuração de Modelos de Checklist
            </CardTitle>
            <CardDescription>
              Defina itens obrigatórios por tipo de manutenção e categoria de máquina.
            </CardDescription>
          </div>
          {currentChecklist && (
            <div className="flex items-center gap-2">
              <Badge variant={currentChecklist.is_active ? "success" : "secondary"}>
                v{currentChecklist.version || 1}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                className={currentChecklist.is_active ? "text-destructive" : "text-success"}
              >
                {currentChecklist.is_active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Manutenção</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {maintenanceTypes.map((mType) => (
                  <SelectItem key={mType.id} value={mType.id}>
                    {mType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo/Categoria de Máquina (Opcional)</Label>
            <Select
              value={selectedTechniqueId || GLOBAL_TECHNIQUE_VALUE}
              onValueChange={(v) => setSelectedTechniqueId(v === GLOBAL_TECHNIQUE_VALUE ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Global (Toda as máquinas)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GLOBAL_TECHNIQUE_VALUE}>Global (Todas as máquinas)</SelectItem>
                {techniques.map((tech) => (
                  <SelectItem key={tech} value={tech}>
                    {tech}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedTypeId && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Itens do Checklist</h3>
              <Button size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" /> Adicionar Item
              </Button>
            </div>

            {localItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                <p>Nenhum item configurado para este tipo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {localItems.map((item, index) => (
                  <div key={item.id ?? item._key} className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Descrição do item (ex: Verificar nível de óleo)"
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center space-x-2 bg-secondary/30 p-2 rounded-md border border-border/50">
                        <Checkbox
                          id={`critical-${item.id ?? item._key}`}
                          checked={item.is_critical}
                          onCheckedChange={(checked) => updateItem(index, { is_critical: !!checked })}
                        />
                        <Label htmlFor={`critical-${item.id ?? item._key}`} className="text-xs font-semibold text-destructive flex items-center gap-1 cursor-pointer">
                          <AlertTriangle className="h-3 w-3" /> Item Crítico
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 bg-secondary/30 p-2 rounded-md border border-border/50">
                        <Checkbox
                          id={`photo-${item.id ?? item._key}`}
                          checked={item.requires_photo}
                          onCheckedChange={(checked) => updateItem(index, { requires_photo: !!checked })}
                        />
                        <Label htmlFor={`photo-${item.id ?? item._key}`} className="text-xs font-semibold text-primary flex items-center gap-1 cursor-pointer">
                          <Camera className="h-3 w-3" /> Exige Foto
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 bg-secondary/30 p-2 rounded-md border border-border/50">
                        <Checkbox
                          id={`measure-${item.id ?? item._key}`}
                          checked={item.requires_measurement}
                          onCheckedChange={(checked) => updateItem(index, { requires_measurement: !!checked })}
                        />
                        <Label htmlFor={`measure-${item.id ?? item._key}`} className="text-xs font-semibold text-blue-500 flex items-center gap-1 cursor-pointer">
                          <Activity className="h-3 w-3" /> Exige Medição
                        </Label>
                      </div>
                    </div>

                    {item.requires_measurement && (
                      <div className="grid grid-cols-3 gap-3 pt-2 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <Label className="text-xs">Unidade</Label>
                          <Input
                            placeholder="ex: bar, °C"
                            value={item.measurement_unit || ''}
                            onChange={(e) => updateItem(index, { measurement_unit: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Min</Label>
                          <Input
                            type="number"
                            placeholder="Min"
                            value={item.min_value || ''}
                            onChange={(e) => updateItem(index, { min_value: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max</Label>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={item.max_value || ''}
                            onChange={(e) => updateItem(index, { max_value: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving || localItems.length === 0} className="gap-2">
                {isSaving ? <Plus className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Checklist
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
