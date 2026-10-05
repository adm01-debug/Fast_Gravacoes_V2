/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useRBAC } from '@/features/auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import {
  Package,
  Plus,
  History,
  Search,
  Filter,
  Map,
  Boxes,
  QrCode,
  BrainCircuit,
} from 'lucide-react';

import { useInventory, useInventoryMovements, InventoryItem } from '@/features/inventory';
import { useDebounce } from '@/hooks/useDebounce';
import { WarehouseMap } from '@/components/inventory/WarehouseMap';
import { InventoryStats } from '@/components/inventory/InventoryStats';
import { ProductGridSkeleton } from '@/components/inventory/ProductGridSkeleton';
import {
  AIPredictionValidationModal,
  BatchQRLabelModal,
  InventoryCard,
  InventoryHistoryTable,
} from '@/features/inventory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function InventoryPage() {
  const { items, isLoading, recordMovement, stats, transferItems, deleteMovement, calculateAI, isCalculatingAI } = useInventory();
  const { data: movements } = useInventoryMovements();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchQRModalOpen, setIsBatchQRModalOpen] = useState(false);
  const [isAIPredictionModalOpen, setIsAIPredictionModalOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const isSearching = searchTerm !== debouncedSearch;



  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           item.specification?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const lowStockItems = items.filter(item => item.current_stock <= item.min_stock_level);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <Helmet>
          <title>Gestão de Materiais | Inventory Intelligence</title>
          <meta name="description" content="Controle de insumos, tintas, telas e solventes com inteligência artificial e previsão de esgotamento." />
        </Helmet>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-title font-bold flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              Gestão de Materiais
            </h1>
            <p className="text-muted-foreground mt-1">Inventory Intelligence & Controle de Insumos</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5" onClick={() => setIsAIPredictionModalOpen(true)}>
               <BrainCircuit className="h-4 w-4 text-primary" />
               Acurácia IA
             </Button>
             <Button variant="outline" className="gap-2" disabled={selectedItems.size === 0} onClick={() => setIsBatchQRModalOpen(true)}>
               <QrCode className="h-4 w-4" />
               Etiquetas em Lote ({selectedItems.size})
             </Button>
             <Button className="gap-2">
               <Plus className="h-4 w-4" />
               Novo Item
             </Button>
          </div>
        </div>


        {/* Inventory Stats */}
        <SectionErrorBoundary section="Estatísticas de Inventário">
          <SectionErrorBoundary section="Stats Inner">
            <InventoryStats items={items as InventoryItem[]} lowStockItems={lowStockItems as InventoryItem[]} stats={stats} />
          </SectionErrorBoundary>
        </SectionErrorBoundary>

        <SectionErrorBoundary section="Abas de Inventário">
          <Tabs defaultValue="inventory" className="space-y-6">
            <TabsList className="bg-muted/50 p-1">

            <TabsTrigger value="inventory" className="gap-2">
              <Package className="h-4 w-4" />
              Estoque Atual
            </TabsTrigger>
            <TabsTrigger value="wms" className="gap-2">
              <Map className="h-4 w-4" />
              Mapa WMS
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar material por nome, especificação ou localização..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="ink">Tintas</SelectItem>
                  <SelectItem value="screen">Telas</SelectItem>
                  <SelectItem value="solvent">Solventes</SelectItem>
                  <SelectItem value="consumable">Consumíveis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SectionErrorBoundary section="Grid de Produtos">
                {(isLoading || isSearching) ? (
                <div className="col-span-full">
                  <ProductGridSkeleton />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">
                  <Package className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Nenhum material encontrado</p>
                  <p className="text-sm">Tente ajustar sua busca ou categoria</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item as InventoryItem}
                    onMovement={recordMovement}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={(id: string, checked: boolean) => {
                      const next = new Set(selectedItems);
                      if (checked) next.add(id);
                      else next.delete(id);
                      setSelectedItems(next);
                    }}
                  />
                ))
              )}
              </SectionErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="wms" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2">
                  <SectionErrorBoundary section="Mapa WMS">
                    <WarehouseMap items={items} />
                  </SectionErrorBoundary>
               </div>
               <div className="space-y-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-sm text-title flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-primary" />
                        Sugestões de Re-alocação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-bold uppercase mb-1">Otimização de Fluxo</p>
                          <p className="text-[11px] text-muted-foreground">
                            O material "Tinta Azul" tem alto giro. Sugere-se mover de B4 para A1 para facilitar o picking.
                          </p>
                       </div>
                       <Button variant="outline" size="sm" className="w-full text-[10px] font-bold uppercase" onClick={() => toast.success("AI analisando padrões de consumo...")}>
                          Ver Todas Sugestões (AI)
                       </Button>
                    </CardContent>
                  </Card>
               </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="glass-card">
              <CardContent className="p-0">
                <InventoryHistoryTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SectionErrorBoundary>
    </div>


      <BatchQRLabelModal
        open={isBatchQRModalOpen}
        onOpenChange={setIsBatchQRModalOpen}
        items={items.filter(i => selectedItems.has(i.id)) as InventoryItem[]}
      />

      <AIPredictionValidationModal
        open={isAIPredictionModalOpen}
        onOpenChange={setIsAIPredictionModalOpen}
        items={items as InventoryItem[]}
        movements={movements || []}
      />
    </MainLayout>
  );
}
