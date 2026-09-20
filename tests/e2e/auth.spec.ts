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
    await expect(page.locator('h1').first()).toContainText('FAST GRAVAÇÕES');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('#login-email', 'wrong@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for toast error message
    // Note: toast is usually in a portal, locator might vary
    // Toast de erro e do sonner (seletor varia entre versoes: data-sonner-toast / li[role=status])
    await expect(page.locator('[data-sonner-toast], li[role="status"]').first()).toBeVisible({ timeout: 8000 });
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
    // O proprio usuario E2E tem role operator — usa-lo (o email hardcoded
    // 'operador@...' nao existe no auth do projeto canonico).
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard or redirection
    // Based on ProtectedRoute.tsx, operator might be redirected to /operator
    await page.waitForURL(url => url.pathname === '/' || url.pathname === '/operator');

    // Aguardar a hidratacao de papeis (sidebar renderizada) antes de forcar
    // rota restrita — ProtectedRoute decide apos carregar user_roles.
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });

    // Try to access settings (manager/coordinator only)
    await page.goto('/settings');

    // Should be redirected away from /settings (operator e barrado)
    await expect.poll(() => page.url(), { timeout: 10000 }).not.toContain('/settings');
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
    // O usuario E2E tem papel operator: /machines e /inventory exigem
    // coordinator/manager e NAO aparecem na sidebar. O operator ve:
    // Dashboard, Kanban, Manuseio/Embalagem e Design System.
    await page.getByRole('link', { name: 'Kanban' }).click();
    await expect(page).toHaveURL(/kanban/, { timeout: 10000 });

    // Navigate back to Dashboard using Brand Logo
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('should handle responsive mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // On mobile, the sidebar might be hidden behind a menu button
    const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    
    // Sidebar should now be visible
    await expect(page.locator('aside')).toBeVisible();
    
    // Navegacao final via URL (os itens visiveis da sidebar variam por papel;
    // o cerne do teste e o menu mobile abrir com o aside visivel).
    await page.goto('/scanner');
    await expect(page).toHaveURL('/scanner');
  });
});

