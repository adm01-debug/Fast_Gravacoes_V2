import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Auth Flow - Login/Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill login
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Check for dashboard content
    await expect(page.locator('h1')).toContainText('FAST GRAVAÇÕES');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('#login-email', 'wrong@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for toast error message
    // Note: toast is usually in a portal, locator might vary
    await expect(page.locator('li[role="status"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Perform logout
    const logoutBtn = page.getByRole('button', { name: /Sair|Logout/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Should redirect back to auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to auth page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect authenticated operator to restricted routes', async ({ page }) => {
    // Login as operator
    await page.goto('/auth');
    await page.fill('#login-email', 'operador@fastgravacoes.com.br');
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard or redirection
    // Based on ProtectedRoute.tsx, operator might be redirected to /operator
    await page.waitForURL(url => url.pathname === '/' || url.pathname === '/operator');

    // Try to access settings (manager/coordinator only)
    await page.goto('/settings');
    
    // Should be redirected to /operator or / based on logic
    const currentURL = page.url();
    expect(currentURL).not.toContain('/settings');
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin for full access
    await page.goto('/auth');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should navigate between main sections', async ({ page }) => {
    // Navigate to Machines
    await page.click('a[href="/machines"]');
    await expect(page).toHaveURL('/machines');
    
    // Navigate back to Dashboard using Brand Logo
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
    
    // Navigate to Inventory
    await page.click('a[href="/inventory"]');
    await expect(page).toHaveURL('/inventory');
  });

  test('should handle responsive mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // On mobile, the sidebar might be hidden behind a menu button
    const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    
    // Sidebar should now be visible
    await expect(page.locator('aside')).toBeVisible();
    
    // Navigate via sidebar
    await page.click('a[href="/scanner"]');
    await expect(page).toHaveURL('/scanner');
  });
});

