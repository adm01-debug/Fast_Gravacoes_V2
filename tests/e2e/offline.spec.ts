import { test, expect } from '@playwright/test';

test.describe('Offline Syncing and Persistence', () => {
  test('should queue actions offline and show sync indicators', async ({ page, context }) => {
    await page.goto('/');
    
    // 1. Go offline
    await context.setOffline(true);
    
    // 2. Verify offline banner/toast appears
    // Toast ("Sem conexão") e banner persistente ("Você está offline") podem
    // estar visíveis ao mesmo tempo — .or() une os dois conjuntos de elementos
    // e violava o strict mode do Playwright (2 elementos visíveis == falha).
    // Checagem OU real: cada lado avaliado isoladamente via expect.poll.
    let hasToast = false;
    let hasBanner = false;
    await expect.poll(async () => {
      hasToast = await page.locator('text=Sem conexão').isVisible();
      hasBanner = await page.locator('text=Você está offline').isVisible();
      return hasToast || hasBanner;
    }, { timeout: 10_000 }).toBe(true);
    
    // 3. Queue a pending action through the real addPendingAction path
    // (localStorage + React state), via the test-only hook OfflineSyncContext
    // exposes when built with VITE_E2E_TEST_HOOKS=true. A previous version of
    // this test dispatched a CustomEvent nothing in the app listened for —
    // dead code, the queue never actually gained an entry.
    await page.evaluate(() => {
      const addPendingAction = (window as unknown as {
        __E2E_ADD_PENDING_ACTION__?: (type: string, payload: Record<string, unknown>) => string;
      }).__E2E_ADD_PENDING_ACTION__;
      if (!addPendingAction) {
        throw new Error('__E2E_ADD_PENDING_ACTION__ ausente — build sem VITE_E2E_TEST_HOOKS=true?');
      }
      addPendingAction('update_job', { jobId: 'e2e-offline-test', updates: { status: 'production' } });
    });

    // 4. Go back online
    await context.setOffline(false);
    
    // 5. Verify sync success notification
    const syncToast = page.locator('text=sincronizadas');
    await expect(syncToast).toBeVisible({ timeout: 15000 });
  });
});
