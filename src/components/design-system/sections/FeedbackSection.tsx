import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Bell, Loader2 } from 'lucide-react';

export function FeedbackSection() {
  return (
    <div className="space-y-6">
      {/* Alert Variants */}
      <Card className="card-interactive card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Alert
          </CardTitle>
          <CardDescription>Componentes de alerta para mensagens importantes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default Alert */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variante Default</h4>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>
                Esta é uma mensagem informativa para o usuário.
              </AlertDescription>
            </Alert>
          </div>

          {/* Destructive Alert */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variante Destructive</h4>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.
              </AlertDescription>
            </Alert>
          </div>

          {/* Custom Styled Alerts */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Alertas Customizados</h4>
            <div className="grid gap-3">
              <Alert className="border-success bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertTitle className="text-success">Sucesso</AlertTitle>
                <AlertDescription>
                  Operação realizada com sucesso!
                </AlertDescription>
              </Alert>

              <Alert className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Atenção</AlertTitle>
                <AlertDescription>
                  Verifique as informações antes de prosseguir.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exemplos de Código</h4>
            <CodeBlock
              label="Alert"
              code={`{/* Default */}
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Informação</AlertTitle>
  <AlertDescription>
    Mensagem informativa aqui.
  </AlertDescription>
</Alert>

{/* Destructive */}
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Erro</AlertTitle>
  <AlertDescription>
    Ocorreu um erro.
  </AlertDescription>
</Alert>

{/* Custom Success */}
<Alert className="border-success bg-success/10">
  <CheckCircle className="h-4 w-4 text-success" />
  <AlertTitle className="text-success">Sucesso</AlertTitle>
  <AlertDescription>Operação realizada!</AlertDescription>
</Alert>

{/* Custom Warning */}
<Alert className="border-warning bg-warning/10">
  <AlertTriangle className="h-4 w-4 text-warning" />
  <AlertTitle className="text-warning">Atenção</AlertTitle>
  <AlertDescription>Verifique antes de prosseguir.</AlertDescription>
</Alert>`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Toast Examples */}
      <Card className="card-interactive card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Toast (Sonner)
          </CardTitle>
          <CardDescription>Notificações temporárias e toasts interativos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variantes de Toast</h4>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => toast('Mensagem padrão', { description: 'Esta é uma notificação padrão.' })}
              >
                Toast Default
              </Button>
              <Button
                variant="outline"
                className="border-success text-success hover:bg-success/10"
                onClick={() => toast.success('Sucesso!', { description: 'Operação completada.' })}
              >
                Toast Success
              </Button>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => toast.error('Erro!', { description: 'Algo deu errado.' })}
              >
                Toast Error
              </Button>
              <Button
                variant="outline"
                className="border-warning text-warning hover:bg-warning/10"
                onClick={() => toast.warning('Atenção!', { description: 'Verifique esta ação.' })}
              >
                Toast Warning
              </Button>
              <Button
                variant="outline"
                className="border-info text-info hover:bg-info/10"
                onClick={() => toast.info('Informação', { description: 'Detalhes importantes.' })}
              >
                Toast Info
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Toast com Ações</h4>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="gradient"
                onClick={() => toast('Ação necessária', {
                  description: 'Deseja confirmar esta operação?',
                  action: {
                    label: 'Confirmar',
                    onClick: () => toast.success('Confirmado!')
                  }
                })}
              >
                Toast com Ação
              </Button>
              <Button
                variant="gradient-secondary"
                onClick={() => toast.promise(
                  new Promise((resolve) => setTimeout(resolve, 2000)),
                  {
                    loading: 'Carregando...',
                    success: 'Dados carregados!',
                    error: 'Erro ao carregar',
                  }
                )}
              >
                Toast Promise
              </Button>
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exemplos de Código</h4>
            <CodeBlock
              label="Toast (Sonner)"
              code={`import { toast } from "sonner";

{/* Variantes básicas */}
toast("Mensagem padrão", { description: "Descrição opcional" });
toast.success("Sucesso!", { description: "Operação completada." });
toast.error("Erro!", { description: "Algo deu errado." });
toast.warning("Atenção!", { description: "Verifique esta ação." });
toast.info("Informação", { description: "Detalhes importantes." });

{/* Com ação */}
toast("Confirmar?", {
  description: "Deseja continuar?",
  action: {
    label: "Confirmar",
    onClick: () => toast.success("Confirmado!")
  }
});

{/* Promise (loading -> success/error) */}
toast.promise(
  fetch("/api/save"),
  {
    loading: "Salvando...",
    success: "Dados salvos!",
    error: "Erro ao salvar",
  }
);`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skeleton Examples */}
      <Card className="card-interactive card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary" />
            Skeleton
          </CardTitle>
          <CardDescription>Placeholders de carregamento para conteúdo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Skeletons */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Formas Básicas</h4>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <p className="text-xs text-muted-foreground">Linha de texto</p>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <p className="text-xs text-muted-foreground">Avatar</p>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <p className="text-xs text-muted-foreground">Botão</p>
              </div>
            </div>
          </div>

          {/* Card Skeleton */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Card Skeleton</h4>
            <div className="border rounded-lg p-4 space-y-3 max-w-md">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Table Skeleton</h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/30 p-3 flex gap-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border-t flex gap-4">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          </div>

          {/* List Skeleton */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lista Skeleton</h4>
            <div className="space-y-3 max-w-sm">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded-md">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-[70%]" />
                    <Skeleton className="h-2 w-[40%]" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exemplos de Código</h4>
            <CodeBlock
              label="Skeleton"
              code={`{/* Linha de texto */}
<Skeleton className="h-4 w-[250px]" />

{/* Avatar circular */}
<Skeleton className="h-12 w-12 rounded-full" />

{/* Botão */}
<Skeleton className="h-8 w-24 rounded-md" />

{/* Card Skeleton */}
<div className="border rounded-lg p-4 space-y-3">
  <div className="flex items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-3 w-[100px]" />
    </div>
  </div>
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-[80%]" />
</div>

{/* Múltiplas linhas */}
{[1, 2, 3].map((i) => (
  <Skeleton key={i} className="h-4 w-full" />
))}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
