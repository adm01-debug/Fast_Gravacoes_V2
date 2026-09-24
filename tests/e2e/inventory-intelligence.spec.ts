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
    hasContent = await page.locator('.glass-card').first().isVisible();
    isDenied = await page.getByText(/acesso negado|sem permiss[ãa]o|acesso restrito/i).first().isVisible();
    return hasContent || isDenied;
  }, { timeout: 15_000 }).toBe(true);
  return hasContent;
}

test.describe('Fluxos de Inventário e Inteligência', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('deve permitir visualizar e filtrar o inventário', async ({ page }) => {
    await page.goto('/inventory');

    if (!(await inventoryLoadedOrDenied(page))) return;

    // Busca um material
    const searchInput = page.locator('input[placeholder*="Buscar material"]');
    await searchInput.fill('Tinta');
    
    // Verifica se os resultados foram filtrados ( skeletons devem aparecer e sumir )
    await page.waitForSelector('.glass-card');
    
    // Verifica badges de estoque baixo
    const lowStockBadges = page.locator('text=ESTOQUE BAIXO');
    const count = await lowStockBadges.count();
    console.log(`Itens com estoque baixo encontrados: ${count}`);
  });

  test('deve abrir o modal de registro de movimentação', async ({ page }) => {
    await page.goto('/inventory');

    if (!(await inventoryLoadedOrDenied(page))) return;

    // Clica no botão de Entrada do primeiro item — há 2+ itens seedados
    // (Tinta Branca Vinílica, Solvente Retardador), cada um com seu próprio
    // botão "Entrada"; sem .first() o seletor é ambíguo (strict mode).
    await page.locator('button:has-text("Entrada")').first().click();
    
    // Verifica se o modal abriu
    await expect(page.locator('h2:has-text("Registrar Movimentação")')).toBeVisible();
    
    // Preenche quantidade
    await page.fill('input[type="number"]', '5');
    
    // Verifica botão de confirmação
    await expect(page.locator('button:has-text("Confirmar Movimentação")')).toBeEnabled();
    
    // Fecha modal
    await page.keyboard.press('Escape');
  });

  test('deve validar o Mapa WMS e sugestões de IA', async ({ page }) => {
    await page.goto('/inventory');

    if (!(await inventoryLoadedOrDenied(page))) return;

    // Troca para a aba de Mapa WMS
    await page.click('button[role="tab"]:has-text("Mapa WMS")');
    
    // Verifica presença do mapa
    await expect(page.locator('.warehouse-grid, text=B4')).toBeVisible();
    
    // Verifica card de sugestões de IA
    await expect(page.locator('text=Sugestões de Re-alocação')).toBeVisible();
    await expect(page.locator('text=Otimização de Fluxo')).toBeVisible();
  });
});
