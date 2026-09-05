import { test, expect } from '@playwright/test';

/**
 * Cobre a página consolidada de status interno (`/status`) e o painel
 * de monitoramento (`/admin/monitoring`). Os testes validam estrutura e
 * ausência de estados de erro fatais — não dependem de dados reais de cron,
 * pois o ambiente de teste pode não ter coletas nas últimas 24h.
 */
test.describe('Status do sistema', () => {
  test('renderiza o painel consolidado com os agregados', async ({ page }) => {
    await page.goto('/status');

    await expect(page.getByRole('heading', { name: /Status do sistema/i })).toBeVisible();
    await expect(page.getByText('Saúde consolidada das rotinas automáticas', { exact: false })).toBeVisible();

    // Estado geral e métricas agregadas (ou mensagem de indisponibilidade).
    const estadoGeral = page.getByText('Estado geral', { exact: true });
    const indisponivel = page.getByText('Não foi possível consultar o status agora', { exact: false });
    await expect(estadoGeral.or(indisponivel).first()).toBeVisible({ timeout: 15000 });

    if (await estadoGeral.isVisible()) {
      for (const label of ['Rotinas monitoradas', 'Saudáveis', 'Falhando', 'Silenciosas']) {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
      }
      await expect(page.getByText('Última coleta:', { exact: false })).toBeVisible();
    }
  });

  test('não expõe detalhes de erro interno das rotinas', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('body')).not.toContainText('return_message');
    await expect(page.locator('body')).not.toContainText('ERRCODE');
  });

  test('painel de monitoramento exibe tendência das rotinas automáticas', async ({ page }) => {
    await page.goto('/admin/monitoring');

    const heading = page.getByRole('heading', { name: /Monitoramento do Sistema/i });
    const negado = page.getByText(/acesso negado/i);
    await expect(heading.or(negado).first()).toBeVisible({ timeout: 15000 });

    if (await heading.isVisible()) {
      await expect(page.getByText('Tendência das rotinas automáticas')).toBeVisible();
      // Seletores de período do histórico de saúde.
      for (const period of ['7d', '30d', '90d']) {
        await expect(page.getByRole('button', { name: period, exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: '30d', exact: true }).click();
      await expect(page.getByRole('button', { name: '30d', exact: true })).toBeVisible();
    }
  });
});
