/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps, react-hooks/preserve-manual-memoization -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useCallback, useEffect } from 'react';
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

// Default VAPID public key - should be overridden by environment variable
const DEFAULT_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Get VAPID key from environment or use default
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported && user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = useCallback(async () => {
    // Recompute support locally instead of reading the `isSupported` state,
    // which is still false during the first render where this is called.
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const subscribed = !!subscription;
      setIsSubscribed(subscribed);
      return subscribed;
    } catch (error) {
      return false;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error('Você precisa estar logado para receber notificações');
      return false;
    }

    if (!isSupported) {
      toast.error('Push notifications não são suportadas neste navegador');
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permissão para notificações negada');
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // Create new subscription if none exists
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      const subscriptionJson = subscription.toJSON();

      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription data');
      }

      // Save to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        toast.error('Erro ao salvar subscription');
        return false;
      }

      setIsSubscribed(true);
      toast.success('Push notifications ativadas com sucesso!');
      return true;
    } catch (error) {
      toast.error('Erro ao ativar push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from Supabase
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        if (error) {
          logger.warn('Falha ao remover inscrição de push do banco', error, 'usePushSubscription');
        }
      }

      setIsSubscribed(false);
      toast.success('Push notifications desativadas');
      return true;
    } catch (error) {
      toast.error('Erro ao desativar push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const sendTestNotification = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Teste de Notificação',
          body: 'Se você está vendo isso, as notificações push estão funcionando!',
          icon: '/pwa-icons/icon-192x192.png',
        },
      });

      if (error) {
        toast.error('Erro ao enviar notificação de teste');
        return;
      }

      if (data?.vapid_configured === false) {
        toast.warning('VAPID keys não configuradas. Notificações em modo simulado.');
      } else {
        toast.success('Notificação de teste enviada!');
      }
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    }
  }, [user]);

  const broadcastNotification = useCallback(async (title: string, body: string, data?: Record<string, unknown>) => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          broadcast: true,
          title,
          body,
          icon: '/pwa-icons/icon-192x192.png',
          data,
        },
      });

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }, []);

  return {
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,
    broadcastNotification,
  };
}
