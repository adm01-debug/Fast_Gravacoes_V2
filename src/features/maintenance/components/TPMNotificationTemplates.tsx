import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Mail, MessageCircle, Info, Rocket, Eye, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  channel: 'email' | 'whatsapp' | 'push';
  severity: 'upcoming' | 'due' | 'overdue' | 'critical';
  subject: string | null;
  template_body: string;
  status: 'draft' | 'published';
  last_published_at: string | null;
}

export function TPMNotificationTemplates() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['tpm-notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tpm_notification_templates')
        .select('*');
      if (error) throw error;
      return data as Template[];
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async (template: Partial<Template> & { id: string }) => {
      const updates = { ...template, status: 'draft' as const };
      const { error } = await supabase
        .from('tpm_notification_templates')
        .update(updates)
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tpm-notification-templates'] });
      toast.success('Rascunho salvo com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao salvar rascunho');
    }
  });

  const publishTemplate = useMutation({
    mutationFn: async (template: Template) => {
      const { error: updateError } = await supabase
        .from('tpm_notification_templates')
        .update({ status: 'published', last_published_at: new Date().toISOString() })
        .eq('id', template.id);

      if (updateError) throw updateError;

      const { error: publishError } = await supabase
        .from('tpm_notification_templates_published')
        .upsert({
          template_id: template.id,
          channel: template.channel,
          severity: template.severity,
          subject: template.subject,
          template_body: template.template_body,
          published_at: new Date().toISOString()
        }, { onConflict: 'template_id' });

      if (publishError) throw publishError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tpm-notification-templates'] });
      toast.success('Template publicado e ativo para uso!');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao publicar template');
    }
  });

  if (isLoading) return <div>Carregando templates...</div>;

  const renderTemplateEditor = (severity: Template['severity']) => {
    const template = templates?.find(t => t.channel === activeTab && t.severity === severity);
    if (!template) return null;

    return (
      <div className={cn(
        "space-y-4 p-4 border rounded-lg mb-4 transition-colors",
        template.status === 'draft' ? "bg-warning/5 border-warning/20" : "bg-success/5 border-success/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{severity}</Badge>
            {template.status === 'draft' ? (
              <Badge variant="secondary" className="bg-warning text-warning border-warning">Rascunho</Badge>
            ) : (
              <Badge variant="secondary" className="bg-success text-success border-success">Publicado</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                const subject = (document.getElementById(`subject-${template.id}`) as HTMLInputElement)?.value;
                const body = (document.getElementById(`body-${template.id}`) as HTMLTextAreaElement)?.value;
                updateTemplate.mutate({ id: template.id, subject, template_body: body });
              }}
            >
              <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-8 bg-success hover:bg-success"
              disabled={template.status === 'published' && !updateTemplate.isPending}
              onClick={() => publishTemplate.mutate(template)}
            >
              <Rocket className="h-4 w-4 mr-2" /> Publicar
            </Button>
          </div>
        </div>

        {activeTab === 'email' && (
          <div className="space-y-2">
            <label htmlFor={`subject-${template.id}`} className="text-xs font-medium text-muted-foreground">Assunto</label>
            <Input
              id={`subject-${template.id}`}
              defaultValue={template.subject || ''}
              placeholder="Assunto do e-mail"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={`body-${template.id}`} className="text-xs font-medium text-muted-foreground">Corpo do Template</label>
          <Textarea
            id={`body-${template.id}`}
            defaultValue={template.template_body}
            rows={4}
            className="font-mono text-sm"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-lg text-sm border border-blue-500/20">
        <Info className="h-4 w-4 shrink-0" />
        <p>Variáveis disponíveis: <code>{"{{machine_name}}"}</code>, <code>{"{{machine_code}}"}</code>, <code>{"{{due_date}}"}</code>, <code>{"{{days}}"}</code>, <code>{"{{message}}"}</code></p>
      </div>

      <Tabs defaultValue="email" onValueChange={(v: string) => setActiveTab(v as 'email' | 'whatsapp')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> E-mail
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          {renderTemplateEditor('upcoming')}
          {renderTemplateEditor('due')}
          {renderTemplateEditor('overdue')}
          {renderTemplateEditor('critical')}
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          {renderTemplateEditor('upcoming')}
          {renderTemplateEditor('due')}
          {renderTemplateEditor('overdue')}
          {renderTemplateEditor('critical')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
