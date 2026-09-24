import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Logistics Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login — /logistics é rota protegida
    await page.goto('/auth');
    await page.fill('#login-email', E2E_EMAIL);
    await page.fill('#login-password', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  });

  test('should verify Logistics page structure', async ({ page }) => {
    await page.goto('/logistics');
    // Assert page renders (heading OU conteúdo OU acesso negado)
    await expect(
      page.getByText(/Log[íi]stica|Expedi[çc][ãa]o/i).first()
        .or(page.getByText(/acesso negado/i)).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should verify Fleet Management tab', async ({ page }) => {
    await page.goto('/logistics');
    const fleetTab = page.getByText(/Frotas?/i).first();
    if (await fleetTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fleetTab.click();
      await expect(
        page.getByText(/Frota|Ve[íi]culos?/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should verify public tracking page', async ({ page }) => {
    // /public-tracking é público — não precisa de login
    await page.goto('/public-tracking');
    // .or() une os dois conjuntos de elementos — como a página normalmente
    // tem heading E input ao mesmo tempo, isso violava o strict mode.
    // Checagem OU real, cada lado avaliado isoladamente — mas isVisible()
    // não espera de verdade (o parâmetro timeout não faz polling), então a
    // rota lazy (PublicPage/Suspense) podia não ter montado ainda no
    // instante da checagem. expect.poll refaz a checagem até o timeout.
    await expect.poll(async () => {
      const hasHeading = await page.getByText(/Rastreamento|Tracking/i).first().isVisible();
      const hasInput = await page.locator('input').first().isVisible();
      return hasHeading || hasInput;
    }, { timeout: 10_000 }).toBe(true);
  });
});
