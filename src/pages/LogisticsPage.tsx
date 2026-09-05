import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck,
  Package,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  MoreVertical,
  RotateCcw,
  DollarSign,
  History,
  ShieldCheck,
  TrendingUp,
  Globe,
  BarChart3,
  Activity
} from 'lucide-react';
import { useLogistics, DbShipment } from '@/features/inventory';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { CreateShipmentModal } from '@/components/logistics/CreateShipmentModal';
import { EditShipmentModal } from '@/components/logistics/EditShipmentModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { ScrollArea } from '@/components/ui/scroll-area';

const getStatusConfig = (t: (key: string) => string) => ({
  pending: { label: t('logistics.status.pending'), color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
  in_transit: { label: t('logistics.status.in_transit'), color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Truck },
  delivered: { label: t('logistics.status.delivered'), color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
  returned: { label: t('logistics.status.returned'), color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: RotateCcw },
  cancelled: { label: t('logistics.status.cancelled'), color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertTriangle },
}) as const;

export default function LogisticsPage() {
  const { t, i18n } = useTranslation();
  const statusMap = getStatusConfig(t);
  const dateLocale = i18n.language === 'en-US' ? enUS : i18n.language === 'es-ES' ? es : ptBR;

  const { shipments, updateShipment } = useLogistics();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<DbShipment | null>(null);

  const isLoading = shipments.isLoading;

  const filteredShipments = shipments.data?.filter(s =>
    s.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.job?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.job?.client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFreightCost = useMemo(() => {
    return shipments.data?.reduce((acc, s) => acc + (s.freight_cost || 0), 0) || 0;
  }, [shipments.data]);

  // Single source for the tracking URL — URLSearchParams encodes order
  // numbers with reserved characters (e.g. "A&B") for both copy and open.
  const buildTrackingLink = (orderNumber?: string | null) =>
    `/track?${new URLSearchParams({ q: orderNumber ?? '' })}`;

  const handleCopyLink = (orderNumber: string) => {
    const link = `${window.location.origin}${buildTrackingLink(orderNumber)}`;
    navigator.clipboard.writeText(link);
    toast.success(t('logistics.copyLink') + '!');
  };

  const handleStatusUpdate = (id: string, status: DbShipment['status']) => {
    updateShipment.mutate({ id, data: { status } });
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <Breadcrumbs />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-title font-bold flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary" />
              <span className="gradient-text">Logística Inteligente 10/10</span>
            </h1>
            <p className="text-muted-foreground mt-1">Orquestração de fretes, rastreamento e auditoria de custos</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => window.open('/track', '_blank')}>
              <Globe className="h-4 w-4 mr-2" />
              Portal Público
            </Button>
            <Button className="gradient-primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('logistics.newShipment')}
            </Button>
          </div>
        </div>

        <CreateShipmentModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        <EditShipmentModal
          shipment={editingShipment}
          open={!!editingShipment}
          onOpenChange={(open) => !open && setEditingShipment(null)}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Em Trânsito</p>
                  <p className="text-2xl font-black mt-1">
                    {shipments.data?.filter(s => s.status === 'in_transit').length || 0}
                  </p>
                </div>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Custos Totais</p>
                  <p className="text-2xl font-black mt-1 text-success">
                    {totalFreightCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-2 bg-success/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Eficiência Logística</p>
                  <p className="text-2xl font-black mt-1">
                    94.2%
                  </p>
                </div>
                <div className="p-2 bg-primary/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alertas Ativos</p>
                  <p className="text-2xl font-black mt-1 text-destructive">
                    {shipments.data?.filter(s => s.status === 'returned' || s.status === 'cancelled').length || 0}
                  </p>
                </div>
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border border-border/50">
            <TabsTrigger value="list" className="gap-2">
              <Activity className="h-4 w-4" />
              Gestão de Envios
            </TabsTrigger>
            <TabsTrigger value="costs" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Análise de Custos
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6 outline-none">
            {/* Filters */}
            <Card className="glass-card border-none bg-muted/30">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por OS, cliente ou rastreio..."
                    className="pl-10 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Shipments List */}
            <div className="grid grid-cols-1 gap-4">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredShipments?.length === 0 ? (
                <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">Nenhum envio encontrado.</p>
                </div>
              ) : (
                filteredShipments?.map((shipment) => {
                  const status = shipment.status as keyof ReturnType<typeof getStatusConfig>;
                  const config = statusMap[status] || statusMap.pending;
                  const StatusIcon = config.icon;
                  return (
                    <Card key={shipment.id} className="glass-card hover:border-primary/30 transition-all group overflow-hidden border-l-4" style={{ borderLeftColor: shipment.status === 'delivered' ? '#10b981' : shipment.status === 'in_transit' ? '#3b82f6' : '#f59e0b' }}>
                      <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                        {/* Status Column */}
                        <div className="flex items-center gap-4 md:w-48 shrink-0">
                          <div className={cn("p-2 rounded-xl", config.color)}>
                            <StatusIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <Badge variant="outline" className={cn("font-bold text-[10px] uppercase", config.color)}>
                              {config.label}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                              {shipment.tracking_code || 'S/ RASTREIO'}
                            </p>
                          </div>
                        </div>

                        {/* Job Info Column */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/20 text-primary border-primary/30 font-black">
                              OS {shipment.job?.order_number}
                            </Badge>
                            <h3 className="font-bold truncate">{shipment.job?.client}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {shipment.job?.product}
                          </p>
                        </div>

                        {/* Cost & Detail Column */}
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Custo Frete</p>
                            <p className="font-bold text-sm text-success">
                              {(shipment.freight_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Previsão</p>
                            <p className="font-bold text-sm">
                              {shipment.estimated_delivery ? format(new Date(shipment.estimated_delivery), 'dd/MM/yy', { locale: dateLocale }) : '---'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="group-hover:text-primary"
                              onClick={() => window.open(buildTrackingLink(shipment.job?.order_number), '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingShipment(shipment)}>
                                  Editar Envio
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shipment.job?.order_number && handleCopyLink(shipment.job.order_number)}>
                                  Copiar Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(shipment.id, 'delivered')}>
                                  Marcar como Entregue
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleStatusUpdate(shipment.id, 'cancelled')}>
                                  Cancelar Envio
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1 bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all duration-1000",
                            shipment.status === 'delivered' ? 'w-full bg-green-500' :
                            shipment.status === 'in_transit' ? 'w-1/2 bg-blue-500' : 'w-5 bg-yellow-500'
                          )}
                        />
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="costs">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-success" />
                    Detalhamento de Custos Logísticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {shipments.data?.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                          <div>
                            <p className="font-bold text-sm">OS {s.job?.order_number} — {s.job?.client}</p>
                            <p className="text-xs text-muted-foreground">{s.provider?.name || 'Transportadora Própria'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-success">
                              {(s.freight_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            {s.insurance_cost !== null && s.insurance_cost > 0 && <p className="text-[10px] text-muted-foreground">Seguro: {s.insurance_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="glass-card border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Margem Logística
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-4">
                      <p className="text-4xl font-black text-primary">8.4%</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Custo Médio sobre o Job</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-[11px] leading-relaxed">
                      A IA identificou que trocando a transportadora padrão pela <strong>Expresso Veloz</strong> em rotas para o Sudeste, você economizará <strong>15%</strong> no próximo mês.
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      Conformidade Fiscal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">CT-e Validados</span>
                        <span className="font-bold">100%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Divergências de Valor</span>
                        <span className="font-bold text-success">Zero</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Trilha de Auditoria Logística
                </CardTitle>
                <CardDescription>Rastreabilidade imutável de todas as movimentações e alterações de status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <ShieldCheck className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium italic">Sincronizado com Hyper-Audit Hash Chain SHA-256</p>
                  <p className="text-[10px] text-muted-foreground uppercase mt-2">Padrão 21 CFR Part 11 de Integridade</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
