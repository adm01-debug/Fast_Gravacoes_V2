import { test, expect } from '@playwright/test';
import { expectContentOrDenied, login } from './helpers/e2e-setup';

test.describe('Logistics Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login — /logistics é rota protegida
    await login(page);
  });

  test('should verify Logistics page structure', async ({ page }) => {
    await page.goto('/logistics');
    await expectContentOrDenied(page, /Log[íi]stica|Expedi[çc][ãa]o/i);
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
