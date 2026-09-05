import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/operator', '/kpi', '/oee'];

test.describe('Acessibilidade - Sweep axe-core WCAG 2.2 AA', () => {
  for (const route of ROUTES) {
    test(`rota ${route} não deve apresentar violações críticas`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Aguarda hidratação/estado inicial
      await page.waitForTimeout(1500);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(['region']) // landmark ajustes tratados em provider
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      if (critical.length > 0) {
        console.log(
          `[a11y ${route}] violações críticas:`,
          JSON.stringify(
            critical.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
            null,
            2,
          ),
        );
      }

      expect(critical).toEqual([]);
    });
  }
});

test.describe('CommandPaletteAdvanced - teclado e foco', () => {
  test('abre com Cmd+K, navega com setas e fecha com Escape', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const isMac = testInfo.project.use.userAgent?.includes('Mac') ?? process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';

    // Abre a paleta
    await page.keyboard.press(`${modifier}+KeyK`);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Input recebe foco automático
    const input = dialog.getByRole('combobox').or(dialog.locator('input[cmdk-input]')).first();
    await expect(input).toBeFocused();

    // Navegação por setas mantém foco dentro do dialog
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    const activeInDialog = await dialog.evaluate((el) => el.contains(document.activeElement));
    expect(activeInDialog).toBe(true);

    // Fecha com Escape
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test('reabre corretamente e não duplica listeners (Cmd+K duas vezes)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

    await page.keyboard.press(`${modifier}+KeyK`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press(`${modifier}+KeyK`);
    await expect(page.getByRole('dialog')).toBeHidden();

    // Deve existir apenas um paleta montada no DOM
    await page.keyboard.press(`${modifier}+KeyK`);
    const dialogs = page.getByRole('dialog');
    await expect(dialogs).toHaveCount(1);
  });
});
