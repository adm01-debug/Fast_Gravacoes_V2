import { format } from 'date-fns';
import { History } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { useTechnicalSheetAudit } from '@/hooks/technical-sheets/useTechnicalSheetsQueries';

type AuditLogs = Exclude<ReturnType<typeof useTechnicalSheetAudit>['data'], undefined>;

interface TechnicalSheetHistoryTabProps {
  auditLogs: AuditLogs;
  isLoading: boolean;
}

export function TechnicalSheetHistoryTab({ auditLogs, isLoading: isLoadingAudit }: TechnicalSheetHistoryTabProps) {
  return (
                  <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Log de Alterações</h3>
                      <p className="text-sm text-muted-foreground">Rastreabilidade completa de edições e homologações</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isLoadingAudit ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">Carregando histórico...</div>
                    ) : auditLogs.length > 0 ? (
                      auditLogs.map((log) => {
                        const profiles = (log.profiles ?? null) as { avatar_url?: string | null; display_name?: string | null } | null;
                        return (
                        <div key={log.id} className="relative pl-8 pb-8 border-l last:border-l-0">
                          <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full ${
                            log.action === 'CREATE' ? 'bg-success' :
                            log.action === 'DELETE' ? 'bg-rose-500' : 'bg-primary'
                          } shadow-sm`} />
                          <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {log.action === 'CREATE' ? 'Criação' :
                                 log.action === 'UPDATE' ? 'Atualização' :
                                 log.action === 'VERSION_BUMP' ? 'Nova Versão' : log.action}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm") : '-'}
                              </span>
                            </div>
                            <p className="text-sm">
                              {log.change_summary || (log.action === 'CREATE' ? 'Ficha técnica criada.' : 'Alterações realizadas nos parâmetros.')}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              {profiles?.avatar_url ? (
                                <img src={profiles.avatar_url} alt={profiles.display_name ?? ''} className="h-6 w-6 rounded-full" />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                  {profiles?.display_name?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                              )}
                              <span className="text-xs font-medium">{profiles?.display_name || 'Sistema'}</span>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Nenhum registro de auditoria encontrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
  );
}
