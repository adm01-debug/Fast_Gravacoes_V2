import * as React from 'react';
import { useState, useMemo } from 'react';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  Download,
  Search,
  X,
  UserCheck,
  UserX,
  UserMinus,
  Calendar,
  User
} from 'lucide-react';
import { useOperatorAudit } from '@/features/production';
import { format, subDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  activated: {
    label: 'Ativado',
    icon: UserCheck,
    color: 'bg-success/10 text-success border-success/30',
  },
  deactivated: {
    label: 'Desativado',
    icon: UserX,
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  removed: {
    label: 'Removido',
    icon: UserMinus,
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export function OperatorAuditHistory() {
  const { data: auditEntries = [], isLoading } = useOperatorAudit();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  // Apply Fuse.js fuzzy search for audit entries
  const fuseSearchedEntries = useFuseSearch(auditEntries, searchQuery, {
    keys: ['operator_name', 'performed_by_name'],
    threshold: 0.3,
  });

  const filteredEntries = useMemo(() => {
    return fuseSearchedEntries.filter((entry) => {
      // Filter by action
      const actionMatch = actionFilter === 'all' || entry.action === actionFilter;

      // Filter by period
      let periodMatch = true;
      if (periodFilter !== 'all') {
        const entryDate = new Date(entry.created_at);
        const daysAgo = parseInt(periodFilter, 10);
        periodMatch = isAfter(entryDate, subDays(new Date(), daysAgo));
      }

      return actionMatch && periodMatch;
    });
  }, [fuseSearchedEntries, actionFilter, periodFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setPeriodFilter('all');
  };

  const hasActiveFilters = searchQuery || actionFilter !== 'all' || periodFilter !== 'all';

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'Ação', 'Operador', 'Executado Por', 'Motivo'];
    const rows = filteredEntries.map(entry => [
      format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      actionConfig[entry.action].label,
      entry.operator_name || 'N/A',
      entry.performed_by_name || 'N/A',
      entry.reason || '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria-operadores-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Auditoria
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredEntries.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="activated">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3 text-success" />
                  Ativados
                </span>
              </SelectItem>
              <SelectItem value="deactivated">
                <span className="flex items-center gap-2">
                  <UserX className="h-3 w-3 text-warning" />
                  Desativados
                </span>
              </SelectItem>
              <SelectItem value="removed">
                <span className="flex items-center gap-2">
                  <UserMinus className="h-3 w-3 text-destructive" />
                  Removidos
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="outline" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && !isLoading && (
          <p className="text-sm text-muted-foreground">
            {filteredEntries.length} de {auditEntries.length} registros
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? 'Nenhum registro encontrado com os filtros aplicados'
                : 'Nenhum registro de auditoria ainda'
              }
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredEntries.map((entry, index) => {
                const config = actionConfig[entry.action];
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-card/50 animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className={`p-2 rounded-full ${config.color} border`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        <span className="font-medium">
                          {entry.operator_name || 'Operador desconhecido'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          por {entry.performed_by_name || 'Usuário'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {entry.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
