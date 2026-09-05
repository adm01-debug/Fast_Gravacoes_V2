import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Dashboard de KPIs', () => {
  test.beforeEach(async ({ page }) => {
    // Login automático
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('deve carregar o dashboard de KPIs e navegar entre abas', async ({ page }) => {
    await page.goto('/kpis');
    
    // Verifica título
    await expect(page.locator('h1:has-text("Dashboard de KPIs")')).toBeVisible();
    
    // Verifica se os cards de estatísticas carregaram (pelo menos um)
    await expect(page.locator('text=Taxa de Conclusão')).toBeVisible();
    
    // Navega para a aba de Máquinas
    await page.click('button[role="tab"]:has-text("Máquinas")');
    await expect(page.locator('th:has-text("OEE Estimado")')).toBeVisible();
    
    // Navega para a aba de Operadores
    await page.click('button[role="tab"]:has-text("Operadores")');
    await expect(page.locator('text=Top Operadores')).toBeVisible();
    
    // Navega para a aba de Alertas
    await page.click('button[role="tab"]:has-text("Alertas & Desvios")');
    await expect(page.locator('text=Desvios & Anomalias')).toBeVisible();
  });

  test('deve permitir alterar o período do dashboard', async ({ page }) => {
    await page.goto('/kpis');
    
    // Abre seletor de período
    const periodButton = page.locator('button:has-text("Todo o período"), button:has-text("Hoje"), button:has-text("Últimos 7 dias")');
    await periodButton.click();
    
    // Seleciona "Hoje"
    await page.click('text=Hoje');
    
    // Verifica se o botão atualizou o texto
    await expect(page.locator('button:has-text("Hoje")')).toBeVisible();
  });
});
