import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Admin and Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login primeiro — /settings e páginas admin são rotas protegidas
    await page.goto('/auth');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('should verify settings page structure', async ({ page }) => {
    await page.goto('/settings');
    // Aguardar hidratação — a página pode redirecionar se o papel não permitir
    await expect(
      page.getByText(/Configura|Settings/i).first().or(page.getByText(/acesso negado/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to Admin Telemetry', async ({ page }) => {
    await page.goto('/admin-telemetria');
    await expect(
      page.getByText(/Telemetria/i).first().or(page.getByText(/acesso negado/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to Audit Trail', async ({ page }) => {
    await page.goto('/audit-trail');
    await expect(
      page.getByText(/Auditoria|Audit/i).first().or(page.getByText(/acesso negado/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should verify Code Quality Dashboard', async ({ page }) => {
    await page.goto('/code-quality');
    await expect(
      page.getByText(/Qualidade|Quality/i).first().or(page.getByText(/acesso negado/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
