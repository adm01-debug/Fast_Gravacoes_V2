import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { ChecklistTemplate } from '@/hooks/useShiftHandover';
import { TemplateForm, TemplateFormData } from './checklist-templates/TemplateForm';
import { TemplateCard } from './checklist-templates/TemplateCard';
import { useTechniques } from '@/features/jobs';

const DEFAULT_FORM: TemplateFormData = {
  name: '', description: '', technique_id: '',
  items: [{ description: '', order: 0 }], is_active: true,
};

export default function ChecklistTemplatesManager() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['checklist-templates-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shift_checklist_templates').select('*').order('name');
      if (error) throw error;
      return data as ChecklistTemplate[];
    }
  });

  const { data: techniques } = useTechniques();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    queryClient.invalidateQueries({ queryKey: ['checklist-templates-all'] });
  };

  const createTemplate = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const itemsJson = data.items.filter(i => i.description.trim()).map(i => ({ description: i.description, order: i.order }));
      const { error } = await supabase.from('shift_checklist_templates').insert({
        name: data.name, description: data.description || null,
        technique_id: data.technique_id || null,
        items: itemsJson as unknown as import('@/integrations/supabase/types').Json,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Template criado com sucesso'); setShowAddModal(false); resetForm(); },
    onError: (error) => { showErrorToast(error, 'Erro ao criar template'); }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: TemplateFormData & { id: string }) => {
      const itemsJson = data.items.filter(i => i.description.trim()).map(i => ({ description: i.description, order: i.order }));
      const { error } = await supabase.from('shift_checklist_templates').update({
        name: data.name, description: data.description || null,
        technique_id: data.technique_id || null,
        items: itemsJson as unknown as import('@/integrations/supabase/types').Json,
        is_active: data.is_active,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Template atualizado'); setEditingTemplate(null); resetForm(); },
    onError: (error) => { showErrorToast(error, 'Erro ao atualizar'); }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('shift_checklist_templates').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { invalidate(); toast.success('Template removido'); setDeleteConfirm(null); },
    onError: (error) => { showErrorToast(error, 'Erro ao remover'); }
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: ChecklistTemplate) => {
      const { error } = await supabase.from('shift_checklist_templates').insert({
        name: `${template.name} (Cópia)`, description: template.description || null,
        technique_id: template.technique_id || null,
        items: template.items as unknown as import('@/integrations/supabase/types').Json,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Template duplicado com sucesso'); },
    onError: (error) => { showErrorToast(error, 'Erro ao duplicar template'); }
  });

  const resetForm = () => setFormData(DEFAULT_FORM);

  const openEditModal = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name, description: template.description || '',
      technique_id: template.technique_id || '',
      items: template.items.length > 0 ? template.items : [{ description: '', order: 0 }],
      is_active: template.is_active,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { toast.error('Nome do template é obrigatório'); return; }
    const validItems = formData.items.filter(i => i.description.trim());
    if (validItems.length === 0) { toast.error('Adicione pelo menos um item ao checklist'); return; }
    if (editingTemplate) { updateTemplate.mutate({ ...formData, id: editingTemplate.id }); }
    else { createTemplate.mutate(formData); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Templates de Checklist</CardTitle>
            <CardDescription>Gerencie os templates de checklist para passagem de turno</CardDescription>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Novo Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Template de Checklist</DialogTitle>
                <DialogDescription>Crie um template de checklist para usar nas passagens de turno</DialogDescription>
              </DialogHeader>
              <TemplateForm formData={formData} setFormData={setFormData} techniques={techniques} isEditing={false} isPending={createTemplate.isPending} onSubmit={handleSubmit} onCancel={() => { setShowAddModal(false); resetForm(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : templates && templates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} onEdit={openEditModal} onDuplicate={(t) => duplicateTemplate.mutate(t)} onDelete={(id) => setDeleteConfirm(id)} isDuplicating={duplicateTemplate.isPending} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Nenhum template criado</h3>
            <p className="text-muted-foreground mb-4">Crie templates de checklist para agilizar as passagens de turno</p>
            <Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4 mr-2" />Criar Primeiro Template</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>Modifique o template de checklist</DialogDescription>
          </DialogHeader>
          <TemplateForm formData={formData} setFormData={setFormData} techniques={techniques} isEditing={true} isPending={updateTemplate.isPending} onSubmit={handleSubmit} onCancel={() => { setEditingTemplate(null); resetForm(); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && deleteTemplate.mutate(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
