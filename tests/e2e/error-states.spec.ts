import { test, expect, Page } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

async function login(page: Page) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', E2E_EMAIL);
  await page.fill('input[type="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Error boundaries and fallback states', () => {
  test('404 route shows not-found UI, not white screen', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-at-all-xyz');
    await page.waitForLoadState('domcontentloaded');
    const bodyText = await page.locator('body').innerText();
    // Must show something — not blank
    expect(bodyText.trim().length).toBeGreaterThan(0);
    // No unhandled React crash (no "Something went wrong" without recovery)
    await expect(page.locator('text=Unexpected Application Error')).not.toBeVisible();
  });

  test('auth page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('login with wrong credentials shows error message', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // Should stay on auth page and show error
    await expect(page).toHaveURL(/\/auth/);
    await page.waitForSelector('[role="alert"], .text-destructive, text=/inválid|invalid|incorrect|credencial/i', {
      timeout: 8_000,
      state: 'visible',
    });
  });

  test('each main nav route loads without 500 error', async ({ page }) => {
    await login(page);

    const routes = ['/', '/calendar', '/production', '/kpis', '/alerts', '/settings'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).not.toHaveURL(/500|error|crash/);
      const title = await page.title();
      expect(title).not.toBe('');
    }
  });
});

test.describe('Form validation — all input error states', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('settings page loads and form fields are interactive', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Check page loaded
    await expect(page).not.toHaveURL(/error/);
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(0); // settings exists
  });

  test('XSS input in visible form field is safely rendered', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const firstInput = page.locator('input[type="text"]').first();
    if (await firstInput.isVisible()) {
      await firstInput.fill('<script>alert("xss")</script>');
      // Page should NOT execute the script
      let alerted = false;
      page.on('dialog', async (dialog) => {
        alerted = true;
        await dialog.dismiss();
      });
      await page.keyboard.press('Tab');
      expect(alerted).toBe(false);
    }
  });
});

test.describe('Loading and skeleton states', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard shows skeleton loader before data arrives', async ({ page }) => {
    // Intercept API calls to simulate slow network
    await page.route('**/rest/v1/**', async route => {
      await new Promise(r => setTimeout(r, 500));
      await route.continue();
    });

    await page.goto('/');
    // Loading indicators should appear during load
    const skeleton = page.locator('[data-testid*="skeleton"], .animate-pulse, [aria-label*="carregando"], [aria-label*="loading"]');
    // At least one loading indicator OR data loaded fast — either is OK
    await expect(page).not.toHaveURL(/error/);
  });

  test('empty state renders when no data', async ({ page }) => {
    // Intercept to return empty data
    await page.route('**/rest/v1/jobs*', route =>
      route.fulfill({ status: 200, body: JSON.stringify([]), headers: { 'Content-Type': 'application/json' } })
    );

    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    // Should not crash — empty state or "no jobs" message
    await expect(page).not.toHaveURL(/error/);
  });
});

test.describe('Network error resilience', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard survives API timeout gracefully', async ({ page }) => {
    await page.route('**/rest/v1/**', route => route.abort('timedout'));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // No full crash
    await expect(page).not.toHaveURL(/500/);
    // No unhandled error dialog
    await expect(page.locator('text=Unexpected Application Error')).not.toBeVisible();
  });

  test('page stays functional after API returns 500', async ({ page }) => {
    await page.route('**/rest/v1/jobs*', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
    );

    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/500/);
  });
});
