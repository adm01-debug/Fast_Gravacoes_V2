import { Sparkles, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SmartSequencingPanel } from '@/components/planning/SmartSequencingPanel';
import { LoadBalancingPanel } from '@/components/planning/LoadBalancingPanel';
import type { SequencingSuggestion } from '@/features/jobs';
import type { LoadBalancingSuggestion } from '@/features/analytics';

export type PendingQueueAISelection =
  | { type: 'setup'; data: SequencingSuggestion }
  | { type: 'balancing'; data: LoadBalancingSuggestion };

interface SmartSuggestionsSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExplain: (selection: PendingQueueAISelection) => void;
}

export function SmartSuggestionsSection({ open, onOpenChange, onExplain }: SmartSuggestionsSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Otimização de Planejamento
        </h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            {open ? (
              <>Ocultar <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Ver Sugestões <ChevronDown className="h-4 w-4" /></>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="animate-accordion-down">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <SmartSequencingPanel
            onExplain={(suggestion) => {
              onExplain({ type: 'setup', data: suggestion });
            }}
          />
          <LoadBalancingPanel
            onExplain={(suggestion) => {
              onExplain({ type: 'balancing', data: suggestion });
            }}
          />
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Dicas de Planejamento
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Agrupe jobs pela mesma cor de gravura para reduzir o tempo de setup.</p>
              <p>• Priorize jobs urgentes, mas tente encaixá-los em grupos de cores existentes.</p>
              <p>• Utilize o balanceamento de carga para não sobrecarregar uma única máquina.</p>
              <p>• O sequenciamento inteligente agrupa por cor e prioridade automaticamente.</p>
            </CardContent>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
