/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OperatorConfirmDialogs } from '@/components/operators/OperatorConfirmDialogs';
import { OperatorsStats } from '@/components/operators/OperatorsStats';
import { Users, UserCheck, Phone, Calendar, Settings2, Search, X, UserPlus, Pencil, Clock, Trash2, UserX, Power, Command, Eye, TrendingUp, Trophy, QrCode as QrCodeIcon, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useOperators, OperatorWithProfile } from '@/features/production';
import { useOperatorPresence } from '@/features/production';
import { useOperatorMachines } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import { MachineAssignmentModal } from '@/components/operators/MachineAssignmentModal';
import { CreateOperatorModal } from '@/components/operators/CreateOperatorModal';
import { EditOperatorModal } from '@/components/operators/EditOperatorModal';
import { OperatorAuditHistory } from '@/components/operators/OperatorAuditHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { FavoriteButton, FavoritesDropdown } from '@/components/navigation/FavoritesManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OperatorPerformanceTab } from '@/components/operators/OperatorPerformanceTab';
import { OperatorGoalsTab } from '@/components/operators/OperatorGoalsTab';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkillsMatrix } from '@/components/operators/SkillsMatrix';
import { OperatorSkillsModal } from '@/components/operators/OperatorSkillsModal';
import { ShieldCheck, Trophy as TrophyIcon } from 'lucide-react';
import { OperatorLeaderboard } from '@/components/operators/OperatorLeaderboard';

const formatLastSeen = (date: Date | undefined) => {
  if (!date) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
};

export default function OperatorsPage() {
  const navigate = useNavigate();
  const { data: operators = [], isLoading, removeOperator, isRemoving, toggleActive, isToggling } = useOperators();
  const { assignments } = useOperatorMachines();
  const { machines } = useSchedulingData();
  const { isOnline, onlineCount, getLastSeen } = useOperatorPresence();
  const [selectedOperator, setSelectedOperator] = useState<OperatorWithProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editOperator, setEditOperator] = useState<OperatorWithProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorToRemove, setOperatorToRemove] = useState<OperatorWithProfile | null>(null);
  const [operatorToToggle, setOperatorToToggle] = useState<OperatorWithProfile | null>(null);
  const [operatorToShowDetails, setOperatorToShowDetails] = useState<OperatorWithProfile | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [operatorForQR, setOperatorForQR] = useState<OperatorWithProfile | null>(null);
  const [operatorForSkills, setOperatorForSkills] = useState<OperatorWithProfile | null>(null);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const activeOperators = operators.filter(op => op.is_active);
  const inactiveOperators = operators.filter(op => !op.is_active);



  const getAssignedMachineIds = (operatorId: string) => {
    return (assignments || []).filter(a => a.operator_id === operatorId).map(a => a.machine_id);
  };

  const getAssignedMachines = (operatorId: string) => {
    const machineIds = getAssignedMachineIds(operatorId);
    return machines.filter(m => machineIds.includes(m.id));
  };

  // Apply Fuse.js fuzzy search for operators
  const fuseSearchedOperators = useFuseSearch(operators, debouncedSearch, {
    keys: ['full_name'],
    threshold: 0.3,
  });

  const filteredOperators = useMemo(() => {
    return fuseSearchedOperators.filter((operator) => {
      // Filter by assigned machine
      const machineMatch = machineFilter === 'all' ||
        getAssignedMachineIds(operator.user_id).includes(machineFilter);

      // Filter by active status
      const statusMatch = statusFilter === 'all' ||
        (statusFilter === 'active' && operator.is_active) ||
        (statusFilter === 'inactive' && !operator.is_active);

      return machineMatch && statusMatch;
    });
  }, [fuseSearchedOperators, machineFilter, statusFilter, assignments, isOnline]);

  const handleOpenAssignment = (operator: OperatorWithProfile) => {
    setSelectedOperator(operator);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (operator: OperatorWithProfile) => {
    setEditOperator(operator);
    setIsEditModalOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMachineFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || machineFilter !== 'all' || statusFilter !== 'all';

  return (
    <MainLayout>
      <div className="space-y-6">
        <Helmet>
          <title>FAST GRAVAÇÕES | Gestão de Operadores</title>
          <meta name="description" content="FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO - Workforce Excellence 10/10" />
        </Helmet>
        <Breadcrumbs />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-title font-black tracking-tighter">
                <span className="gradient-text animate-pulse-glow">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
              </h1>
              <FavoriteButton path="/operators" name="Operadores" />
            </div>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-70">QUALIDADE + VELOCIDADE</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Favorites Dropdown */}
            <FavoritesDropdown onNavigate={(path) => navigate(path)} />

            {/* Command Palette Hint */}
            <Badge variant="outline" className="hidden md:flex gap-1.5 cursor-pointer hover:bg-muted transition-colors">
              <Command className="h-3 w-3" />
              <span className="text-xs">⌘K</span>
            </Badge>

            <Button onClick={() => setIsCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Operador
            </Button>
          </div>
        </div>

        <OperatorsStats
          total={operators.length}
          active={activeOperators.length}
          inactive={inactiveOperators.length}
          isLoading={isLoading}
        />

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="glass-card p-1">
            <TabsTrigger value="list">Lista de Operadores</TabsTrigger>
            <TabsTrigger value="matrix">Matrix de Polivalência</TabsTrigger>
            <TabsTrigger value="ranking">Ranking Global</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6 outline-none">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Orquestração de Equipe
                </CardTitle>
              </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
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
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por máquina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as máquinas</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      Ativos
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      Inativos
                    </span>
                  </SelectItem>
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
                {filteredOperators.length} de {operators.length} operadores
              </p>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/50">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOperators.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'Nenhum operador encontrado com os filtros aplicados' : 'Nenhum operador cadastrado'}
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOperators.map((operator, index) => (
                  <div
                    key={operator.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/5 transition-colors animate-fade-in ${
                      !operator.is_active ? 'opacity-60' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={operator.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {operator.full_name
                            ? operator.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            : 'OP'}
                        </AvatarFallback>
                      </Avatar>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background cursor-default ${
                                isOnline(operator.user_id) ? 'bg-success' : 'bg-muted-foreground/50'
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {isOnline(operator.user_id)
                              ? 'Online agora'
                              : getLastSeen(operator.user_id)
                                ? `Visto ${formatLastSeen(getLastSeen(operator.user_id))}`
                                : 'Offline'
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {operator.full_name || 'Nome não informado'}
                        </p>
                        {!operator.is_active && (
                          <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {operator.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {operator.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Desde {format(new Date(operator.created_at), "MMM yyyy", { locale: ptBR })}
                        </span>
                        {!isOnline(operator.user_id) && getLastSeen(operator.user_id) && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Visto {formatLastSeen(getLastSeen(operator.user_id))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {getAssignedMachines(operator.user_id).length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {getAssignedMachines(operator.user_id).slice(0, 3).map((machine) => (
                            <TooltipProvider key={machine.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs cursor-default">
                                    {machine.code}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{machine.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                          {getAssignedMachines(operator.user_id).length > 3 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-default">
                                    +{getAssignedMachines(operator.user_id).length - 3}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {getAssignedMachines(operator.user_id)
                                      .slice(3)
                                      .map(m => m.name)
                                      .join(', ')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sem máquinas
                        </Badge>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setOperatorToToggle(operator)}
                              className={`h-8 w-8 ${
                                operator.is_active
                                  ? 'text-muted-foreground hover:text-warning hover:bg-warning/10'
                                  : 'text-success hover:text-success hover:bg-success/10'
                              }`}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {operator.is_active ? 'Desativar operador' : 'Reativar operador'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setOperatorToRemove(operator)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover operador</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setOperatorForQR(operator)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <QrCodeIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Crachá Digital (QR)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setOperatorToShowDetails(operator);
                                setDetailsModalOpen(true);
                              }}
                              className="h-8 w-8 text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visualizar Perfil</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setOperatorForSkills(operator);
                                setIsSkillsModalOpen(true);
                              }}
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Competências Técnicas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEdit(operator)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Operador</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAssignment(operator)}
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Atribuir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="matrix" className="outline-none animate-fade-in">
        <SkillsMatrix />
      </TabsContent>

      <TabsContent value="ranking" className="outline-none animate-fade-in">
        <OperatorLeaderboard />
      </TabsContent>
    </Tabs>

        {/* Operator QR Badge Dialog */}
        <Dialog open={!!operatorForQR} onOpenChange={() => setOperatorForQR(null)}>
          <DialogContent className="sm:max-w-xs text-center p-6">
            <DialogHeader>
              <DialogTitle className="text-center text-title font-black uppercase tracking-tighter">Crachá Digital</DialogTitle>
              <DialogDescription className="text-center">FAST GRAVAÇÕES - Identificação Industrial</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 py-6 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl border border-primary/10">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={operatorForQR?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {operatorForQR?.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-xl">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: operatorForQR?.user_id,
                    name: operatorForQR?.full_name,
                    type: 'operator_badge'
                  })}
                  size={160}
                  level="H"
                />
              </div>

              <div className="space-y-1">
                <p className="text-lg font-black uppercase leading-tight">{operatorForQR?.full_name}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{operatorForQR?.role || 'OPERADOR INDUSTRIAL'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <Button className="gap-2 w-full font-bold" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir Crachá
              </Button>
              <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setOperatorForQR(null)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Operator Details Modal */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={operatorToShowDetails?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {operatorToShowDetails?.full_name
                      ? operatorToShowDetails.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'OP'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl">
                    {operatorToShowDetails?.full_name}
                  </DialogTitle>
                  <DialogDescription>
                    {operatorToShowDetails?.phone || 'Sem telefone'} • Ativo desde {operatorToShowDetails && format(new Date(operatorToShowDetails.created_at), "dd/MM/yyyy")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="performance" className="mt-4 flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Desempenho
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Metas
                </TabsTrigger>
                <TabsTrigger value="machines" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Máquinas & Config
                </TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="flex-1 mt-4 overflow-auto min-h-0">
                {operatorToShowDetails && (
                  <OperatorPerformanceTab operatorId={operatorToShowDetails.user_id} />
                )}
              </TabsContent>

              <TabsContent value="goals" className="flex-1 mt-4 overflow-auto min-h-0">
                {operatorToShowDetails && (
                  <OperatorGoalsTab operatorId={operatorToShowDetails.user_id} />
                )}
              </TabsContent>

              <TabsContent value="machines" className="flex-1 mt-4 overflow-auto min-h-0">
                <div className="space-y-6 pb-6">
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Máquinas Atribuídas</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {operatorToShowDetails && getAssignedMachines(operatorToShowDetails.user_id).length > 0 ? (
                        getAssignedMachines(operatorToShowDetails.user_id).map(machine => (
                          <div key={machine.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-background flex items-center justify-center">
                                <Command className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{machine.code}</p>
                                <p className="text-xs text-muted-foreground">{machine.name}</p>
                              </div>
                            </div>
                            {machine.is_active ? (
                              <Badge variant="outline" className="text-success border-success/30 text-[10px]">Ativa</Badge>
                            ) : (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Inativa</Badge>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center col-span-2 border border-dashed rounded-lg">
                          Nenhuma máquina atribuída a este operador.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        if (operatorToShowDetails) handleOpenAssignment(operatorToShowDetails);
                      }}
                    >
                      Gerenciar Atribuições
                    </Button>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status do Sistema</h3>
                    <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Conta Ativa</span>
                        <Badge variant={operatorToShowDetails?.is_active ? 'success' : 'warning'}>
                          {operatorToShowDetails?.is_active ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Presença (Tempo Real)</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${operatorToShowDetails && isOnline(operatorToShowDetails.user_id) ? 'bg-success' : 'bg-muted-foreground/50'}`} />
                          <span className="text-sm">
                            {operatorToShowDetails && isOnline(operatorToShowDetails.user_id) ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                      </div>
                      {operatorToShowDetails && !isOnline(operatorToShowDetails.user_id) && getLastSeen(operatorToShowDetails.user_id) && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Última vez visto</span>
                          <span>{formatLastSeen(getLastSeen(operatorToShowDetails.user_id))}</span>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <OperatorAuditHistory />

        <MachineAssignmentModal
          operator={selectedOperator}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />

        <CreateOperatorModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />

        <EditOperatorModal
          operator={editOperator}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />

        <OperatorSkillsModal
          operator={operatorForSkills}
          open={isSkillsModalOpen}
          onOpenChange={setIsSkillsModalOpen}
        />

        <OperatorConfirmDialogs
          operatorToRemove={operatorToRemove}
          operatorToToggle={operatorToToggle}
          isRemoving={isRemoving}
          isToggling={isToggling}
          onRemoveClose={() => setOperatorToRemove(null)}
          onToggleClose={() => setOperatorToToggle(null)}
          onRemoveConfirm={(reason) => {
            if (operatorToRemove) {
              removeOperator({
                operatorId: operatorToRemove.user_id,
                operatorName: operatorToRemove.full_name,
                reason
              });
              setOperatorToRemove(null);
            }
          }}
          onToggleConfirm={(reason) => {
            if (operatorToToggle) {
              toggleActive({
                operatorId: operatorToToggle.user_id,
                operatorName: operatorToToggle.full_name,
                isActive: !operatorToToggle.is_active,
                reason
              });
              setOperatorToToggle(null);
            }
          }}
        />
      </div>
    </MainLayout>
  );
}
