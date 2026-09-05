import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Package, AlertTriangle, CheckSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import { usePackagingAuditTimeline, type AuditEntry } from '../hooks/usePackagingAuditTimeline';

interface Props {
  taskId: string | null;
}

const ENTITY_META: Record<string, { label: string; Icon: typeof Package }> = {
  packaging_tasks: { label: 'Tarefa', Icon: Package },
  packaging_defects: { label: 'Defeito', Icon: AlertTriangle },
  packaging_task_checklist: { label: 'Checklist', Icon: CheckSquare },
};

const ACTION_META: Record<string, { label: string; Icon: typeof Plus; tone: string }> = {
  INSERT: { label: 'Criado', Icon: Plus, tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  UPDATE: { label: 'Alterado', Icon: Pencil, tone: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  DELETE: { label: 'Removido', Icon: Trash2, tone: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

function summarizeChange(entry: AuditEntry): string | null {
  if (entry.action !== 'UPDATE') return null;
  const fields = entry.changed_fields ?? [];
  if (fields.length === 0) return null;
  const highlight = ['status', 'decision', 'severity', 'is_checked', 'received_quantity', 'approved_quantity', 'defect_quantity'];
  const relevant = fields.filter((f) => highlight.includes(f));
  const list = (relevant.length ? relevant : fields).slice(0, 4);
  return list
    .map((f) => {
      const oldV = entry.old_data?.[f];
      const newV = entry.new_data?.[f];
      return `${f}: ${formatVal(oldV)} → ${formatVal(newV)}`;
    })
    .join(' · ');
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'object') return '…';
  return String(v);
}

export function PackagingAuditTimeline({ taskId }: Props) {
  const { data: entries, isLoading } = usePackagingAuditTimeline(taskId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Sem eventos de auditoria registrados.</p>
        <p className="text-xs mt-1">Somente coordenadores e gerentes têm acesso ao histórico.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-border" aria-hidden />
      <ul className="space-y-4">
        {entries.map((entry) => {
          const entity = ENTITY_META[entry.entity_type] ?? { label: entry.entity_type, Icon: Activity };
          const action = ACTION_META[entry.action] ?? { label: entry.action, Icon: Activity, tone: '' };
          const summary = summarizeChange(entry);
          const EntityIcon = entity.Icon;
          const ActionIcon = action.Icon;
          return (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[18px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border">
                <EntityIcon className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={action.tone}>
                    <ActionIcon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Badge>
                  <span className="text-sm font-medium">{entity.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Por <span className="font-medium text-foreground">{entry.actor_email ?? 'sistema'}</span>
                </div>
                {summary && (
                  <div className="mt-2 text-xs font-mono bg-muted/40 rounded px-2 py-1 break-words">{summary}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
