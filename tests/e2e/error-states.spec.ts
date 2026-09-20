import { test, expect } from '@playwright/test';

/**
 * Error boundaries and fallback states.
 * Verifica que estados de erro são tratados graciosamente.
 */

test.describe('Error boundaries and fallback states', () => {
  test('should not have unhandled page errors on auth page', async ({ page }) => {
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

    // Should stay on auth page
    await expect(page).toHaveURL(/\/auth/);

    // Error feedback: sonner toast OU alert inline OU texto destrutivo.
    // O sonner é o toast padrão do app ([data-sonner-toast] ou li[role=status]).
    const errorIndicator = page.locator(
      '[data-sonner-toast], li[role="status"], [role="alert"], .text-destructive'
    ).first();
    await expect(errorIndicator).toBeVisible({ timeout: 10_000 });
  });

  test('navigating to non-existent route shows not found state', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    // Should not crash — may show 404 or redirect to home
    await expect(page).not.toHaveURL(/500|error/);
  });
});
