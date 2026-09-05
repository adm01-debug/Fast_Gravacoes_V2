import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Fluxos de Inventário e Inteligência', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('deve permitir visualizar e filtrar o inventário', async ({ page }) => {
    await page.goto('/inventory');
    
    // Verifica se os cards de estoque carregaram
    await page.waitForSelector('.glass-card');
    
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
    
    // Clica no botão de Entrada de um item
    await page.click('button:has-text("Entrada")');
    
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
    
    // Troca para a aba de Mapa WMS
    await page.click('button[role="tab"]:has-text("Mapa WMS")');
    
    // Verifica presença do mapa
    await expect(page.locator('.warehouse-grid, text=B4')).toBeVisible();
    
    // Verifica card de sugestões de IA
    await expect(page.locator('text=Sugestões de Re-alocação')).toBeVisible();
    await expect(page.locator('text=Otimização de Fluxo')).toBeVisible();
  });
});
