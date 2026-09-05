import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ShieldCheckIcon,
  PlusCircleIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
  HashIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AuditLogEntry } from '@/lib/schemas/auditLog';

interface AuditEntryCardProps {
  entry: AuditLogEntry;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
type ActionCfg = { icon: LucideIcon; label: string; variant: BadgeVariant; color: string };

const actionConfig: Record<string, ActionCfg> = {
  INSERT: { icon: PlusCircleIcon, label: 'Criado', variant: 'default', color: 'text-primary' },
  UPDATE: { icon: PencilIcon, label: 'Atualizado', variant: 'secondary', color: 'text-secondary-foreground' },
  DELETE: { icon: Trash2Icon, label: 'Excluído', variant: 'destructive', color: 'text-destructive' },
  status_change: { icon: ShieldCheckIcon, label: 'Status Alterado', variant: 'outline', color: 'text-warning' },
};

const defaultAction = { icon: ShieldCheckIcon, label: 'Ação', variant: 'outline' as const, color: 'text-muted-foreground' };

function shortHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export const AuditEntryCard = memo(function AuditEntryCard({ entry }: AuditEntryCardProps) {
  const cfg = actionConfig[entry.action] || defaultAction;
  const ActionIcon = cfg.icon;
  const date = new Date(entry.created_at);

  // Helper to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished': return 'text-success border-success/30 bg-success/10';
      case 'production': return 'text-warning border-warning/30 bg-warning/10';
      case 'scheduled': return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
      default: return 'text-muted-foreground border-zinc-500/30 bg-zinc-500/10';
    }
  };

  return (
    <Card className="p-4 space-y-3 border-border bg-card hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ActionIcon className={cn("h-5 w-5", cfg.color)} aria-hidden />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
              <span className="text-sm font-mono text-muted-foreground">{entry.entity_type}</span>
              <span className="text-xs font-mono text-muted-foreground">
                #{entry.entity_id.slice(0, 8)}
              </span>
            </div>
            
            {entry.action === 'status_change' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground italic">Alterado para:</span>
                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", getStatusColor(String((entry.new_values as { status?: string } | null)?.status || '')))}>
                  {String((entry.new_values as { status?: string } | null)?.status || 'status')}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <UserIcon className="h-3 w-3" aria-hidden />
              <span>{entry.actor_email ?? entry.actor_id ?? 'Sistema'}</span>
              <span>•</span>
              <span>{format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
            </div>
          </div>
        </div>
        <ShieldCheckIcon className="h-4 w-4 text-primary/60 shrink-0" aria-hidden />
      </div>

      {entry.changed_fields && entry.changed_fields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.changed_fields.map((field) => (
            <Badge key={field} variant="outline" className="text-[10px] uppercase font-bold bg-muted/30">
              {field}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/60 border-t border-border pt-2">
        <HashIcon className="h-3 w-3" aria-hidden />
        <span title={entry.hash}>{shortHash(entry.hash)}</span>
        {entry.previous_hash && (
          <>
            <span>←</span>
            <span title={entry.previous_hash}>{shortHash(entry.previous_hash)}</span>
          </>
        )}
      </div>
    </Card>
  );
});
