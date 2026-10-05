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
import { OperatorCard } from '@/components/operators/OperatorCard';
import { OperatorQRBadgeDialog } from '@/components/operators/OperatorQRBadgeDialog';
import { OperatorDetailsDialog } from '@/components/operators/OperatorDetailsDialog';
import { ShieldCheck, Trophy as TrophyIcon } from 'lucide-react';
import { OperatorLeaderboard } from '@/components/operators/OperatorLeaderboard';

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
                  <OperatorCard
                    key={operator.id}
                    operator={operator}
                    index={index}
                    assignedMachines={getAssignedMachines(operator.user_id)}
                    isOnline={isOnline(operator.user_id)}
                    lastSeen={getLastSeen(operator.user_id)}
                    onOpenDetails={() => { setOperatorToShowDetails(operator); setDetailsModalOpen(true); }}
                    onOpenSkills={() => { setOperatorForSkills(operator); setIsSkillsModalOpen(true); }}
                    onOpenEdit={() => handleOpenEdit(operator)}
                    onOpenAssignment={() => handleOpenAssignment(operator)}
                    onShowQR={() => setOperatorForQR(operator)}
                    onToggle={() => setOperatorToToggle(operator)}
                    onRemove={() => setOperatorToRemove(operator)}
                  />
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

        <OperatorQRBadgeDialog
          operator={operatorForQR}
          onClose={() => setOperatorForQR(null)}
        />


        {/* Operator Details Modal */}
        <OperatorDetailsDialog
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          operator={operatorToShowDetails}
          isOnline={operatorToShowDetails ? isOnline(operatorToShowDetails.user_id) : false}
          lastSeen={operatorToShowDetails ? getLastSeen(operatorToShowDetails.user_id) : undefined}
          assignedMachines={operatorToShowDetails ? getAssignedMachines(operatorToShowDetails.user_id) : []}
          onOpenAssignment={() => { if (operatorToShowDetails) handleOpenAssignment(operatorToShowDetails); }}
        />

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
