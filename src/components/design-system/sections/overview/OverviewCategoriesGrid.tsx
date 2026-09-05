import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Edit, LayoutGrid, MessageSquare, Play, Sparkles, Square, TableIcon, Tag, Activity, Type, Ruler, Palette, Bell, Loader2, Package, AlertCircle, Sun, Navigation as NavigationIcon, Layers, Zap } from 'lucide-react';
import { clickableProps } from '@/lib/a11y';

interface OverviewCategoriesGridProps {
  onNavigate: (tabId: string) => void;
}

const categories = [
  { id: 'buttons', icon: Zap, title: 'Botões', description: '12 variantes de botões incluindo gradient, glow e premium', count: 12 },
  { id: 'forms', icon: Edit, title: 'Formulários', description: 'Inputs, selects, checkboxes, radio buttons e mais', count: 8 },
  { id: 'modals', icon: Layers, title: 'Modais', description: 'Dialog, AlertDialog, Sheet e Drawer', count: 4 },
  { id: 'tooltips', icon: MessageSquare, title: 'Tooltips', description: 'Tooltips, Popovers e HoverCards', count: 3 },
  { id: 'tables', icon: TableIcon, title: 'Tabelas', description: 'Tabelas com zebra, badges, ações e paginação', count: 5 },
  { id: 'navigation', icon: NavigationIcon, title: 'Navegação', description: 'Breadcrumbs, Tabs, Navigation Menu', count: 4 },
  { id: 'cards', icon: Square, title: 'Cards', description: '8 variantes incluindo stat, premium e glass', count: 8 },
  { id: 'badges', icon: Tag, title: 'Badges', description: 'Status badges com variantes coloridas', count: 6 },
  { id: 'progress', icon: Activity, title: 'Progress', description: 'Barras de progresso com variantes', count: 4 },
  { id: 'icons', icon: Sparkles, title: 'Ícones', description: 'Biblioteca completa de ícones Lucide', count: 150 },
  { id: 'typography', icon: Type, title: 'Tipografia', description: 'Hierarquia tipográfica e fontes', count: 6 },
  { id: 'spacing', icon: Ruler, title: 'Spacing', description: 'Escala de espaçamentos e gaps', count: 12 },
  { id: 'shadows', icon: Layers, title: 'Sombras', description: 'Sombras e elevações para cards', count: 5 },
  { id: 'animations', icon: Play, title: 'Animações', description: 'Entry, hover, stagger, glow e interativas', count: 26 },
  { id: 'colors', icon: Palette, title: 'Cores', description: 'Paleta de cores semânticas do sistema', count: 16 },
  { id: 'feedback', icon: Bell, title: 'Feedback', description: 'Alerts, Toasts e Skeletons', count: 6 },
  { id: 'loading', icon: Loader2, title: 'Loading', description: 'Spinners, progress e estados de loading', count: 5 },
  { id: 'empty', icon: Package, title: 'Empty States', description: 'Estados vazios com CTAs e ilustrações', count: 8 },
  { id: 'errors', icon: AlertCircle, title: 'Error States', description: 'Páginas de erro HTTP e inline', count: 10 },
  { id: 'theme', icon: Sun, title: 'Theme Toggle', description: 'Alternador de tema com animações', count: 2 },
];

export function OverviewCategoriesGrid({ onNavigate }: OverviewCategoriesGridProps) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          Categorias do Design System
        </CardTitle>
        <CardDescription>Clique em qualquer card abaixo para navegar diretamente para a categoria</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                {...clickableProps(() => onNavigate(category.id), { label: `Navegar para ${category.title}` })}
                className="group relative p-4 rounded-xl bg-card/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer hover-lift-sm animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary before:absolute before:inset-0 before:rounded-xl before:p-[1px] before:bg-border before:transition-all before:duration-300 hover:before:bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)),hsl(var(--primary)))] hover:before:bg-[length:200%_200%] hover:before:animate-[gradient-shift_2s_ease_infinite] before:-z-10 after:absolute after:inset-[1px] after:rounded-[11px] after:bg-card/50 group-hover:after:bg-primary/5 after:transition-all after:duration-300 after:-z-10"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all duration-300">
                    <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-125 group-hover:animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-sm truncate">{category.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-xs">{category.count}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
