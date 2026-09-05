import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Dashboard de Manutenção (TPM)', () => {
  test.beforeEach(async ({ page }) => {
    // Login automático
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('deve carregar o dashboard de TPM e exibir métricas principais', async ({ page }) => {
    await page.goto('/tpm');
    
    // Verifica título
    await expect(page.locator('h1:has-text("Manutenção Produtiva Total")')).toBeVisible();
    
    // Verifica cards de resumo
    await expect(page.locator('text=Total Agendado')).toBeVisible();
    await expect(page.locator('text=Atrasadas')).toBeVisible();
    
    // Verifica abas
    await expect(page.locator('button[role="tab"]:has-text("Painel")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Execuções")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Alertas")')).toBeVisible();
  });

  test('deve navegar para a aba de alertas e verificar lista', async ({ page }) => {
    await page.goto('/tpm');
    
    // Clica na aba de alertas
    await page.click('button[role="tab"]:has-text("Alertas")');
    
    // Verifica se o container de alertas está visível
    await expect(page.locator('h3:has-text("Alertas de Manutenção"), text=Nenhum alerta pendente')).toBeVisible();
  });
});
