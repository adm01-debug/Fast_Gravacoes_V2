import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Palette, Package, Loader2 } from 'lucide-react';
import type { SequencingSuggestion } from '@/features/jobs';

interface SequencingTabProps {
  suggestions: SequencingSuggestion[];
  onApply?: (suggestion: SequencingSuggestion) => void;
  isApplying?: boolean;
}

export function SequencingTab({ suggestions, onApply, isApplying }: SequencingTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {suggestions.map((suggestion, index) => (
        <Card key={index} className="glass-card border-border/50 hover:border-primary/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                  <Palette className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{suggestion.machineName}</CardTitle>
                  <CardDescription>
                    {suggestion.techniqueName}
                    {suggestion.date
                      ? ` · ${new Date(`${suggestion.date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                      : ''}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                -{suggestion.estimatedSavings}min setup
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{suggestion.colorGroups.length} grupos de cor</span>
            </div>
            <div className="space-y-2">
              {suggestion.colorGroups.slice(0, 3).map((group, gIdx) => (
                <div key={gIdx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <span className="font-medium capitalize">{group.color}</span>
                  <span className="text-muted-foreground">{group.jobCount} jobs</span>
                </div>
              ))}
              {suggestion.colorGroups.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">+{suggestion.colorGroups.length - 3} grupos adicionais</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              disabled={isApplying}
              onClick={() => onApply?.(suggestion)}
            >
              {isApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
              Aplicar Sequenciamento
            </Button>
          </CardContent>
        </Card>
      ))}
      {suggestions.length === 0 && (
        <Card className="glass-card border-border/50 col-span-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mb-4" />
            <h3 className="font-semibold text-foreground">Sequenciamento Otimizado</h3>
            <p className="text-sm text-muted-foreground mt-1">Não há oportunidades de agrupamento no momento</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
