import { useEffect, useState } from 'react';
import { ShieldCheckIcon, LayoutDashboard, History, AlertTriangle, UserCheck, Settings2, Fingerprint, Lock, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditTrail } from '@/features/admin';
import { AuditFilters } from '@/features/admin/components/audit/AuditFilters';
import { AuditEntryCard } from '@/features/admin/components/audit/AuditEntryCard';
import { AuditChainStatus } from '@/features/admin/components/audit/AuditChainStatus';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuditAIAdvisor } from '@/features/admin/components/audit/AuditAIAdvisor';

import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import type { AuditFilters as AuditFiltersType } from '@/lib/schemas/auditLog';
import { motion } from 'framer-motion';

export default function AuditTrailPage() {
  const [filters, setFilters] = useState<AuditFiltersType>({ limit: 100 });
  const { data, isLoading, error } = useAuditTrail(filters);

  useEffect(() => {
    document.title = 'FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO | Auditoria';
  }, []);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
        <Breadcrumbs />

        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2 border-b border-border/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-primary">
              <ShieldCheckIcon className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl text-title font-black tracking-tighter flex items-center gap-2 uppercase">
                <span className="gradient-text animate-pulse-glow">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-success/10 text-success border-success/20">
                  <Lock className="h-2 w-2 mr-1" /> Imutável
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground font-black uppercase tracking-widest opacity-70">
                QUALIDADE + VELOCIDADE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AuditChainStatus />
            <Fingerprint className="h-5 w-5 text-muted-foreground/30" />
          </div>
        </header>

        <Tabs defaultValue="log" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="log" className="gap-2">
              <History className="h-4 w-4" />
              Log Completo
            </TabsTrigger>
            <TabsTrigger value="360" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão 360º
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-6">
            <AuditFilters filters={filters} onChange={setFilters} />
            <section className="space-y-3">
              {isLoading && (
                <>
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </>
              )}

              {error && (
                <div className="text-sm text-destructive p-4 border border-destructive/30 rounded-md bg-destructive/10">
                  Não foi possível carregar a trilha de auditoria. Verifique se você tem permissão de coordenador ou gerente.
                </div>
              )}

              {!isLoading && !error && (data?.length ?? 0) === 0 && (
                <div className="text-sm text-muted-foreground text-center py-16 border border-dashed border-border rounded-md">
                  Nenhum registro encontrado com os filtros atuais.
                </div>
              )}

              {data?.map((entry) => <AuditEntryCard key={entry.id} entry={entry} />)}
            </section>
          </TabsContent>

          <TabsContent value="360" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total de Eventos (Período)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black">{data?.length || 0}</p>
                    <History className="h-5 w-5 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Edições Críticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-warning">
                      {data?.filter(e => e.action === 'UPDATE').length || 0}
                    </p>
                    <AlertTriangle className="h-5 w-5 text-warning opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Usuários Ativos (Audit)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-success">
                      {new Set(data?.map(e => e.actor_id)).size}
                    </p>
                    <UserCheck className="h-5 w-5 text-success opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Alterações por Módulo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['jobs', 'machines', 'technical_sheets', 'maintenance'].map(module => {
                        const count = data?.filter(e => e.entity_type === module).length || 0;
                        const percentage = data?.length ? (count / data.length) * 100 : 0;
                        return (
                          <div key={module} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium uppercase tracking-tight">
                              <span>{module}</span>
                              <span>{count} eventos</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <AuditAIAdvisor />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
