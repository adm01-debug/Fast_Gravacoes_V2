import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';
import { expectContentOrDenied } from './helpers/e2e-setup';

test.describe('Production and Jobs Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login — todas as rotas deste spec (/kanban, /new-job, /oee,
    // /operator-productivity) são protegidas; sem isso, toda navegação
    // cai em /auth antes de qualquer asserção rodar.
    await page.goto('/auth');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('should navigate to Kanban and verify jobs', async ({ page }) => {
    await page.goto('/kanban');
    await expect(page).toHaveURL(/.*kanban/);
    await expectContentOrDenied(page, /Pendente|Em Produ[çc][ãa]o|Kanban/i);
  });

  test('should create a new job', async ({ page }) => {
    await page.goto('/new-job');

    const hasForm = await page.locator('input[name="order_number"]').isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasForm) {
      // Papel sem permissão para criar job — comportamento válido, não é falha.
      await expect(page.getByText(/acesso negado|sem permiss[ãa]o/i).first()).toBeVisible();
      return;
    }

    await page.fill('input[name="order_number"]', `ORD-${Date.now()}`);
    await page.fill('input[name="client"]', 'Test Client');
    await page.fill('input[name="product"]', 'Test Product');
    await page.fill('input[name="quantity"]', '1000');

    await page.click('button[role="combobox"]:has-text("Selecione a técnica")');
    await page.click('role=option >> nth=0');

    await page.click('button[type="submit"]');

    await expect(page.getByText(/Trabalho criado com sucesso|criado com sucesso/i)).toBeVisible({ timeout: 10_000 });
  });

  test('should verify OEE Dashboard', async ({ page }) => {
    await page.goto('/oee');
    await expect(page).toHaveURL(/.*oee/);
    await expectContentOrDenied(page, /Disponibilidade|Performance|Qualidade|OEE/i);
  });

  test('should verify Operators Productivity', async ({ page }) => {
    await page.goto('/operator-productivity');
    await expectContentOrDenied(page, /Produtividade dos Operadores|Operadores/i);
  });
});
