/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { MainLayout } from '@/components/layout/MainLayout';
import { HooksExamplesSection } from '@/components/design-system/HooksExamplesSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Activity, X, Pause } from 'lucide-react';

// Section components
import { OverviewSection } from '@/components/design-system/sections/OverviewSection';
import { BackToOverviewButton } from '@/components/design-system/sections/BackToOverviewButton';
import { ButtonsSection } from '@/components/design-system/sections/ButtonsSection';
import { FormsSection } from '@/components/design-system/sections/FormsSection';
import { ModalsSection } from '@/components/design-system/sections/ModalsSection';
import { TooltipsSection } from '@/components/design-system/sections/TooltipsSection';
import { TablesSection } from '@/components/design-system/sections/TablesSection';
import { NavigationSection } from '@/components/design-system/sections/NavigationSection';
import { CardsSection } from '@/components/design-system/sections/CardsSection';
import { BadgesSection } from '@/components/design-system/sections/BadgesSection';
import { ProgressSection } from '@/components/design-system/sections/ProgressSection';
import { IconsSection } from '@/components/design-system/sections/IconsSection';
import { ColorsSection } from '@/components/design-system/sections/ColorsSection';
import { TypographySection } from '@/components/design-system/sections/TypographySection';
import { SpacingSection } from '@/components/design-system/sections/SpacingSection';
import { ShadowsSection } from '@/components/design-system/sections/ShadowsSection';
import { AnimationsSection } from '@/components/design-system/sections/AnimationsSection';
import { FeedbackSection } from '@/components/design-system/sections/FeedbackSection';
import { LoadingSection } from '@/components/design-system/sections/LoadingSection';
import { EmptyStatesSection } from '@/components/design-system/sections/EmptyStatesSection';
import { ErrorStatesSection } from '@/components/design-system/sections/ErrorStatesSection';
import { ThemeToggleSection } from '@/components/design-system/sections/ThemeToggleSection';
import { ChangelogSection } from '@/components/design-system/sections/ChangelogSection';

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('simulate-reduced-motion');
    } else {
      document.documentElement.classList.remove('simulate-reduced-motion');
    }
    return () => {
      document.documentElement.classList.remove('simulate-reduced-motion');
    };
  }, [reducedMotion]);

  const isReducedMotionActive = reducedMotion || systemPrefersReducedMotion;

  return (
    <MainLayout>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        <Breadcrumbs />

        {/* Floating Reduced Motion Indicator */}
        {isReducedMotionActive && (
          <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-warning/90 text-warning-foreground shadow-lg border border-warning/50 backdrop-blur-sm">
            <Pause className="h-4 w-4" />
            <span className="text-xs font-medium">
              {systemPrefersReducedMotion && !reducedMotion
                ? 'Reduced Motion (Sistema)'
                : 'Reduced Motion (Simulado)'}
            </span>
            {reducedMotion && (
              <button
                onClick={() => setReducedMotion(false)}
                className="ml-1 p-0.5 rounded-full hover:bg-warning-foreground/20 transition-colors"
                title="Desativar simulação"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl text-title font-black tracking-tighter gradient-text">Design System</h1>
            <p className="text-muted-foreground">
              Biblioteca completa de componentes, variantes e animações do sistema.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${isReducedMotionActive ? 'text-muted-foreground' : 'text-primary animate-pulse'}`} />
              <Label htmlFor="reduced-motion-toggle" className="text-sm font-medium cursor-pointer">
                Simular Reduced Motion
              </Label>
            </div>
            <Switch
              id="reduced-motion-toggle"
              checked={reducedMotion}
              onCheckedChange={setReducedMotion}
              disabled={systemPrefersReducedMotion}
            />
            {systemPrefersReducedMotion && (
              <Badge variant="outline" className="text-xs border-warning text-warning">
                Sistema
              </Badge>
            )}
            {reducedMotion && !systemPrefersReducedMotion && (
              <Badge variant="secondary" className="text-xs">
                Ativo
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 h-auto p-1">
            {[
              { value: 'overview', label: 'Overview' },
              { value: 'buttons', label: 'Botões' },
              { value: 'forms', label: 'Forms' },
              { value: 'modals', label: 'Modais' },
              { value: 'tooltips', label: 'Tooltips' },
              { value: 'tables', label: 'Tabelas' },
              { value: 'navigation', label: 'Navegação' },
              { value: 'cards', label: 'Cards' },
              { value: 'badges', label: 'Badges' },
              { value: 'progress', label: 'Progress' },
              { value: 'icons', label: 'Ícones' },
              { value: 'typography', label: 'Tipografia' },
              { value: 'spacing', label: 'Spacing' },
              { value: 'shadows', label: 'Sombras' },
              { value: 'animations', label: 'Animações' },
              { value: 'colors', label: 'Cores' },
              { value: 'feedback', label: 'Feedback' },
              { value: 'loading', label: 'Loading' },
              { value: 'empty', label: 'Empty States' },
              { value: 'errors', label: 'Error States' },
              { value: 'theme', label: 'Theme Toggle' },
              { value: 'changelog', label: 'Changelog' },
              { value: 'hooks', label: 'Hooks' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewSection onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="buttons" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ButtonsSection />
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <FormsSection />
          </TabsContent>

          <TabsContent value="modals" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ModalsSection />
          </TabsContent>

          <TabsContent value="tooltips" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <TooltipsSection />
          </TabsContent>

          <TabsContent value="tables" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <TablesSection />
          </TabsContent>

          <TabsContent value="navigation" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <NavigationSection />
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <CardsSection />
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <BadgesSection />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ProgressSection />
          </TabsContent>

          <TabsContent value="icons" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <IconsSection />
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ColorsSection />
          </TabsContent>

          <TabsContent value="typography" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <TypographySection />
          </TabsContent>

          <TabsContent value="spacing" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <SpacingSection />
          </TabsContent>

          <TabsContent value="shadows" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ShadowsSection />
          </TabsContent>

          <TabsContent value="animations" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <AnimationsSection />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <FeedbackSection />
          </TabsContent>

          <TabsContent value="loading" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <LoadingSection />
          </TabsContent>

          <TabsContent value="empty" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <EmptyStatesSection />
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ErrorStatesSection />
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ThemeToggleSection />
          </TabsContent>

          <TabsContent value="changelog" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <ChangelogSection />
          </TabsContent>

          <TabsContent value="hooks" className="space-y-6">
            <BackToOverviewButton onNavigate={setActiveTab} />
            <HooksExamplesSection />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
