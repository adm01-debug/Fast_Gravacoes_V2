import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

test.describe('Auth Flow - Login/Logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page);

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
    await login(page);
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

  test('should allow authenticated coordinator into coordinator-only routes', async ({ page }) => {
    // A conta E2E tem coordinator ativo (maior prioridade em
    // AuthProvider.tsx — resolução determinística por role) e MFA
    // verificado. Não existe rota nesta app restrita a manager/admin sem
    // também permitir coordinator, então o teste de negação de acesso vira,
    // na prática, um teste positivo: coordinator deve conseguir entrar em
    // /settings (allowedRoles: ['coordinator', 'manager']).
    await login(page);
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });

    await page.goto('/settings');
    await expect(page).toHaveURL('/settings', { timeout: 10000 });
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL('/');
  });

  test('should navigate between main sections', async ({ page }) => {
    // A conta E2E tem coordinator ativo — Kanban é visível para
    // coordinator/manager/operator.
    await page.getByRole('link', { name: 'Kanban' }).click();
    await expect(page).toHaveURL(/kanban/, { timeout: 10000 });

    // Navigate back to Dashboard using Brand Logo
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('should handle responsive mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // On mobile, the sidebar might be hidden behind a menu button
    const menuBtn = page.getByRole('button', { name: 'Abrir menu de navegação' });
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

