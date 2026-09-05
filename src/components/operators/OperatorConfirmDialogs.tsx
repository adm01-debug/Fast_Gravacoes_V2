/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { OperatorWithProfile } from '@/features/production';

interface OperatorConfirmDialogsProps {
  operatorToRemove: OperatorWithProfile | null;
  operatorToToggle: OperatorWithProfile | null;
  isRemoving: boolean;
  isToggling: boolean;
  onRemoveClose: () => void;
  onToggleClose: () => void;
  onRemoveConfirm: (reason?: string) => void;
  onToggleConfirm: (reason?: string) => void;
}

export function OperatorConfirmDialogs({
  operatorToRemove, operatorToToggle, isRemoving, isToggling,
  onRemoveClose, onToggleClose, onRemoveConfirm, onToggleConfirm,
}: OperatorConfirmDialogsProps) {
  const [reason, setReason] = useState('');

  // Reset reason when dialogs open/close
  useEffect(() => {
    setReason('');
  }, [operatorToRemove, operatorToToggle]);

  return (
    <>
      <AlertDialog open={!!operatorToRemove} onOpenChange={(open) => !open && onRemoveClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover operador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{operatorToRemove?.full_name || 'este operador'}</strong> do sistema?
              <br /><br />Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Remover todas as atribuições de máquinas</li>
                <li>Remover o papel de operador do usuário</li>
              </ul>
              <br />
              <div className="space-y-2">
                <Label htmlFor="remove-reason" className="text-xs uppercase font-bold text-muted-foreground">Motivo (Opcional)</Label>
                <Input
                  id="remove-reason"
                  placeholder="Ex: Desligamento, mudança de setor..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onRemoveConfirm(reason)}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removendo...' : 'Remover operador'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!operatorToToggle} onOpenChange={(open) => !open && onToggleClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{operatorToToggle?.is_active ? 'Desativar operador' : 'Reativar operador'}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  {operatorToToggle?.is_active ? (
                    <>Tem certeza que deseja desativar <strong>{operatorToToggle?.full_name || 'este operador'}</strong>?<br /><br />O operador não poderá acessar as funcionalidades de operador enquanto estiver inativo.</>
                  ) : (
                    <>Deseja reativar <strong>{operatorToToggle?.full_name || 'este operador'}</strong>?<br /><br />O operador poderá acessar novamente as funcionalidades e suas máquinas atribuídas.</>
                  )}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="toggle-reason" className="text-xs uppercase font-bold text-muted-foreground">Motivo (Opcional)</Label>
                  <Input
                    id="toggle-reason"
                    placeholder="Ex: Férias, licença médica, retorno..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onToggleConfirm(reason)}
              disabled={isToggling}
              className={operatorToToggle?.is_active ? 'bg-warning text-warning-foreground hover:bg-warning/90' : 'bg-success text-success-foreground hover:bg-success/90'}
            >
              {isToggling ? 'Processando...' : operatorToToggle?.is_active ? 'Desativar' : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
