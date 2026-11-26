import { memo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Copy, KeyRound, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useErpApiKeys, type ErpApiKey } from '@/features/admin/hooks/useErpApiKeys';

const formatarData = (valor: string | null) =>
  valor ? format(new Date(valor), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';

/** O PostgREST devolve erro de RLS sem dizer o papel exigido; traduz para o usuario. */
const mensagemDeErro = (mensagem: string) =>
  /permission|row-level security|pol[ií]tica|policy/i.test(mensagem)
    ? 'Sua conta não tem permissão para gerenciar chaves (papel manager ou admin).'
    : mensagem;

/**
 * Emissao e revogacao das chaves da API ERP consumidas por sistemas externos
 * (`supabase/functions/erp-api`, header `x-api-key`). Antes desta tela a unica
 * chave existente foi gravada por script e nao havia como emitir outra.
 */
const ErpApiKeysPanelComponent = () => {
  const { keys, ativas, isLoading, error, create, revoke } = useErpApiKeys();
  const [nome, setNome] = useState('');
  const [chaveGerada, setChaveGerada] = useState<string | null>(null);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);

  const copiar = async (valor: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      toast.success('Chave copiada');
    } catch {
      toast.error('Não foi possível copiar — selecione o texto e copie manualmente');
    }
  };

  const gerar = async () => {
    const apelido = nome.trim();
    if (apelido.length === 0) {
      toast.error('Dê um nome para identificar quem vai usar a chave');
      return;
    }
    const chave = await create.mutateAsync(apelido).catch(() => null);
    if (chave) {
      setChaveGerada(chave);
      setNome('');
    }
  };

  const revogar = (key: ErpApiKey) => {
    revoke.mutate(key.id, { onSuccess: () => setRevogandoId(null) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5" />
          Chaves da API ERP
          {ativas > 0 && <Badge variant="secondary">{ativas} ativa(s)</Badge>}
        </CardTitle>
        <CardDescription>
          O ERP se autentica enviando a chave no cabeçalho <code>x-api-key</code>. O banco guarda
          apenas o hash: a chave completa aparece uma única vez, na criação. Revogar corta o acesso
          na hora; depois é só emitir outra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Label htmlFor="erp-api-key-nome" className="sr-only">
            Nome da chave
          </Label>
          <Input
            id="erp-api-key-nome"
            placeholder="Quem vai usar (ex.: Promo Design)"
            value={nome}
            maxLength={80}
            onChange={(event) => setNome(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void gerar();
            }}
          />
          <Button onClick={() => void gerar()} disabled={create.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {create.isPending ? 'Gerando...' : 'Nova chave'}
          </Button>
        </div>

        {chaveGerada && (
          <div role="status" className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-bold uppercase text-primary">
              Copie agora — esta chave não é exibida de novo
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background/60 px-2 py-1 font-mono text-xs">
                {chaveGerada}
              </code>
              <Button
                variant="outline"
                size="icon"
                aria-label="Copiar chave"
                onClick={() => void copiar(chaveGerada)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setChaveGerada(null)}>
              Concluir
            </Button>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Carregando chaves...</p>}

        {!isLoading && error && (
          <p className="text-sm text-destructive">
            Não foi possível carregar as chaves: {mensagemDeErro(error.message)}
          </p>
        )}

        {!isLoading && !error && keys.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma chave cadastrada. Crie a primeira para liberar o acesso do ERP.
          </p>
        )}

        {keys.length > 0 && (
          <ScrollArea className="h-[280px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      {key.is_active ? (
                        <Badge className="bg-success/15 text-success">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Revogada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatarData(key.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {key.last_used_at ? formatarData(key.last_used_at) : 'Nunca usada'}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.is_active && revogandoId !== key.id && (
                        <Button variant="ghost" size="sm" onClick={() => setRevogandoId(key.id)}>
                          Revogar
                        </Button>
                      )}
                      {revogandoId === key.id && (
                        <span className="inline-flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={revoke.isPending}
                            onClick={() => revogar(key)}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Confirmar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setRevogandoId(null)}>
                            <X className="mr-1 h-3 w-3" />
                            Cancelar
                          </Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export const ErpApiKeysPanel = memo(ErpApiKeysPanelComponent);