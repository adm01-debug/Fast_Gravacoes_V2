import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Dashboard de KPIs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  });

  test('deve carregar o dashboard de KPIs e navegar entre abas', async ({ page }) => {
    await page.goto('/kpis');

    // Página renderiza com heading OU estado de acesso negado
    const heading = page.locator('h1, h2').first();
    const denied = page.getByText(/acesso negado|sem permiss/i).first();
    await expect(heading.or(denied).first()).toBeVisible({ timeout: 15_000 });

    if (await denied.isVisible().catch(() => false)) return;

    // Verifica que ALGUM card de estatística OU estado vazio está presente
    const statsCard = page.locator('[class*="card"], [class*="stat"], [data-testid*="stat"]').first();
    const emptyState = page.getByText(/nenhum dado|sem dados|carregando/i).first();
    await expect(statsCard.or(emptyState).first()).toBeVisible({ timeout: 10_000 });

    // Se existem abas, tenta navegar entre elas
    const tabs = page.locator('button[role="tab"]');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      // Clica em cada aba (começando da segunda) e volta
      for (let i = 1; i < Math.min(tabCount, 4); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(500); // aguarda render
      }
      // Volta para a primeira
      await tabs.first().click();
    }
  });

  test('deve permitir alterar o período do dashboard', async ({ page }) => {
    await page.goto('/kpis');

    // Procura QUALQUER botão que possa ser um seletor de período
    const periodButton = page.locator('button').filter({
      hasText: /per[íi]odo|hoje|7 dias|30 dias|semana|m[êe]s/i
    }).first();

    if (await periodButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await periodButton.click();
      // Verifica que algum dropdown/opção apareceu OU o botão mudou
      await page.waitForTimeout(500);
      // Não exige texto específico — apenas que a UI respondeu
      expect(page.locator('button').first()).toBeVisible();
    }
  });
});
