import { Copy, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChecklistTemplate } from '@/hooks/useShiftHandover';

const TECHNIQUE_LABELS: Record<string, string> = {
  serigrafia: 'Serigrafia',
  tampografia: 'Tampografia',
  laser: 'Laser',
  transfer: 'Transfer',
  bordado: 'Bordado',
  sublimacao: 'Sublimação',
  gravacao: 'Gravação'
};

interface TemplateCardProps {
  template: ChecklistTemplate;
  onEdit: (template: ChecklistTemplate) => void;
  onDuplicate: (template: ChecklistTemplate) => void;
  onDelete: (id: string) => void;
  isDuplicating: boolean;
}

export function TemplateCard({ template, onEdit, onDuplicate, onDelete, isDuplicating }: TemplateCardProps) {
  return (
    <Card className={!template.is_active ? 'opacity-60' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold">{template.name}</h4>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => onDuplicate(template)}
              disabled={isDuplicating}
              title="Duplicar template"
              aria-label="Duplicar template"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => onEdit(template)}
              title="Editar template"
              aria-label="Editar template"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
              onClick={() => onDelete(template.id)}
              title="Excluir template"
              aria-label="Excluir template"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {template.technique_id && (
            <Badge variant="secondary">
              {TECHNIQUE_LABELS[template.technique_id] || template.technique_id}
            </Badge>
          )}
          {!template.is_active && (
            <Badge variant="outline">Inativo</Badge>
          )}
          <Badge variant="outline" className="ml-auto">
            {template.items.length} itens
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground space-y-1 max-h-[120px] overflow-y-auto">
          {template.items.slice(0, 4).map((item, idx) => (
            <p key={idx} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-xs">
                {idx + 1}
              </span>
              <span className="truncate">{item.description}</span>
            </p>
          ))}
          {template.items.length > 4 && (
            <p className="text-xs text-muted-foreground">
              +{template.items.length - 4} itens...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
