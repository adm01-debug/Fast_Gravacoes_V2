import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles, Calendar, Star } from 'lucide-react';
import { CodeBlock } from '@/components/ui/code-block';

export function ChangelogSection() {
  const versions = [
    {
      version: '2.0.0',
      date: 'Dezembro 2024',
      isLatest: true,
      type: 'major' as const,
      highlights: [
        'Redesign completo do tema claro com tons de cinza suaves',
        'Refinamento do tema escuro com bordas e glows aprimorados',
        'Transições cinematográficas de tema com overlay e som',
        'Novas animações interativas importadas do TASK GIFTS'
      ],
      changes: [
        { type: 'new', category: 'Animations', description: 'bounce-in - Entrada com efeito elástico para cards' },
        { type: 'new', category: 'Animations', description: 'wiggle / wiggle-infinite - Balanço para chamar atenção' },
        { type: 'new', category: 'Animations', description: 'pulse-ring - Anel pulsante para indicadores de status' },
        { type: 'new', category: 'Animations', description: 'bounce-attention - Pulo suave para alertas críticos' },
        { type: 'new', category: 'Animations', description: 'pop - Entrada rápida com elasticidade para badges' },
        { type: 'new', category: 'Animations', description: 'press-scale - Feedback tátil em todos os botões' },
        { type: 'new', category: 'Cards', description: 'Variantes stat e premium adicionadas' },
        { type: 'new', category: 'Buttons', description: 'Variantes warning, subtle e tamanho icon-xs' },
        { type: 'new', category: 'Utilities', description: 'Classes hover-lift-sm, hover-scale, gradient-text-success' },
        { type: 'new', category: 'Typography', description: 'Font-family Outfit para headers (.text-display)' },
        { type: 'improved', category: 'Theme', description: 'Modo claro com tons mais quentes e contraste melhorado' },
        { type: 'improved', category: 'Theme', description: 'Modo escuro com refinamento de bordas e glows' },
        { type: 'improved', category: 'ThemeToggle', description: 'Animações cinematográficas com overlay radial' },
        { type: 'improved', category: 'ThemeToggle', description: 'Feedback sonoro integrado (Web Audio API)' },
        { type: 'improved', category: 'Overview', description: 'Cards interativos com ripple, confetti e explosões' },
        { type: 'improved', category: 'StatusBadge', description: 'Animação pop automática ao mudar status' },
        { type: 'improved', category: 'StatsCard', description: 'Animação bounce-in na entrada' },
        { type: 'improved', category: 'RealtimeIndicator', description: 'Pulse-ring quando conectado' },
        { type: 'improved', category: 'AlertsDashboard', description: 'Bounce-attention em alertas críticos' },
        { type: 'improved', category: 'Documentation', description: 'CodeBlocks copiáveis em todas as seções' },
        { type: 'fixed', category: 'Colors', description: 'Contraste de texto secundário no modo claro' },
        { type: 'fixed', category: 'Focus', description: 'Estados de foco mais elegantes e consistentes' },
      ]
    },
    {
      version: '1.5.0',
      date: 'Novembro 2024',
      type: 'minor' as const,
      highlights: [
        'Seção Novidades com animações staggered',
        'Badge v2.0 com shimmer e glow pulsante',
        'Documentação expandida de Error States'
      ],
      changes: [
        { type: 'new', category: 'Overview', description: 'Seção Novidades destacando atualizações recentes' },
        { type: 'new', category: 'Animations', description: 'Animações staggered para listas e grids' },
        { type: 'new', category: 'Badges', description: 'Efeito shimmer e glow pulsante' },
        { type: 'new', category: 'Error States', description: 'Páginas de erro HTTP (404, 500, 403, 503)' },
        { type: 'new', category: 'Error States', description: 'Estados inline e críticos documentados' },
        { type: 'improved', category: 'Overview', description: 'Navegação direta via cards de categoria' },
        { type: 'improved', category: 'Tables', description: 'Exemplos com seleção, paginação e ações' },
      ]
    },
    {
      version: '1.4.0',
      date: 'Outubro 2024',
      type: 'minor' as const,
      highlights: [
        'Componentes de Loading expandidos',
        'Empty States contextuais',
        'Seção de navegação completa'
      ],
      changes: [
        { type: 'new', category: 'Loading', description: 'Spinners, progress bars e estados de botão' },
        { type: 'new', category: 'Loading', description: 'Loading de página inteira com overlay' },
        { type: 'new', category: 'Empty States', description: 'Estados vazios contextuais (dados, busca, notificações)' },
        { type: 'new', category: 'Navigation', description: 'Breadcrumbs, Tabs e menus documentados' },
        { type: 'improved', category: 'Feedback', description: 'Alerts, Toast e Skeleton refinados' },
      ]
    },
    {
      version: '1.3.0',
      date: 'Setembro 2024',
      type: 'minor' as const,
      highlights: [
        'Sistema de animações completo',
        'Efeitos hover e glow padronizados',
        'Suporte a prefers-reduced-motion'
      ],
      changes: [
        { type: 'new', category: 'Animations', description: 'Keyframes para fade, scale, slide e accordion' },
        { type: 'new', category: 'Animations', description: 'Classes de stagger (stagger-1 a stagger-6)' },
        { type: 'new', category: 'Hover Effects', description: 'hover-lift, hover-scale, hover-glow' },
        { type: 'new', category: 'Glow Effects', description: 'glow-primary, glow-success, card-glow' },
        { type: 'improved', category: 'Accessibility', description: 'Respeito a prefers-reduced-motion' },
      ]
    },
    {
      version: '1.2.0',
      date: 'Agosto 2024',
      type: 'minor' as const,
      highlights: [
        'Cards com 6 variantes distintas',
        'Sistema de tipografia hierárquico',
        'Formulários completos documentados'
      ],
      changes: [
        { type: 'new', category: 'Cards', description: 'Variantes default, elevated, interactive, glass, ghost, outline' },
        { type: 'new', category: 'Typography', description: 'Hierarquia h1-h4 com Plus Jakarta Sans' },
        { type: 'new', category: 'Forms', description: 'Inputs, selects, checkboxes, radios, switches, sliders' },
        { type: 'new', category: 'Modals', description: 'Dialog, AlertDialog e Sheet documentados' },
        { type: 'improved', category: 'Buttons', description: 'Variantes gradient, glow e glass' },
      ]
    },
    {
      version: '1.1.0',
      date: 'Julho 2024',
      type: 'minor' as const,
      highlights: [
        'Tema escuro elegante implementado',
        'Sistema de cores com tokens semânticos',
        'Badges para gamificação'
      ],
      changes: [
        { type: 'new', category: 'Theme', description: 'Tema escuro com gradientes e glassmorphism' },
        { type: 'new', category: 'Colors', description: 'Tokens semânticos (primary, secondary, accent, etc.)' },
        { type: 'new', category: 'Badges', description: 'Variantes XP, coins, streak, gold, silver, bronze' },
        { type: 'new', category: 'Progress', description: 'Barras de progresso com gradientes' },
      ]
    },
    {
      version: '1.0.0',
      date: 'Junho 2024',
      type: 'major' as const,
      highlights: [
        'Lançamento inicial do Design System',
        'Componentes base do shadcn/ui',
        'Estrutura de documentação estabelecida'
      ],
      changes: [
        { type: 'new', category: 'Core', description: 'Setup inicial com Tailwind CSS e shadcn/ui' },
        { type: 'new', category: 'Buttons', description: 'Variantes default, outline, destructive, ghost' },
        { type: 'new', category: 'Inputs', description: 'Campos de texto, password e textarea' },
        { type: 'new', category: 'Cards', description: 'Card básico com header, content e footer' },
        { type: 'new', category: 'Tables', description: 'Componentes de tabela responsivos' },
      ]
    },
  ];

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'new': return 'bg-success/10 text-success border-success/20';
      case 'improved': return 'bg-info/10 text-info border-info/20';
      case 'fixed': return 'bg-warning/10 text-warning border-warning/20';
      case 'removed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'new': return 'Novo';
      case 'improved': return 'Melhorado';
      case 'fixed': return 'Corrigido';
      case 'removed': return 'Removido';
      default: return type;
    }
  };

  const getVersionBadgeStyle = (type: 'major' | 'minor' | 'patch') => {
    switch (type) {
      case 'major': return 'bg-gradient-to-r from-primary to-accent text-primary-foreground';
      case 'minor': return 'bg-secondary text-secondary-foreground';
      case 'patch': return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-scale-in">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <CardTitle className="text-display text-2xl">Histórico de Versões</CardTitle>
                <CardDescription>
                  Acompanhe a evolução do Design System
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <Badge className="bg-gradient-to-r from-primary to-accent text-white">
                {versions.length} versões
              </Badge>
              <Badge variant="outline">
                Última: v{versions[0].version}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-muted hidden md:block" />

        <div className="space-y-6">
          {versions.map((version, versionIndex) => (
            <Card
              key={version.version}
              variant={version.isLatest ? 'premium' : 'elevated'}
              className={`relative ml-0 md:ml-14 animate-fade-in ${version.isLatest ? 'ring-2 ring-primary/50' : ''}`}
              style={{ animationDelay: `${versionIndex * 100}ms` }}
            >
              {/* Timeline dot */}
              <div className={`absolute -left-[3.25rem] top-6 hidden md:flex h-4 w-4 rounded-full border-2 ${
                version.isLatest
                  ? 'bg-primary border-primary animate-pulse'
                  : 'bg-background border-muted-foreground/30'
              }`} />

              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={`text-sm font-bold ${getVersionBadgeStyle(version.type)}`}
                    style={{ animationDelay: `${versionIndex * 100 + 50}ms` }}
                  >
                    v{version.version}
                  </Badge>
                  {version.isLatest && (
                    <Badge variant="success" className="animate-pulse">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Atual
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {version.date}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {version.type === 'major' ? 'Major' : version.type === 'minor' ? 'Minor' : 'Patch'}
                  </Badge>
                </div>

                {/* Highlights */}
                <div className="mt-4 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destaques</span>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {version.highlights.map((highlight, hIndex) => (
                      <li
                        key={hIndex}
                        className="flex items-start gap-2 text-sm animate-fade-in"
                        style={{ animationDelay: `${versionIndex * 100 + hIndex * 50 + 100}ms` }}
                      >
                        <Star className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alterações</span>
                  <div className="grid gap-2">
                    {version.changes.map((change, cIndex) => (
                      <div
                        key={cIndex}
                        className="flex items-start gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors animate-fade-in"
                        style={{ animationDelay: `${versionIndex * 100 + cIndex * 30 + 200}ms` }}
                      >
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${getTypeStyles(change.type)}`}
                        >
                          {getTypeLabel(change.type)}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-primary">{change.category}</span>
                          <p className="text-sm text-muted-foreground">{change.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card variant="ghost" className="border border-dashed animate-fade-in" style={{ animationDelay: '800ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getTypeStyles('new')}>Novo</Badge>
              <span className="text-xs text-muted-foreground">Funcionalidade adicionada</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getTypeStyles('improved')}>Melhorado</Badge>
              <span className="text-xs text-muted-foreground">Aprimoramento existente</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getTypeStyles('fixed')}>Corrigido</Badge>
              <span className="text-xs text-muted-foreground">Bug resolvido</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-primary to-accent text-white text-xs">Major</Badge>
              <span className="text-xs text-muted-foreground">Mudanças significativas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Minor</Badge>
              <span className="text-xs text-muted-foreground">Novas funcionalidades</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Referência de Versionamento</CardTitle>
          <CardDescription>Seguimos o padrão Semantic Versioning (SemVer)</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            label="Formato de Versão"
            code={`MAJOR.MINOR.PATCH

MAJOR - Mudanças incompatíveis com versões anteriores
MINOR - Novas funcionalidades compatíveis
PATCH - Correções de bugs compatíveis

Exemplos:
v1.0.0 → v2.0.0  // Breaking changes (redesign completo)
v1.0.0 → v1.1.0  // Nova funcionalidade (novo componente)
v1.0.0 → v1.0.1  // Bug fix (correção de cor)`}
            showLineNumbers
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Back to Overview Button Component
