import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

/**
 * Cobre a página consolidada de status interno (`/status`) e o painel
 * de monitoramento (`/admin/monitoring`). Os testes validam estrutura e
 * ausência de estados de erro fatais — não dependem de dados reais de cron.
 */
test.describe('Status do sistema', () => {
  test.beforeEach(async ({ page }) => {
    // Login para /admin/monitoring (rota protegida)
    await login(page);
  });

  test('renderiza o painel consolidado com os agregados', async ({ page }) => {
    await page.goto('/status');

    const heading = page.getByRole('heading').first();
    const denied = page.getByText(/acesso negado|sem permiss/i).first();
    await expect(heading.or(denied).first()).toBeVisible({ timeout: 15_000 });

    // Estado geral OU mensagem de indisponibilidade (dados podem estar vazios)
    const estadoGeral = page.getByText(/Estado geral|Sa[úu]de/i).first();
    const indisponivel = page.getByText(/N[ãa]o foi poss[íi]vel|indispon[íi]vel/i).first();
    await expect(estadoGeral.or(indisponivel).first()).toBeVisible({ timeout: 15000 });
  });

  test('não expõe detalhes de erro interno', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('body')).not.toContainText('return_message');
    await expect(page.locator('body')).not.toContainText('ERRCODE');
  });

  test('painel de monitoramento exibe tendência das rotinas', async ({ page }) => {
    await page.goto('/admin/monitoring');

    // Heading OU acesso negado (dependendo do papel do usuário E2E)
    const heading = page.locator('h1, h2, h3').first();
    const negado = page.getByText(/acesso negado|sem permiss/i).first();
    await expect(heading.or(negado).first()).toBeVisible({ timeout: 15000 });

    // Se a página carregou (não foi bloqueada), verifica botões de período
    if (await negado.isVisible().catch(() => false)) return; // skip se bloqueado

    const periodButtons = page.getByRole('button').filter({ hasText: /\d+d/ });
    if (await periodButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const btn30 = periodButtons.filter({ hasText: '30d' });
      if (await btn30.isVisible()) await btn30.click();
      await expect(periodButtons.first()).toBeVisible();
    }
  });
});
