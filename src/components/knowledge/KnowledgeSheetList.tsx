import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Clock, ChevronRight, FileText, Star, TrendingUp, Filter } from 'lucide-react';
import { TechnicalSheet } from '@/hooks/technical-sheets/technicalSheetsTypes';
import { useTechnicalSheetFavorites, useTechnicalSheetMutations } from '@/hooks/useTechnicalSheets';
import { KnowledgeStatusBadge } from './KnowledgeStatusBadge';

interface KnowledgeSheetListProps {
  sheets: Record<string, TechnicalSheet[]>;
  techniques: Array<{ id: string; name: string; color: string }>;
  categories: Array<{ id: string; name: string }>;
  machines: Array<{ id: string; name: string; code: string }>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTechnique: string;
  onTechniqueChange: (id: string) => void;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  selectedMachine: string;
  onMachineChange: (id: string) => void;
  selectedSheet: string | null;
  onSheetClick: (id: string) => void;
  canEdit: boolean;
  onCreateNew: () => void;
  isLoading: boolean;
  hasFilters: boolean;
}

export const KnowledgeSheetList = ({
  sheets,
  techniques,
  categories,
  machines,
  searchTerm,
  onSearchChange,
  selectedTechnique,
  onTechniqueChange,
  selectedCategory,
  onCategoryChange,
  selectedMachine,
  onMachineChange,
  selectedSheet,
  onSheetClick,
  canEdit,
  onCreateNew,
  isLoading,
  hasFilters,
}: KnowledgeSheetListProps) => {
  const { data: favorites = [] } = useTechnicalSheetFavorites();
  const { toggleFavorite: toggleFavoriteMutation } = useTechnicalSheetMutations();

  const toggleFavorite = (e: React.MouseEvent, sheetId: string) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate({ sheetId, isFavorite: favorites.includes(sheetId) });
  };

  return (
    <Card className="glass-card border-border/50 flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fichas, materiais, máquinas..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedTechnique} onValueChange={onTechniqueChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Técnica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Técnicas</SelectItem>
                {techniques.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Produtos</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={selectedMachine} onValueChange={onMachineChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Máquina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Máquinas</SelectItem>
              {machines.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-4">
          {!isLoading && favorites.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Star className="h-3 w-3 fill-primary" />
                Favoritos
              </div>
              <div className="space-y-2">
                {Object.values(sheets).flat().filter((s: TechnicalSheet) => favorites.includes(s.id)).map((sheet: TechnicalSheet) => (
                  <button
                    key={`fav-${sheet.id}`}
                    onClick={() => onSheetClick(sheet.id)}
                    className={`w-full text-left p-2 rounded-lg border transition-all group ${
                      selectedSheet === sheet.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/20 bg-muted/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-xs truncate">{sheet.title}</p>
                      <Star className="h-3 w-3 fill-primary text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : Object.keys(sheets).length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {hasFilters
                  ? 'Nenhuma ficha corresponde aos filtros aplicados'
                  : 'Nenhuma ficha técnica cadastrada'}
              </p>
              {hasFilters ? (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Tente limpar os filtros ou buscar por outro termo
                </p>
              ) : canEdit ? (
                <Button variant="link" onClick={onCreateNew} className="mt-2">
                  Criar primeira ficha técnica
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(sheets).map(([techniqueId, techniqueSheets]) => {
                const technique = techniques.find(t => t.id === techniqueId);
                return (
                  <div key={techniqueId}>
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/80 backdrop-blur py-1 z-10">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: technique?.color || 'hsl(var(--muted-foreground))' }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {technique?.name || techniqueId}
                      </span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {techniqueSheets.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {techniqueSheets.map(sheet => (
                        <button
                          key={sheet.id}
                          onClick={() => onSheetClick(sheet.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all group ${
                            selectedSheet === sheet.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border/30 hover:border-border hover:bg-muted/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{sheet.title}</p>
                                <KnowledgeStatusBadge status={sheet.status} className="text-[9px] px-1 h-4" />
                                <button
                                  onClick={(e) => toggleFavorite(e, sheet.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <Star
                                    className={`h-3.5 w-3.5 ${
                                      favorites.includes(sheet.id)
                                        ? 'fill-primary text-primary opacity-100'
                                        : 'text-muted-foreground'
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {sheet.product_categories?.name && (
                                  <span>{sheet.product_categories.name}</span>
                                )}
                                {sheet.materials?.name && (
                                  <>
                                    <span>•</span>
                                    <span>{sheet.materials.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          {sheet.estimated_time_minutes && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{sheet.estimated_time_minutes} min</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
