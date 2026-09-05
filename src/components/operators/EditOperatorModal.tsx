/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryConfig';
import { Loader2, Pencil } from 'lucide-react';
import { OperatorWithProfile } from '@/features/production';

interface EditOperatorModalProps {
  operator: OperatorWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PHONE_REGEX = /^\(?[0-9]{2}\)?[\s.-]?[0-9]{4,5}[\s.-]?[0-9]{4}$/;

interface FormErrors {
  full_name?: string;
  phone?: string;
}

export function EditOperatorModal({ operator, open, onOpenChange }: EditOperatorModalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (operator) {
      setFormData({
        full_name: operator.full_name || '',
        phone: operator.phone || '',
      });
      setErrors({});
    }
  }, [operator]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome é obrigatório';
    } else if (formData.full_name.trim().length < 3) {
      newErrors.full_name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (formData.phone && !PHONE_REGEX.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Formato inválido. Use: (11) 99999-9999';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !operator) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('update-operator', {
        body: {
          operator_id: operator.user_id,
          full_name: formData.full_name,
          phone: formData.phone,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Operador atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OPERATORS });
      onOpenChange(false);
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao atualizar operador');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Operador
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do perfil do operador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nome Completo *</Label>
            <Input
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value });
                if (errors.full_name) setErrors({ ...errors, full_name: undefined });
              }}
              placeholder="Nome do operador"
              disabled={isLoading}
              className={errors.full_name ? 'border-destructive' : ''}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone">Telefone</Label>
            <Input
              id="edit_phone"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}