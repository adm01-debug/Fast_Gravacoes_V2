import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheckIcon, ShieldAlertIcon, RefreshCwIcon, Loader2Icon } from 'lucide-react';
import { useAuditChainVerification } from '@/features/admin/hooks/useAuditTrail';

export function AuditChainStatus() {
  const [enabled, setEnabled] = useState(false);
  const { data, isFetching, refetch } = useAuditChainVerification(enabled);

  const ok = data ? data.broken === 0 : null;

  return (
    <Card className="p-4 flex items-center justify-between gap-4 border-border bg-card">
      <div className="flex items-center gap-3">
        {ok === null ? (
          <ShieldCheckIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
        ) : ok ? (
          <ShieldCheckIcon className="h-6 w-6 text-primary" aria-hidden />
        ) : (
          <ShieldAlertIcon className="h-6 w-6 text-destructive" aria-hidden />
        )}
        <div>
          <p className="font-medium text-sm">Integridade da cadeia hash</p>
          {data ? (
            <p className="text-xs text-muted-foreground">
              {data.verified}/{data.total_records} verificados
              {data.broken > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {data.broken} quebrado(s)
                </Badge>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Clique em verificar para auditar a cadeia</p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setEnabled(true);
          refetch();
        }}
        disabled={isFetching}
      >
        {isFetching ? (
          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" aria-hidden />
        ) : (
          <RefreshCwIcon className="h-4 w-4 mr-2" aria-hidden />
        )}
        Verificar
      </Button>
    </Card>
  );
}
