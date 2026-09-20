import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

/**
 * End-to-end tests for the authentication flow, protected routes, and core navigation.
 * These tests ensure that critical paths remain functional across changes.
 */

test.describe('Authentication and Authorization Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('User Login and Dashboard Access', async ({ page }) => {
    // 1. Unauthenticated user should see login form
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/Entrar|Login/i);

    // 2. Perform login
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Verify successful navigation to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    // h1 é ambiguo (sidebar + hero) — .first() resolve o strict mode
    await expect(page.locator('h1').first()).toContainText('FAST GRAVAÇÕES');

    // 4. Verify sidebar presence and layout
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Protected Route Enforcement', async ({ page }) => {
    // 1. Attempt to access a protected route while unauthenticated
    await page.goto('/settings');

    // 2. Should be redirected to /auth
    await expect(page).toHaveURL(/\/auth/);

    // 3. Login with E2E credentials (o usuário E2E tem operator+coordinator)
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');

    // 4. Should reach dashboard or operator view
    await expect(page).toHaveURL(url => url.pathname === '/' || url.pathname === '/operator', { timeout: 15000 });
  });

  test('User Logout Flow', async ({ page }) => {
    // Login first
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Logout
    const logoutBtn = page.getByRole('button', { name: /Sair|Logout/i });
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();

    // Should redirect back to auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

test.describe('Main Application Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('Desktop Sidebar Navigation', async ({ page }) => {
    // Sidebar should be visible on desktop
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Navigate to Kanban (visível para operator)
    await page.getByRole('link', { name: 'Kanban' }).click();
    await expect(page).toHaveURL(/kanban/, { timeout: 10000 });

    // Back to dashboard via logo
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('Mobile Responsive Navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Menu button should appear on mobile
    const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();

    // Sidebar should now be visible
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });

    // Navigate via URL (sidebar items vary by role)
    await page.goto('/scanner');
    await expect(page).toHaveURL('/scanner');
  });
});
