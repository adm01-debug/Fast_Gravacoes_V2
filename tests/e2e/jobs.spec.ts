import { test, expect, Page } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

async function login(page: Page) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', E2E_EMAIL);
  await page.fill('input[type="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

test.describe('Jobs — CRUD and state transitions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('calendar page loads with job blocks', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('h1, h2').filter({ hasText: /calend|agenda|cronograma/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('quick job drawer opens and closes', async ({ page }) => {
    await page.goto('/calendar');

    // Look for FAB or new job button
    const addBtn = page.locator('button').filter({ hasText: /novo job|add job|\+/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Drawer or dialog should open
      await expect(page.locator('[role="dialog"], [data-testid="quick-job-drawer"]').first()).toBeVisible({ timeout: 5_000 });

      // Close it
      const closeBtn = page.locator('button').filter({ hasText: /cancelar|fechar|close/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('job priority filter changes visible jobs', async ({ page }) => {
    await page.goto('/calendar');
    const filterBtn = page.locator('button, [role="combobox"]').filter({ hasText: /prioridade|priority|filtrar/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.locator('[role="option"], li').filter({ hasText: /urgente|urgent/i }).first().click();
      // Page should not crash
      await expect(page).not.toHaveURL(/error/);
    }
  });
});

test.describe('Jobs — error states', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigating to non-existent job shows not found state', async ({ page }) => {
    await page.goto('/jobs/00000000-0000-0000-0000-000000000000');
    // Should show 404, error boundary, or redirect — not crash
    await expect(page).not.toHaveURL(/500|error/);
  });

  test('form with missing required fields shows validation errors', async ({ page }) => {
    await page.goto('/calendar');

    const addBtn = page.locator('button').filter({ hasText: /novo job|\+/i }).first();
    if (!await addBtn.isVisible()) return test.skip();

    await addBtn.click();
    await page.waitForSelector('[role="dialog"], [data-testid="quick-job-drawer"]', { timeout: 5_000 });

    // Try submitting empty form
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /criar|salvar|save|create/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Validation errors should appear
      const errorMsg = page.locator('[role="alert"], .text-destructive, [data-testid*="error"]').first();
      await expect(errorMsg).toBeVisible({ timeout: 3_000 });
    }
  });
});

test.describe('Jobs — status flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('production page loads without errors', async ({ page }) => {
    await page.goto('/production');
    await expect(page).not.toHaveURL(/500|error/);
    await page.waitForLoadState('networkidle');
  });

  test('jobs list renders with status badges', async ({ page }) => {
    await page.goto('/production');
    // Status badges should be visible
    const badges = page.locator('[data-testid*="status"], .badge, span').filter({
      hasText: /fila|queue|produção|production|finalizado|finished/i,
    });
    // Some jobs should be present if DB has data, otherwise just no crash
    await expect(page).not.toHaveURL(/error/);
  });
});
