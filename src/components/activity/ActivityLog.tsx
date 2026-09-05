/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  ArrowRight,
  Clock,
  User,
  Edit,
  Trash2,
  Plus,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { type ActivityType, type ActivityLogEntry } from "@/features/admin";


interface ActivityLogProps {
  entries: ActivityLogEntry[];
  title?: string;
  maxHeight?: string;
  showGrouping?: boolean;
  className?: string;
}

const activityConfig: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
  create: { icon: <Plus className="h-4 w-4" />, color: "text-success" },
  update: { icon: <Edit className="h-4 w-4" />, color: "text-primary" },
  delete: { icon: <Trash2 className="h-4 w-4" />, color: "text-destructive" },
  view: { icon: <Eye className="h-4 w-4" />, color: "text-muted-foreground" },
  login: { icon: <User className="h-4 w-4" />, color: "text-info" },
  logout: { icon: <User className="h-4 w-4" />, color: "text-muted-foreground" },
  settings: { icon: <Settings className="h-4 w-4" />, color: "text-warning" },
  error: { icon: <XCircle className="h-4 w-4" />, color: "text-destructive" },
  success: { icon: <CheckCircle className="h-4 w-4" />, color: "text-success" },
  warning: { icon: <AlertCircle className="h-4 w-4" />, color: "text-warning" },
};

export function ActivityLog({
  entries,
  title = "Atividade Recente",
  maxHeight = "400px",
  showGrouping = true,
  className,
}: ActivityLogProps) {
  // Group entries by date — compute reference dates outside useMemo to avoid
  // calling impure Date constructors inside the memoized computation.
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  const groupedEntries = React.useMemo(() => {
    if (!showGrouping) return { all: entries };

    return entries.reduce((groups, entry) => {
      const date = new Date(entry.timestamp).toDateString();
      const today = todayStr;
      const yesterday = yesterdayStr;

      let groupKey: string;
      if (date === today) {
        groupKey = "Hoje";
      } else if (date === yesterday) {
        groupKey = "Ontem";
      } else {
        groupKey = new Date(entry.timestamp).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
      return groups;
    }, {} as Record<string, ActivityLogEntry[]>);
   
  }, [entries, showGrouping, todayStr, yesterdayStr]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          {title}
        </CardTitle>
        <Badge variant="secondary">{entries.length}</Badge>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="px-4 pb-4">
            {Object.entries(groupedEntries).map(([group, groupEntries], groupIndex) => (
              <div key={group}>
                {showGrouping && (
                  <>
                    {groupIndex > 0 && <Separator className="my-4" />}
                    <p className="text-xs font-medium text-muted-foreground mb-3 capitalize">
                      {group}
                    </p>
                  </>
                )}

                <div className="space-y-3">
                  <AnimatePresence>
                    {groupEntries.map((entry, index) => (
                      <ActivityEntry key={entry.id} entry={entry} index={index} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade recente
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityEntry({ entry, index }: { entry: ActivityLogEntry; index: number }) {
  const config = activityConfig[entry.type];
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.03 }}
      className="relative pl-6"
    >
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 top-1 h-4 w-4 rounded-full flex items-center justify-center",
          "bg-background border-2 border-border",
          config.color
        )}
      >
        {React.cloneElement(config.icon as React.ReactElement, {
          className: "h-2.5 w-2.5",
        })}
      </div>

      {/* Content */}
      <div
        className={cn(
          "rounded-lg p-3 transition-colors",
          entry.changes && entry.changes.length > 0 && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => entry.changes && setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (entry.changes && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        role={entry.changes && entry.changes.length > 0 ? "button" : undefined}
        tabIndex={entry.changes && entry.changes.length > 0 ? 0 : undefined}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{entry.title}</p>
            {entry.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.description}
              </p>
            )}
          </div>

          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        {/* User info */}
        {entry.user && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{entry.user.name}</span>
          </div>
        )}

        {/* Changes */}
        <AnimatePresence>
          {isExpanded && entry.changes && entry.changes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t space-y-2"
            >
              {entry.changes.map((change, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-muted-foreground min-w-[80px]">
                    {change.field}:
                  </span>
                  {change.from && (
                    <>
                      <span className="text-destructive line-through">
                        {change.from}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <span className="text-success">{change.to}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export { useActivityLog } from "@/features/admin";
