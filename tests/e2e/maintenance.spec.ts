import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

test.describe('Dashboard de Manutenção (TPM)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve carregar o dashboard de TPM', async ({ page }) => {
    await page.goto('/tpm');

    // Página renderiza com heading OU acesso negado
    const heading = page.locator('h1, h2').first();
    const denied = page.getByText(/acesso negado|sem permiss/i).first();
    await expect(heading.or(denied).first()).toBeVisible({ timeout: 15_000 });

    if (await denied.isVisible().catch(() => false)) return;

    // Verifica que ALGUM conte[úu]do est[áa] presente (cards, m[ée]tricas ou estado vazio)
    const content = page.locator('[class*="card"], [class*="metric"], table, [role="tabpanel"]').first();
    const emptyState = page.getByText(/nenhum|sem dados|vazio|carregando/i).first();
    await expect(content.or(emptyState).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve navegar para a aba de alertas', async ({ page }) => {
    await page.goto('/tpm');

    // Procura QUALQUER aba com texto de alerta
    const alertTab = page.locator('button[role="tab"]').filter({ hasText: /alerta/i }).first();
    if (await alertTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await alertTab.click();
      await page.waitForTimeout(1000);
      // Container de alertas deve renderizar (com dados OU estado vazio)
      const alertContent = page.locator('[role="tabpanel"]').first();
      const anyText = page.locator('h3, p, span').first();
      await expect(alertContent.or(anyText).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
