import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

/**
 * End-to-end tests for the authentication flow, protected routes, and core navigation.
 * These tests ensure that critical paths remain functional across changes.
 */

test.describe('Authentication and Authorization Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the auth page
    await page.goto('/auth');
  });

  test('User Login and Dashboard Access', async ({ page }) => {
    // 1. Unauthenticated user should see login form
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/Entrar|Login/i);

    // 2. Perform login with admin credentials (mocking/testing against known seed data)
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. Verify successful navigation to dashboard
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('FAST GRAVAÇÕES');
    
    // 4. Verify sidebar presence and layout
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Protected Route Enforcement', async ({ page }) => {
    // 1. Attempt to access a protected route while unauthenticated
    await page.goto('/settings');
    
    // 2. Should be redirected to /auth
    await expect(page).toHaveURL(/\/auth/);
    
    // 3. Attempt to access restricted role page (simulating operator permissions)
    // Note: In real E2E, we'd log in with operator account
    await page.fill('#login-email', 'operador@fastgravacoes.com.br');
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    
    // 4. Operator should be redirected to operator view or home
    await expect(page).toHaveURL(url => url.pathname === '/' || url.pathname === '/operator', { timeout: 10000 });
    
    // 5. If they try to go to admin-only area (settings with allowedRoles)
    await page.goto('/settings');
    const currentURL = page.url();
    expect(currentURL).not.toContain('/settings');
  });

  test('User Logout Flow', async ({ page }) => {
    // 1. Login first
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 2. Click logout button in sidebar
    const logoutBtn = page.getByRole('button', { name: /Sair|Logout/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 3. Should return to auth page
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
    
    // 4. Trying to go back to dashboard should fail
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Main Application Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Always start authenticated as admin for navigation tests
    await page.goto('/auth');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('Desktop Sidebar Navigation', async ({ page }) => {
    // 1. Navigate to Machines section
    await page.click('a[href="/machines"]');
    await expect(page).toHaveURL('/machines');
    await expect(page.locator('h1')).toBeVisible();

    // 2. Navigate to Inventory
    await page.click('a[href="/inventory"]');
    await expect(page).toHaveURL('/inventory');

    // 3. Use Brand Logo to return Home
    const logo = page.locator('a[href="/"]').first();
    await logo.click();
    await expect(page).toHaveURL('/');
  });

  test('Mobile Responsive Navigation', async ({ page }) => {
    // 1. Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // 2. Mobile menu button should be visible
    const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await expect(menuBtn).toBeVisible();
    
    // 3. Open mobile menu
    await menuBtn.click();
    await expect(page.locator('aside')).toBeVisible();
    
    // 4. Navigate to a page via mobile menu
    await page.click('a[href="/scanner"]');
    await expect(page).toHaveURL('/scanner');
    
    // 5. Sidebar should close automatically after navigation (based on AppSidebar.tsx logic)
    await expect(page.locator('aside')).not.toBeVisible();
  });
});
