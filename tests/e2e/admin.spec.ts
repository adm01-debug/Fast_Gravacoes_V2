import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';
import { expectContentOrDenied } from './helpers/e2e-setup';

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
    await expectContentOrDenied(page, /Configura|Settings/i);
  });

  test('should navigate to Admin Telemetry', async ({ page }) => {
    // Rota real é /admin/telemetria (AppRoutes.tsx) — /admin-telemetria não
    // existe e cai no NotFound, que não é envolvido por <main> nem mostra
    // toast de negação, então nem content nem denied nunca ficavam visíveis.
    await page.goto('/admin/telemetria');
    await expectContentOrDenied(page, /Telemetria/i);
  });

  test('should navigate to Audit Trail', async ({ page }) => {
    // Rota real é /audit (AppRoutes.tsx) — /audit-trail não existe.
    await page.goto('/audit');
    await expectContentOrDenied(page, /Auditoria|Audit/i);
  });

  test('should verify Code Quality Dashboard', async ({ page }) => {
    await page.goto('/code-quality');
    await expectContentOrDenied(page, /Qualidade|Quality/i);
  });
});
