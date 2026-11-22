import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// Extend ServiceWorkerRegistration to include pushManager
declare global {
  interface ServiceWorkerRegistration {
    readonly pushManager: PushManager;
  }
}
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';

// Chave pública VAPID - substitua pela sua chave gerada
const VAPID_PUBLIC_KEY = 'BNqegy2GmfICoO05Urf9cuBPcEBFBUXhZSQQbQUvT0xta8hOQU3iZOwUnLh4ahv0qA5hELrJCkPf7xE4B99psuo';

export function useWebPushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Verifica suporte a push notifications
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator &&
                       'PushManager' in window &&
                       'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Verifica se já está inscrito
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          // Verifica se a subscription está salva no banco
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();

          setIsSubscribed(!!data);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        logger.warn('Falha ao verificar inscrição de push', error, 'useWebPushNotifications');
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  // Converte a chave VAPID de base64 para Uint8Array
  const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  };

  // Inscrever para receber notificações
  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast.error('Push notifications não são suportadas neste navegador');
      return false;
    }

    try {
      setIsLoading(true);

      // Pedir permissão
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.error('Permissão para notificações negada');
        return false;
      }

      // Registrar service worker
      const registration = await navigator.serviceWorker.ready;

      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Extrair dados da subscription
      const subscriptionJson = subscription.toJSON();

      if (!subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Subscription keys not available');
      }

      // Salvar no banco de dados
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      toast.success('Notificações push ativadas!');
      return true;

    } catch (error) {
      toast.error('Erro ao ativar notificações push');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remover do banco
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Notificações push desativadas');
      return true;

    } catch (error) {
      toast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: '🔔 Teste de Notificação',
          body: 'As notificações push estão funcionando corretamente!',
          data: { url: '/seguranca' }
        }
      });

      if (error) throw error;

      toast.success('Notificação de teste enviada!');
      return true;
    } catch (error) {
      toast.error('Erro ao enviar notificação de teste');
      return false;
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}
