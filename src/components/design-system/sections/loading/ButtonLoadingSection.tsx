import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, type ButtonProps } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { Loader2, Play, Save, Zap } from 'lucide-react';

type ButtonVariant = NonNullable<ButtonProps['variant']>;

export function ButtonLoadingSection() {
  const [isLoading, setIsLoading] = useState(false);
  const simulateLoading = () => { setIsLoading(true); setTimeout(() => setIsLoading(false), 2000); };

  return (
    <Card className="card-interactive card-shine">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Estados de Loading em Botões</CardTitle>
        <CardDescription>Botões com indicadores de carregamento integrados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variantes com Loading</h4>
          <div className="flex flex-wrap gap-3">
            {([{ v: 'default', l: 'Carregando...' }, { v: 'secondary', l: 'Processando' }, { v: 'outline', l: 'Aguarde' }, { v: 'gradient', l: 'Salvando' }, { v: 'destructive', l: 'Excluindo' }] as Array<{ v: ButtonVariant; l: string }>).map(b => (
              <Button key={b.v} variant={b.v} disabled className={b.v === 'gradient' ? 'opacity-80' : ''}>
                <Loader2 className="h-4 w-4 animate-spin" />{b.l}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Demo Interativa</h4>
          <div className="flex flex-wrap gap-3">
            <Button variant="gradient" onClick={simulateLoading} disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Processando...</> : <><Play className="h-4 w-4" />Clique para simular (2s)</>}
            </Button>
            <Button variant="gradient-success" onClick={simulateLoading} disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : <><Save className="h-4 w-4" />Salvar</>}
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Apenas Ícone</h4>
          <div className="flex flex-wrap gap-3">
            {(['default', 'secondary', 'outline', 'ghost'] as ButtonVariant[]).map(v => (
              <Button key={v} size="icon" variant={v} disabled><Loader2 className="h-4 w-4 animate-spin" /></Button>
            ))}
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t">
          <CodeBlock label="Button Loading" code={`<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin" />
  Carregando...
</Button>`} />
        </div>
      </CardContent>
    </Card>
  );
}
