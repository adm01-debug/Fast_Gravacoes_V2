import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CodeBlock } from '@/components/ui/code-block';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, DollarSign, Package, Activity, Users, Target, Gauge, Coins, Trophy, Sparkles } from 'lucide-react';

export function CardDashboardExample() {
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" />Exemplo de Dashboard</CardTitle>
        <CardDescription>Layout combinando Cards stat e premium para painéis de controle</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Vendas', value: 'R$ 45.231', change: '+12.5%', icon: DollarSign, color: 'primary' },
            { label: 'Pedidos', value: '1,234', change: '+8.2%', icon: Package, color: 'success' },
            { label: 'Clientes', value: '892', change: '+2.1%', icon: Users, color: 'info' },
            { label: 'Taxa Conversão', value: '3.24%', change: '-0.8%', icon: Target, color: 'warning', negative: true },
          ].map(s => (
            <Card key={s.label} variant="stat" className="hover-lift-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                    <p className={`text-xs ${s.negative ? 'text-destructive' : 'text-success'} flex items-center gap-1 mt-1`}>
                      <TrendingUp className={`h-3 w-3 ${s.negative ? 'rotate-180' : ''}`} />{s.change}
                    </p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg bg-${s.color}/10 flex items-center justify-center`}><s.icon className={`h-5 w-5 text-${s.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card variant="premium" className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-warning" />Plano Premium Ativo</CardTitle><CardDescription>Acesso completo a todas as funcionalidades</CardDescription></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]"><p className="text-sm text-muted-foreground mb-2">Uso do plano este mês</p><Progress value={68} className="h-2" /><p className="text-xs text-muted-foreground mt-1">68% de 10.000 créditos</p></div>
                <Button variant="gradient" shimmer size="sm"><Sparkles className="h-4 w-4" />Upgrade</Button>
              </div>
            </CardContent>
          </Card>
          <Card variant="stat">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" />Top Performer</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-warning/50"><AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">JD</AvatarFallback></Avatar>
                <div><p className="font-semibold text-foreground">João Silva</p><p className="text-xs text-muted-foreground">156 vendas este mês</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3 pt-4 border-t border-border">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estrutura do Layout</h5>
          <CodeBlock code={`<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card variant="stat" className="hover-lift-sm">
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">Label</p>
      <p className="text-2xl font-bold">Valor</p>
    </CardContent>
  </Card>
</div>`} label="Layout Dashboard" />
        </div>
      </CardContent>
    </Card>
  );
}
