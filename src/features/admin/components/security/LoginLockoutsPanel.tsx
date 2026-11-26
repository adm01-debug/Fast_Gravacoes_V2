import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoginLockouts } from '@/features/admin/hooks/useLoginLockouts';

const tipoLabel: Record<string, string> = {
  email: 'E-mail',
  ip: 'IP',
};

/**
 * Quem foi bloqueado por tentativas de login so saia do bloqueio ao expirar
 * (ate 24h). O painel mostra a fila e permite liberar a conta na hora.
 */
const LoginLockoutsPanelComponent = () => {
  const { lockouts, ativos, isLoading, error, release } = useLoginLockouts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5" />
          Contas bloqueadas por tentativas
          {ativos > 0 && <Badge variant="destructive">{ativos} ativa(s)</Badge>}
        </CardTitle>
        <CardDescription>
          Cinco tentativas falhas bloqueiam o login por 1 minuto, dobrando a cada
          reincidência até 24h. Liberar zera o contador e devolve o acesso na hora.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando bloqueios...</p>}

        {!isLoading && error && (
          <p className="text-sm text-destructive">
            Não foi possível carregar os bloqueios: {error.message}
          </p>
        )}

        {!isLoading && !error && lockouts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum bloqueio registrado.</p>
        )}

        {lockouts.length > 0 && (
          <ScrollArea className="h-[360px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Bloqueado até</TableHead>
                  <TableHead>Bloqueios</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockouts.map((lockout) => {
                  const ativo = lockout.is_active;
                  return (
                    <TableRow key={lockout.id}>
                      <TableCell className="font-mono text-xs">{lockout.identifier}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tipoLabel[lockout.identifier_type] ?? lockout.identifier_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{lockout.failed_attempts}</TableCell>
                      <TableCell>
                        {lockout.locked_until ? (
                          <span className="flex items-center gap-2 text-sm">
                            {format(new Date(lockout.locked_until), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            <Badge variant={ativo ? 'destructive' : 'secondary'}>
                              {ativo ? 'Ativo' : 'Expirado'}
                            </Badge>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem bloqueio</span>
                        )}
                      </TableCell>
                      <TableCell>{lockout.lockout_count}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={release.isPending}
                          onClick={() =>
                            release.mutate({
                              identifier: lockout.identifier,
                              identifier_type: lockout.identifier_type,
                            })
                          }
                        >
                          <Unlock className="mr-1 h-4 w-4" />
                          Liberar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export const LoginLockoutsPanel = memo(LoginLockoutsPanelComponent);
