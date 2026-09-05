import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Maximize2 } from 'lucide-react';
import { clickableProps } from '@/lib/a11y';
import { sanitizeUrl } from '@/lib/sanitize';

interface VisualReferenceProps {
  goldStandardUrl?: string;
  failureStandardUrl?: string;
}

export function VisualReference({ goldStandardUrl, failureStandardUrl }: VisualReferenceProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            Padrão de Ouro
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div
            {...clickableProps(() => goldStandardUrl && window.open(sanitizeUrl(goldStandardUrl), '_blank'), { label: 'Abrir padrão de ouro', disabled: !goldStandardUrl })}
            className="aspect-video bg-muted rounded flex flex-col items-center justify-center border-2 border-dashed border-success/20 group cursor-pointer hover:bg-success/5 transition-colors overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
          >
            {goldStandardUrl ? (
              <img src={goldStandardUrl} alt="Padrão Ouro" className="w-full h-full object-cover" />
            ) : (
              <>
                <Maximize2 className="h-6 w-6 text-success/40 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-success/60 mt-2 font-medium uppercase">Sem referência visual</span>
              </>
            )}
          </div>
          <p className="text-[10px] mt-2 text-muted-foreground italic text-center">Referência visual homologada para este processo</p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-4 w-4" />
            Padrão de Falha
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div
            {...clickableProps(() => failureStandardUrl && window.open(sanitizeUrl(failureStandardUrl), '_blank'), { label: 'Abrir padrão de falha', disabled: !failureStandardUrl })}
            className="aspect-video bg-muted rounded flex flex-col items-center justify-center border-2 border-dashed border-rose-500/20 group cursor-pointer hover:bg-rose-500/5 transition-colors overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {failureStandardUrl ? (
              <img src={failureStandardUrl} alt="Padrão Falha" className="w-full h-full object-cover" />
            ) : (
              <>
                <AlertTriangle className="h-6 w-6 text-rose-500/40 group-hover:shake transition-transform" />
                <span className="text-[10px] text-rose-600/60 mt-2 font-medium uppercase">Sem exemplos de rejeição</span>
              </>
            )}
          </div>
          <p className="text-[10px] mt-2 text-muted-foreground italic text-center">Erros comuns que levam ao descarte</p>
        </CardContent>
      </Card>
    </div>
  );
}
