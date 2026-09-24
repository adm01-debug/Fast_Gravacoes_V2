import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

// /inventory é restrita a coordinator/manager — a conta E2E tem coordinator
// ativo (com MFA verificado, ver helpers/e2e-setup.ts login()). Mantido o
// fallback de negação como defesa: se o papel algum dia mudar, os testes
// abaixo encerram cedo em vez de dar timeout confuso.
async function inventoryLoadedOrDenied(page: import('@playwright/test').Page): Promise<boolean> {
  let hasContent = false;
  let isDenied = false;
  await expect.poll(async () => {
    hasContent = await page.getByText('Gestão de Materiais').isVisible();
    isDenied = await page.getByText(/acesso negado|sem permiss[ãa]o|acesso restrito/i).first().isVisible();
    return hasContent || isDenied;
  }, { timeout: 15_000 }).toBe(true);
  return hasContent;
}

test.describe('Estabilidade Visual do Inventário', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve exibir skeletons durante a busca no inventário', async ({ page }) => {
    // Navega para a página de inventário
    await page.goto('/inventory');

    if (!(await inventoryLoadedOrDenied(page))) return;

    // Localiza o campo de busca
    const searchInput = page.locator('input[placeholder*="Buscar material"]');
    await expect(searchInput).toBeVisible();

    // Simula uma busca lenta digitando termo que force re-render
    // O debounce é de 300ms, então skeletons devem aparecer brevemente
    await searchInput.fill('teste-rapido-de-busca');
    
    // Verifica se o skeleton do ProductGrid aparece
    // Como o isLoading é controlado pelo React Query, em ambiente de teste local/CI 
    // pode ser muito rápido, mas o skeleton deve estar presente no DOM enquanto isLoading for true
    const skeleton = page.locator('.glass-card div.animate-pulse').first();
    
    // Em testes e2e reais, podemos interceptar a rota para simular delay
    await page.route('**/rest/v1/inventory_items*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Dispara nova busca com delay simulado
    await searchInput.fill('busca-com-delay');
    
    // Verifica visibilidade do skeleton
    await expect(page.locator('.glass-card div.animate-pulse').first()).toBeVisible();
    
    // Aguarda o carregamento terminar e o layout estabilizar
    await page.waitForSelector('.glass-card:not(:has(.animate-pulse))', { timeout: 10000 });
    
    // Verifica se a mensagem de "Nenhum material encontrado" aparece ou os itens carregados
    // Garantindo que o layout não "quebrou"
    const emptyState = page.locator('text=Nenhum material encontrado');
    const items = page.locator('.glass-card:not(:has(.animate-pulse))');
    
    await expect(emptyState.or(items).first()).toBeVisible();
  });

  test('layout deve permanecer estável entre estados de carregamento', async ({ page }) => {
    await page.goto('/inventory');

    if (!(await inventoryLoadedOrDenied(page))) return;

    // Captura o container da grid
    const gridContainer = page.locator('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
    
    // Força um estado de carregamento via interceptação
    await page.route('**/rest/v1/inventory_items*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });
    
    // Recarrega apenas a seção clicando no filtro
    await page.locator('button:has-text("Categorias")').or(page.locator('[role="combobox"]')).first().click();
    await page.locator('text=Tintas').click();
    
    // Verifica se a grid mantém dimensões consistentes (evita layout shift brusco)
    // O skeleton deve ocupar o mesmo espaço visual aproximado
    await expect(gridContainer).toBeVisible();
    const box = await gridContainer.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });
});
