import { memo } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cspDirective,
  cspDirectiveLabel,
  cspPage,
  cspResource,
  cspSource,
  formatCspTime,
  useCspViolationReports,
} from "@/features/admin/hooks/useCspViolationReports";

const VISIBLE_ROWS = 12;

/**
 * O endpoint público `csp-report` grava cada violação da política de segurança
 * e ninguém no app via esses dados: ficavam só no banco. Aqui o admin vê o que
 * o navegador tenta carregar e o que a política bloquearia, insumo para sair do
 * modo Report-Only sem quebrar a aplicação.
 */
const CspViolationsPanelComponent = () => {
  const { data, isLoading, error } = useCspViolationReports();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5" />
          Violações de CSP
          {data && data.total > 0 && <Badge variant="secondary">{data.total} relato(s)</Badge>}
        </CardTitle>
        <CardDescription>
          A política de segurança do app está em Report-Only: o navegador envia o que
          seria bloqueado em vez de bloquear. Cada linha é uma tentativa de carregar
          recurso fora da política, relatada pela própria página.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando relatos...</p>}

        {!isLoading && error && (
          <p className="text-sm text-destructive">
            Não foi possível ler os relatos: {error.message}. A leitura é restrita a
            coordenador, gestor e admin.
          </p>
        )}

        {!isLoading && !error && data && data.total === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma violação relatada no período. Sem relatos, a política pode ir para
            bloqueio efetivo sem risco conhecido.
          </p>
        )}

        {!isLoading && !error && data && data.total > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Relatos na janela</p>
                <p className="text-2xl font-semibold">{data.total}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Só relatado / já bloqueado</p>
                <p className="text-2xl font-semibold">
                  {data.reportedOnly}
                  <span className="text-base font-normal text-muted-foreground">
                    {" / "}
                    {data.enforced}
                  </span>
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Último relato</p>
                <p className="text-base font-semibold">{formatCspTime(data.lastReportAt)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Diretivas mais violadas
                </p>
                <ul className="space-y-1">
                  {data.directives.slice(0, 5).map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{item.label}</span>
                      <Badge variant="outline">{item.count}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recursos recusados
                </p>
                <ul className="space-y-1">
                  {data.resources.slice(0, 5).map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-mono text-xs">{item.label}</span>
                      <Badge variant="outline">{item.count}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ScrollArea className="h-[320px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Diretiva</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.slice(0, VISIBLE_ROWS).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatCspTime(row.created_at)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="block">{cspDirectiveLabel(cspDirective(row))}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {cspDirective(row)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs">
                        {cspResource(row)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs">{cspPage(row)}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-[10px] text-muted-foreground">
                        {cspSource(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const CspViolationsPanel = memo(CspViolationsPanelComponent);