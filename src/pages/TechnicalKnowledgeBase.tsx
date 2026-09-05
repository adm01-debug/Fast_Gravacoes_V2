/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Lightbulb } from 'lucide-react';
import { useTechnicalSheets, useTechnicalSheetMutations, TechnicalSheet } from '@/hooks/useTechnicalSheets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTechniques } from '@/features/jobs';
import { TechnicalSheetViewer } from '@/components/knowledge/TechnicalSheetViewer';
import { TechnicalSheetEditor } from '@/components/knowledge/TechnicalSheetEditor';
import { KnowledgeBaseStats } from '@/components/knowledge/KnowledgeBaseStats';
import { KnowledgeSheetList } from '@/components/knowledge/KnowledgeSheetList';
import { useAuth } from '@/features/auth';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { toast } from 'sonner';

const TechnicalKnowledgeBase = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [selectedSheet, setSelectedSheet] = useState<string | null>(() => searchParams.get('sheet'));
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { role } = useAuth();
  const { createSheet } = useTechnicalSheetMutations();

  const { sheets, isLoadingSheets, categories, materials } = useTechnicalSheets();

  const { data: techniques = [] } = useTechniques();

  const { data: machines = [] } = useQuery({
    queryKey: ['machines-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('machines').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Deep linking: validate URL sheet id once sheets load; clear if not found
  useEffect(() => {
    const sheetParam = searchParams.get('sheet');
    if (!sheetParam || sheets.length === 0) return;
    const exists = sheets.some(s => s.id === sheetParam);
    if (!exists && selectedSheet === sheetParam) {
      setSelectedSheet(null);
    }
  }, [searchParams, sheets, selectedSheet]);

  // Sync selection back to URL
  useEffect(() => {
    setSearchParams(selectedSheet ? { sheet: selectedSheet } : {}, { replace: true });
  }, [selectedSheet, setSearchParams]);


  // Expanded fuzzy search: title, description, material, machine
  const fuseSearchedSheets = useFuseSearch(sheets, searchTerm, {
    keys: ['title', 'description', 'materials.name', 'machines.name', 'machines.code', 'product_categories.name'],
    threshold: 0.3,
  });

  const groupedSheets = useMemo(() => {
    const filtered = fuseSearchedSheets.filter(sheet => {
      const matchesTechnique = selectedTechnique === 'all' || sheet.technique_id === selectedTechnique;
      const matchesCategory = selectedCategory === 'all' || sheet.product_category_id === selectedCategory;
      const matchesMachine = selectedMachine === 'all' || sheet.recommended_machine_id === selectedMachine;
      return matchesTechnique && matchesCategory && matchesMachine;
    });

    const grouped: Record<string, TechnicalSheet[]> = {};
    filtered.forEach(sheet => {
      const tid = sheet.technique_id;
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(sheet);
    });
    return grouped;
  }, [fuseSearchedSheets, selectedTechnique, selectedCategory, selectedMachine]);

  const canEdit = role === 'coordinator';
  const hasFilters = searchTerm !== '' || selectedTechnique !== 'all' || selectedCategory !== 'all' || selectedMachine !== 'all';

  const handleSheetClick = (sheetId: string) => {
    setSelectedSheet(sheetId);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedSheet(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCloseEditor = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleDuplicate = async () => {
    if (!selectedSheet) return;
    const original = sheets.find(s => s.id === selectedSheet);
    if (!original) return;
    try {
      await createSheet.mutateAsync({
        technique_id: original.technique_id,
        title: `${original.title} (Cópia)`,
        description: original.description || undefined,
        product_category_id: original.product_category_id || undefined,
        material_id: original.material_id || undefined,
        estimated_time_minutes: original.estimated_time_minutes || undefined,
        recommended_machine_id: original.recommended_machine_id || undefined,
      });
      toast.success('Ficha duplicada com sucesso!');
    } catch {
      toast.error('Erro ao duplicar ficha');
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6">
        <Breadcrumbs />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl text-title font-black text-foreground flex items-center gap-2 sm:gap-3 tracking-tighter uppercase">
              <BookOpen className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              <span className="text-base sm:text-2xl">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-1 font-black uppercase tracking-widest opacity-70">
              QUALIDADE + VELOCIDADE
            </p>
          </div>
          {canEdit && (
            <Button onClick={handleCreateNew} className="gap-2 self-start sm:self-auto" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Ficha Técnica</span>
              <span className="sm:hidden">Nova Ficha</span>
            </Button>
          )}
        </div>

        {/* Stats */}
        <KnowledgeBaseStats sheets={sheets} techniques={techniques} />

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
          {/* Left Panel */}
          <div className={`${selectedSheet || isCreating || isEditing ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-shrink-0 flex-col`}>
            <KnowledgeSheetList
              sheets={groupedSheets}
              techniques={techniques}
              categories={categories}
              machines={machines}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedTechnique={selectedTechnique}
              onTechniqueChange={setSelectedTechnique}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedMachine={selectedMachine}
              onMachineChange={setSelectedMachine}
              selectedSheet={selectedSheet}
              onSheetClick={handleSheetClick}
              canEdit={canEdit}
              onCreateNew={handleCreateNew}
              isLoading={isLoadingSheets}
              hasFilters={hasFilters}
            />
          </div>

          {/* Right Panel */}
          <div className={`${!selectedSheet && !isCreating && !isEditing ? 'hidden lg:block' : 'block'} flex-1 min-w-0`}>
            {(selectedSheet || isCreating || isEditing) && (
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mb-3"
                onClick={() => {
                  setSelectedSheet(null);
                  setIsCreating(false);
                  setIsEditing(false);
                }}
              >
                ← Voltar para lista
              </Button>
            )}

            {isCreating ? (
              <TechnicalSheetEditor
                techniques={techniques}
                categories={categories}
                materials={materials}
                onClose={handleCloseEditor}
              />
            ) : isEditing && selectedSheet ? (
              <TechnicalSheetEditor
                sheetId={selectedSheet}
                techniques={techniques}
                categories={categories}
                materials={materials}
                onClose={handleCloseEditor}
              />
            ) : selectedSheet ? (
              <TechnicalSheetViewer
                sheetId={selectedSheet}
                onEdit={canEdit ? handleEdit : undefined}
                onDuplicate={canEdit ? handleDuplicate : undefined}
              />
            ) : (
              <Card className="glass-card border-border/50 h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <Lightbulb className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-muted-foreground">
                    Selecione uma ficha técnica
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Escolha uma ficha na lista para visualizar
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TechnicalKnowledgeBase;
