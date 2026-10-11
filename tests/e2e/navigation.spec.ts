import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

/**
 * Suíte de navegação — botão Voltar, dirty-guard, breadcrumbs, modais no
 * histórico e deep-links. Cobre as melhorias do pacote UX de navegação.
 */

test.describe('Botão Voltar', () => {
  test('volta uma entrada do histórico interno', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Voltar para a página anterior' }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('deep-link sem histórico interno cai no fallback (home, não sai do app)', async ({ page }) => {
    await login(page);
    // Entrada direta na rota — primeira entrada do histórico é 'default'
    await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Voltar para a página anterior' }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Alt+ArrowLeft navega para trás', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.keyboard.press('Alt+ArrowLeft');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Breadcrumbs', () => {
  test('renderiza trilha com rótulos em pt-BR e aria-current no último item', async ({ page }) => {
    await login(page);
    await page.goto('/alerts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const nav = page.locator('nav[aria-label="Trilha de navegação"]').first();
    // O primeiro item é um link ícone "Ir para o início" (rótulo no aria-label)
    await expect(nav.getByRole('link', { name: 'Ir para o início' })).toBeVisible();
    await expect(nav).toContainText('Alertas');
    await expect(nav.locator('[aria-current="page"]')).toHaveText(/Alertas/);
  });

  test('rotas novas têm rótulo (não mostra slug cru)', async ({ page }) => {
    await login(page);
    await page.goto('/admin/monitoring', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const nav = page.locator('nav[aria-label="Trilha de navegação"]').first();
    await expect(nav).toContainText('Administração');
    await expect(nav).toContainText('Monitoramento');
  });
});

test.describe('Guarda de formulário sujo', () => {
  test('sair de /new-job com campos preenchidos pede confirmação', async ({ page }) => {
    await login(page);
    await page.goto('/new-job', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.fill('#order_number', 'OS-E2E-DIRTY');

    await page.getByRole('button', { name: 'Voltar para a página anterior' }).first().click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toContainText('Descartar alterações não salvas?');

    // "Continuar editando" fica na página
    await dialog.getByRole('button', { name: 'Continuar editando' }).click();
    await expect(page).toHaveURL(/\/new-job/);
    await expect(page.locator('#order_number')).toHaveValue('OS-E2E-DIRTY');
  });

  test('confirmar saída descarta e navega', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.goto('/new-job', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.fill('#order_number', 'OS-E2E-DIRTY');
    await page.getByRole('button', { name: 'Voltar para a página anterior' }).first().click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.getByRole('button', { name: 'Sair sem salvar' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('wizard avança só com campos obrigatórios válidos', async ({ page }) => {
    await login(page);
    await page.goto('/new-job', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Próximo' }).click();
    // Continua na etapa 1 — validação bloqueou
    await expect(page.locator('text=Número da OS é obrigatório').first()).toBeVisible();
  });
});

test.describe('Ajuda de atalhos', () => {
  test('tecla ? abre o diálogo de atalhos', async ({ page }) => {
    await login(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(dialog).toContainText(/Atalhos de teclado/i);
    await expect(dialog).toContainText('Alt + ←');
  });
});

test.describe('Deep-link com foco', () => {
  test('?modal=batch-qr abre o modal de etiquetas via URL', async ({ page }) => {
    await login(page);
    await page.goto('/inventory?modal=batch-qr', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
  });
});
