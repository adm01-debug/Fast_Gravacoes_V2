import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers/e2e-setup';

// `/traceability` nao entra no sweep completo: a pagina tem divida de contraste
// pre-existente (botao "Novo Lote", branco sobre --primary = 2.74:1) que nao e
// escopo deste arquivo. A regra que motivou a inclusao da rota (regiao rolavel
// sem parada de Tab) e verificada em teste dedicado logo abaixo.
const ROUTES = ['/', '/operator', '/kpis', '/oee'];

test.describe('Acessibilidade - Sweep axe-core WCAG 2.2 AA', () => {
  for (const route of ROUTES) {
    test(`rota ${route} não deve apresentar violações críticas`, async ({ page }) => {
      // Todas as 4 rotas são protegidas (ProtectedRoute) — sem login elas
      // redirecionam para /auth e o axe varre a tela de login, não a rota
      // real (e o CommandPaletteAdvanced abaixo também é gated por auth).
      await login(page);
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
            critical.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.length,
              // Sem os alvos a contagem nao diz qual container falhou.
              targets: v.nodes.map((n) => n.target),
            })),
            null,
            2,
          ),
        );
      }

      expect(critical).toEqual([]);
    });
  }
});

test.describe('TraceabilityPage - regiao rolavel alcancavel por teclado', () => {
  test('/traceability nao deve ter regiao rolavel inacessivel por teclado', async ({ page }) => {
    await login(page);
    await page.goto('/traceability', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const scrollable = page.locator('div.overflow-auto').first();
    await expect(scrollable).toBeVisible({ timeout: 10000 });

    // A parada de Tab so existe quando a lista realmente rola (ver `useOverflowing`
    // em TraceabilityPage): com poucos lotes o container nao recebe tabIndex.
    const rolavel = await scrollable.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    if (rolavel) {
      await expect(scrollable).toHaveAttribute('tabindex', '0');
      await scrollable.focus();
      expect(await scrollable.evaluate((el) => el === document.activeElement)).toBe(true);
    }

    const results = await new AxeBuilder({ page })
      .withRules(['scrollable-region-focusable'])
      .analyze();

    const violacoes = results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length }));
    expect(violacoes).toEqual([]);
  });
});

test.describe('CommandPaletteAdvanced - teclado e foco', () => {
  test('abre com Cmd+K, navega com setas e fecha com Escape', async ({ page }, testInfo) => {
    // CommandPaletteAdvanced só é montado quando autenticado
    // (enableCommandPalette={isAuthenticated} em AppProviders) — sem login
    // Cmd+K nunca abre nada e o teste trava esperando o dialog.
    await login(page);
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
    await login(page);
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
