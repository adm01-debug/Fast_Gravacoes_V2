import { test, expect } from '@playwright/test';

// Sem login, /design-system entregava o layout interno completo (menu,
// usuario e botao Sair). As demais rotas internas caem em /auth.
test.describe('Rotas internas sem login', () => {
  test('visitante em /design-system vai para /auth', async ({ page }) => {
    await page.goto('/design-system');
    await expect(page).toHaveURL(/\/auth$/, { timeout: 15000 });
  });
});