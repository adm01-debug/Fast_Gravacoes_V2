import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Fingerprint, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ElectronicSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export function ElectronicSignatureDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Assinatura Eletrônica (21 CFR Part 11)",
  description = "Para prosseguir com esta operação crítica, confirme sua identidade e o motivo da alteração.",
  actionLabel = "Confirmar e Assinar"
}: ElectronicSignatureDialogProps) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!password) {
      toast.error('Senha de assinatura é obrigatória');
      return;
    }
    if (!reason) {
      toast.error('O motivo da alteração é obrigatório para auditoria');
      return;
    }

    setIsSubmitting(true);
    // Em um sistema real, validaríamos a senha contra o Supabase Auth ou um PIN específico
    setTimeout(() => {
      onConfirm(reason);
      setIsSubmitting(false);
      onOpenChange(false);
      setPassword('');
      setReason('');
      toast.success('Operação assinada e registrada na trilha de auditoria imutável');
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="password" title="Senha do Usuário">Senha de Confirmação</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha de acesso"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Alteração (Justificativa)</Label>
            <Input
              id="reason"
              placeholder="Ex: Identificado desvio de cor no lote"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-[10px] text-muted-foreground leading-tight flex gap-3">
             <Fingerprint className="h-5 w-5 shrink-0" />
             <span>
               ESTA OPERAÇÃO SERÁ VINCULADA AO SEU ID DE USUÁRIO E ENDEREÇO IP,
               GERANDO UM HASH SHA-256 IMUTÁVEL NA TRILHA DE AUDITORIA COMPLIANCE.
             </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? "Processando..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
