import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Coins, Plus, Play, Sparkles, Square, Star, TrendingUp, Wand2, Zap } from 'lucide-react';

export function OverviewWhatsNew() {
  return (
    <Card variant="glass" className="border-primary/20 relative overflow-hidden animate-fade-in">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-success/10 to-transparent rounded-tr-full" />
      <CardHeader className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Novidades
            <Badge variant="default" className="ml-2 text-xs animate-scale-in relative overflow-hidden group/badge" style={{ animationDelay: '300ms' }}>
              <span className="absolute inset-0 -translate-x-full group-hover/badge:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="absolute inset-0 rounded-md animate-[glow-pulse_2s_ease-in-out_infinite] opacity-60" style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.6)' }} />
              <span className="relative z-10">v2.0</span>
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>Dezembro 2024</span>
        </div>
        <CardDescription className="animate-fade-in" style={{ animationDelay: '200ms' }}>Últimas adições e melhorias no Design System</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-success" />Novas Variantes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-card/50 border border-border/50 space-y-2 animate-fade-in hover-lift-sm transition-all" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2"><Square className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Cards</span></div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs"><code>stat</code> - KPIs e dashboards</Badge>
                <Badge variant="outline" className="text-xs"><code>premium</code> - Destaque dourado</Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-border/50 space-y-2 animate-fade-in hover-lift-sm transition-all" style={{ animationDelay: '450ms' }}>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /><span className="text-sm font-medium">Botões</span></div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs"><code>warning</code> - Alertas</Badge>
                <Badge variant="outline" className="text-xs"><code>subtle</code> - Discreto</Badge>
                <Badge variant="outline" className="text-xs"><code>icon-xs</code> - Ícone mini</Badge>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 space-y-2 animate-fade-in hover-lift-sm transition-all" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary animate-bounce-attention" />
              <span className="text-sm font-medium">Novas Animações</span>
              <Badge className="text-xs bg-primary/20 text-primary border-primary/30 wiggle-infinite">TASK GIFTS</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {['bounce-in', 'wiggle', 'pulse-ring', 'bounce-attention', 'pop', 'press-scale'].map((a, i) => (
                <Badge key={a} variant="outline" className="text-xs animate-scale-in" style={{ animationDelay: `${600 + i * 50}ms` }}><code>{a}</code></Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-info" />Melhorias de Design
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {['Light mode com tons mais quentes', 'Dark mode refinado com glows', 'Transições de tema cinematográficas', 'Typography com Outfit para headers', 'Focus states elegantes com glow', 'Melhor contraste de texto secundário'].map((item, index) => (
              <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: `${600 + index * 80}ms` }}>
                <Check className="h-3 w-3 text-success shrink-0" /><span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '800ms' }}>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" />Novas Utilities
          </h4>
          <div className="flex flex-wrap gap-2">
            {['.animate-bounce-in', '.wiggle-infinite', '.pulse-ring', '.animate-bounce-attention', '.animate-pop', '.press-scale', '.hover-lift-sm', '.hover-scale', '.gradient-text-success'].map((utility, index) => (
              <code key={utility} className="text-xs bg-muted px-2 py-1 rounded animate-scale-in hover:bg-primary/20 transition-colors cursor-default" style={{ animationDelay: `${900 + index * 60}ms` }}>{utility}</code>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border/50 animate-fade-in" style={{ animationDelay: '1100ms' }}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <Card variant="stat" className="p-2 inline-flex items-center gap-2 animate-bounce-in hover-lift-sm" style={{ animationDelay: '1200ms' }}>
              <TrendingUp className="h-3 w-3 text-success" /><span className="text-xs font-medium">Stat Card</span>
            </Card>
            <Card variant="premium" className="p-2 inline-flex items-center gap-2 animate-bounce-in hover-lift-sm" style={{ animationDelay: '1250ms' }}>
              <Coins className="h-3 w-3 text-warning" /><span className="text-xs font-medium">Premium</span>
            </Card>
            <div className="flex items-center gap-1.5 animate-fade-in" style={{ animationDelay: '1300ms' }}>
              <span className="h-2 w-2 rounded-full bg-success pulse-ring" /><span className="text-xs text-success">Online</span>
            </div>
            <Badge className="animate-pop wiggle-infinite bg-warning/20 text-warning border-warning/30" style={{ animationDelay: '1350ms' }}>Urgente</Badge>
            <Button variant="warning" size="sm" className="animate-scale-in" style={{ animationDelay: '1400ms' }}>Warning</Button>
            <Button size="icon-xs" variant="outline" className="animate-scale-in" style={{ animationDelay: '1450ms' }}><Star className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
