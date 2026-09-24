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
    
    // 3. Mock a generic action that adds to pendingActions
    // Since we're in a real browser context, we can check localStorage
    await page.evaluate(() => {
      // Manual trigger for testing if UI buttons are not reachable
      const event = new CustomEvent('offline-action-test', { 
        detail: { type: 'create', entity: 'jobs', data: { title: 'Test' } } 
      });
      window.dispatchEvent(event);
    });

    // 4. Go back online
    await context.setOffline(false);
    
    // 5. Verify sync success notification
    const syncToast = page.locator('text=sincronizadas');
    await expect(syncToast).toBeVisible({ timeout: 15000 });
  });
});
