import { Badge } from '@/components/ui/badge';
import { FlaskConical } from 'lucide-react';

/** Selo para painéis que ainda exibem dados simulados, não de produção. */
export function DemoDataBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-warning/40 bg-warning/10 text-warning text-[10px] font-bold uppercase"
    >
      <FlaskConical className="h-3 w-3" />
      Dados de demonstração
    </Badge>
  );
}
