import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/e2e-setup';

// Etapa 34 (docs/plano-50-etapas-260924.md): a única defesa contra falso-
// positivo que existia era o `mask` de valores dinâmicos. Sem
// `animations: 'disabled'`, qualquer transição CSS/framer-motion ainda em
// andamento no instante do screenshot (entrada de cards, contadores,
// skeleton→conteúdo) é capturada em um frame arbitrário — o mesmo commit
// pode produzir screenshots diferentes de uma run pra outra. E sem esperar
// `document.fonts.ready`, um web font que ainda não terminou de carregar faz
// o texto renderizar com a fonte de fallback do SO, alterando largura/altura
// de elementos e deslocando todo o layout abaixo — de novo, sem nenhuma
// mudança real de UI por trás.
async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Regressão Visual', () => {
  test.beforeEach(async ({ page }) => {
    // Login automático para testes visuais
    await login(page);
  });

  test('snapshot da dashboard principal', async ({ page }) => {
    // Causa raiz real do diff de 0,01% que travava merge nesta suíte,
    // confirmada comparando actual vs expected via playwright-report: não é
    // regressão de UI — MFALoginVerification.tsx dispara um
    // toast.success('Autenticação confirmada!') sem duration explícita
    // (padrão do sonner) assim que o login (beforeEach acima) termina. Sem
    // esperar ele sumir, o snapshot captura o toast num frame arbitrário do
    // fade-out, cobrindo os mini-cards de estatística — mesmo commit,
    // resultado diferente a cada run. .catch() é tolerante a esse toast não
    // aparecer (login sem MFA, cópia mudar) — nesse caso o locator já
    // resolve "hidden" de imediato.
    await page.getByText('Autenticação confirmada!').waitFor({ state: 'hidden', timeout: 6_000 }).catch(() => {});

    // Esperar carregamento de dados assíncronos (React Query) antes do
    // snapshot — isso é sobre dados chegando da rede, não sobre animação;
    // `animations: 'disabled'` abaixo cobre a parte de animação/transição.
    await page.waitForTimeout(2000);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      mask: [page.locator('.stats-value')], // Mascarar valores que mudam com o tempo
      animations: 'disabled',
    });
  });

  test('snapshot da sidebar colapsada e expandida', async ({ page }) => {
    const sidebar = page.locator('aside');
    await waitForFonts(page);

    // Expandida
    await expect(sidebar).toHaveScreenshot('sidebar-expanded.png', {
      animations: 'disabled',
    });

    // Colapsar
    const toggle = page.locator('button[aria-label="Recolher menu"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
      await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png', {
        animations: 'disabled',
      });
    }
  });

  test('snapshot responsivo mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      animations: 'disabled',
    });
  });
});
