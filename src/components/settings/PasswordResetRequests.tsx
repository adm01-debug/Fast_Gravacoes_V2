import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Check, X, Clock, Loader2, KeyRound, Mail, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PasswordResetRequest {
  id: string;
  user_email: string;
  requested_by_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string;
}

export function PasswordResetRequests() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const locale = i18n.language === 'pt-BR' ? ptBR : i18n.language === 'es-ES' ? es : enUS;

  const { data: requests, isLoading } = useQuery({
    queryKey: ['password-reset-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PasswordResetRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-password-reset', {
        body: {
          requestId,
          action: 'approve',
          redirectUrl: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(t('settings.resetApproved', 'Solicitação aprovada. Email enviado.'));
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
    onError: (error: Error) => {
      showErrorToast(error, t('settings.resetApproveError', 'Erro ao aprovar solicitação'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-password-reset', {
        body: {
          requestId,
          action: 'reject',
          rejectionReason: reason,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success(t('settings.resetRejected', 'Solicitação rejeitada.'));
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      showErrorToast(error, t('settings.resetRejectError', 'Erro ao rejeitar solicitação'));
    },
  });

  const handleApprove = (request: PasswordResetRequest) => {
    approveMutation.mutate(request.id);
  };

  const handleRejectClick = (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedRequest) return;
    rejectMutation.mutate({
      requestId: selectedRequest.id,
      reason: rejectionReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><Check className="h-3 w-3" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const pendingCount = requests?.filter(r => r.status === 'pending' && !isExpired(r.expires_at)).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {t('settings.passwordResetRequests', 'Solicitações de Reset de Senha')}
              </CardTitle>
              <CardDescription>
                {t('settings.passwordResetDescription', 'Aprove ou rejeite solicitações de redefinição de senha')}
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingCount} {t('settings.pending', 'pendente(s)')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('settings.noResetRequests', 'Nenhuma solicitação de reset de senha')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('auth.email', 'E-mail')}</TableHead>
                    <TableHead>{t('common.name', 'Nome')}</TableHead>
                    <TableHead>{t('common.status', 'Status')}</TableHead>
                    <TableHead>{t('common.date', 'Data')}</TableHead>
                    <TableHead className="text-right">{t('common.actions', 'Ações')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const expired = isExpired(request.expires_at);
                    const isPending = request.status === 'pending' && !expired;

                    return (
                      <TableRow key={request.id} className={expired && request.status === 'pending' ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{request.user_email}</TableCell>
                        <TableCell>{request.requested_by_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {expired && request.status === 'pending' ? (
                              <Badge variant="secondary" className="gap-1 w-fit">
                                <AlertCircle className="h-3 w-3" /> Expirado
                              </Badge>
                            ) : (
                              getStatusBadge(request.status)
                            )}
                            {request.reviewed_by_name && (
                              <span className="text-xs text-muted-foreground">
                                por {request.reviewed_by_name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(request)}
                                disabled={approveMutation.isPending}
                                className="gap-1"
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                {t('common.approve', 'Aprovar')}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClick(request)}
                                disabled={rejectMutation.isPending}
                                className="gap-1"
                              >
                                <X className="h-3 w-3" />
                                {t('common.reject', 'Rejeitar')}
                              </Button>
                            </div>
                          )}
                          {request.status === 'rejected' && request.rejection_reason && (
                            <span className="text-xs text-muted-foreground italic">
                              "{request.rejection_reason}"
                            </span>
                          )}
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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.rejectRequest', 'Rejeitar Solicitação')}</DialogTitle>
            <DialogDescription>
              {t('settings.rejectDescription', 'Informe o motivo da rejeição (opcional)')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('auth.email', 'E-mail')}</Label>
              <p className="text-sm font-medium">{selectedRequest?.user_email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">{t('settings.reason', 'Motivo')}</Label>
              <Input
                id="rejection-reason"
                placeholder={t('settings.reasonPlaceholder', 'Ex: Usuário não identificado')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t('common.reject', 'Rejeitar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
