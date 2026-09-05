import { Card, CardContent, CardDescription, CardHeader, CardTitle, type CardProps } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { Coins, Layers, TrendingUp } from 'lucide-react';

type CardVariant = NonNullable<CardProps['variant']>;

export function CardVariants() {
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />Variantes de Card</CardTitle>
        <CardDescription>O componente Card agora suporta variantes via prop: <code className="text-primary">variant="..."</code></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            { v: 'default', title: 'Default', desc: 'Variante padrão com sombra sutil' },
            { v: 'elevated', title: 'Elevated', desc: 'Maior elevação e profundidade' },
            { v: 'interactive', title: 'Interactive', desc: 'Hover com lift e glow (clicável)' },
            { v: 'glass', title: 'Glass', desc: 'Glassmorphism com blur' },
            { v: 'ghost', title: 'Ghost', desc: 'Transparente, aparece no hover' },
            { v: 'outline', title: 'Outline', desc: 'Apenas borda, sem preenchimento' },
          ] as Array<{ v: CardVariant; title: string; desc: string }>).map(c => (
            <Card key={c.v} variant={c.v}>
              <CardHeader><CardTitle className="text-lg">{c.title}</CardTitle><CardDescription>{c.desc}</CardDescription></CardHeader>
              <CardContent><code className="text-xs text-primary">variant="{c.v}"</code></CardContent>
            </Card>
          ))}
          <Card variant="stat">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" />Stat</CardTitle><CardDescription>Para dashboards e KPIs</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">1,234</div><code className="text-xs text-primary mt-2 block">variant="stat"</code></CardContent>
          </Card>
          <Card variant="premium">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Coins className="h-4 w-4 text-warning" />Premium</CardTitle><CardDescription>Destaque especial com acento dourado</CardDescription></CardHeader>
            <CardContent><code className="text-xs text-primary">variant="premium"</code></CardContent>
          </Card>
        </div>
        <div className="space-y-3 pt-4 border-t border-border">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exemplos de Código</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <CodeBlock code={'<Card variant="default">...</Card>'} label="Default" />
            <CodeBlock code={'<Card variant="elevated">...</Card>'} label="Elevated" />
            <CodeBlock code={'<Card variant="interactive">...</Card>'} label="Interactive" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
