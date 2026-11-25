import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/navigation/Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('@/components/ui/button', () => ({
  Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} />,
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
}));
vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TabsList: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  TabsTrigger: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
}));
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectItem: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

const personalNotification = {
  id: 'push-9f1',
  title: 'Falha na rotina de alertas',
  message: 'O envio de e-mail terminou sem sucesso',
  type: 'urgent' as const,
  category: 'cron_alert',
  source_system: 'push',
  is_read: false,
  read_at: null,
  action_url: null,
  action_label: null,
  priority: 1,
  group_count: 1,
  is_grouped: false,
  created_at: new Date().toISOString(),
};

vi.mock('@/features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [personalNotification],
    unreadCount: 1,
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  }),
}));
vi.mock('@/features/notifications/hooks/useDailySummaryNotifications', () => ({
  useDailySummaryNotifications: () => ({ manualRefresh: vi.fn().mockResolvedValue(undefined), isLoading: false }),
}));
vi.mock('@/features/notifications/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ permission: 'granted', requestPermission: vi.fn() }),
}));
vi.mock('@/features/notifications/hooks/useNotificationSounds', () => ({
  useNotificationSounds: () => ({ playSound: vi.fn(), isEnabled: () => false }),
}));

const emptyResult = { data: [], error: null };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.gte = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.limit = vi.fn(() => Promise.resolve(emptyResult));
      return chain;
    }),
    channel: vi.fn(() => {
      const channel: Record<string, unknown> = {};
      channel.on = vi.fn(() => channel);
      channel.subscribe = vi.fn(() => channel);
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

import NotificationsPage from './NotificationsPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('NotificationsPage - avisos pessoais na Central', () => {
  it('lista o aviso pessoal que gerou o contador do sino', async () => {
    render(<NotificationsPage />, { wrapper });

    expect(await screen.findByText('Falha na rotina de alertas')).toBeTruthy();
    expect(screen.getByText('O envio de e-mail terminou sem sucesso')).toBeTruthy();
  });

  it('rotula o aviso pessoal com a aba Avisos e o badge de tipo Aviso', async () => {
    render(<NotificationsPage />, { wrapper });

    await waitFor(() => expect(screen.getByText('Falha na rotina de alertas')).toBeTruthy());
    expect(screen.getByText('Avisos')).toBeTruthy();
    expect(screen.getByText('Aviso')).toBeTruthy();
  });
});