import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTPMNotifications } from './useTPMNotifications';

const mocks = vi.hoisted(() => ({
  inserted: [] as Array<Record<string, unknown>>,
  sendNotification: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess, warning: mocks.toastWarning },
}));

vi.mock('@/features/notifications/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    permission: 'granted',
    isSupported: true,
    requestPermission: vi.fn(),
    sendNotification: mocks.sendNotification,
  }),
}));

vi.mock('@/features/notifications/hooks/useNotificationSounds', () => ({
  useNotificationSounds: () => ({ playAlertSound: vi.fn() }),
}));

vi.mock('@/lib/realtimeChannel', () => ({ useRealtimeChannel: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn((table: string) => {
      if (table === 'user_notification_settings') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ user_id: 'user-2', email_enabled: true, whatsapp_enabled: true, push_enabled: true, machine_filters: [] }],
            error: null,
          }),
        };
      }
      if (table === 'machines') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: 'Maquina A', code: 'M1' }, error: null }),
        };
      }
      if (table === 'tpm_notification_logs') {
        return {
          insert: vi.fn(async (row: Record<string, unknown>) => {
            mocks.inserted.push(row);
            return { error: null };
          }),
        };
      }
      return {};
    }),
  },
}));

type TestResult = { success: boolean; needsValidation?: boolean; reason?: string };

const runTest = async (
  result: { current: ReturnType<typeof useTPMNotifications> },
  channel: 'email' | 'whatsapp' | 'push',
  force: boolean,
) => {
  let res: TestResult | undefined;
  await act(async () => {
    res = (await result.current.sendTestNotification('machine-1', channel, force)) as TestResult;
  });
  return res as TestResult;
};

describe('useTPMNotifications.sendTestNotification', () => {
  beforeEach(() => {
    mocks.inserted.length = 0;
    mocks.sendNotification.mockReset();
    mocks.toastError.mockClear();
    mocks.toastSuccess.mockClear();
    mocks.toastWarning.mockClear();
  });

  it('registra falha em vez de sucesso quando o canal email não tem provedor', async () => {
    const { result } = renderHook(() => useTPMNotifications());

    const res = await runTest(result, 'email', true);

    expect(mocks.inserted[0]).toMatchObject({ channel: 'email', status: 'failure' });
    expect(String(mocks.inserted[0].error_message)).toContain('email');
    expect(res.success).toBe(false);
    expect(res.reason).toBe('provider_not_configured');
    expect(mocks.toastError).toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it('registra falha quando o canal whatsapp não tem provedor', async () => {
    const { result } = renderHook(() => useTPMNotifications());

    const res = await runTest(result, 'whatsapp', true);

    expect(mocks.inserted[0]).toMatchObject({ channel: 'whatsapp', status: 'failure' });
    expect(res.success).toBe(false);
    expect(res.reason).toBe('provider_not_configured');
  });

  it('registra sucesso quando o push é entregue ao navegador', async () => {
    mocks.sendNotification.mockReturnValue({});
    const { result } = renderHook(() => useTPMNotifications());

    const res = await runTest(result, 'push', true);

    expect(mocks.inserted[0]).toMatchObject({ channel: 'push', status: 'success' });
    expect(res.success).toBe(true);
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it('registra falha quando o push não é entregue', async () => {
    mocks.sendNotification.mockReturnValue(null);
    const { result } = renderHook(() => useTPMNotifications());

    const res = await runTest(result, 'push', true);

    expect(mocks.inserted[0]).toMatchObject({ channel: 'push', status: 'failure' });
    expect(res.success).toBe(false);
    expect(res.reason).toBe('push_not_delivered');
    expect(mocks.toastError).toHaveBeenCalled();
  });

  it('sem confirmação apenas lista destinatários, sem enviar nem registrar log', async () => {
    const { result } = renderHook(() => useTPMNotifications());

    const res = await runTest(result, 'push', false);

    expect(res.needsValidation).toBe(true);
    expect(mocks.inserted).toHaveLength(0);
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });
});