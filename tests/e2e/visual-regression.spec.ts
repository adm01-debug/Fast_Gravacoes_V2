import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

test.describe('Regressão Visual', () => {
  test.beforeEach(async ({ page }) => {
    // Login automático para testes visuais
    await login(page);
  });

  test('snapshot da dashboard principal', async ({ page }) => {
    // Esperar carregamento de dados e animações
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      mask: [page.locator('.stats-value')], // Mascarar valores que mudam com o tempo
    });
  });

  test('snapshot da sidebar colapsada e expandida', async ({ page }) => {
    const sidebar = page.locator('aside');
    
    // Expandida
    await expect(sidebar).toHaveScreenshot('sidebar-expanded.png');
    
    // Colapsar
    const toggle = page.locator('button[aria-label="Recolher menu"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
      await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png');
    }
  });

  test('snapshot responsivo mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('dashboard-mobile.png');
  });
});
