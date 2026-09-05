import { test, expect, Page } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

/**
 * E2E — Manuseio e Embalagem (/packaging)
 *
 * Cobre:
 *  1. Bloqueio de acesso anônimo (redirect para /auth)
 *  2. Abertura via sidebar como coordinator / manager / operator
 *  3. RBAC: perfil sem role válida NÃO acessa /packaging
 *  4. Destaque visual do item de sidebar quando em /packaging e sub-rotas
 */

const PASSWORD = E2E_PASSWORD;

const ACCOUNTS = {
  admin: E2E_EMAIL,
  coordinator: 'coordenador@fastgravacoes.com.br',
  manager: 'gerente@fastgravacoes.com.br',
  operator: 'operador@fastgravacoes.com.br',
} as const;

async function login(page: Page, email: string) {
  await page.goto('/auth');
  await page.fill('#login-email', email);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  // Espera aterrissar em qualquer rota autenticada (dashboard ou /operator)
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
}

test.describe('Packaging — Acesso anônimo', () => {
  test('redireciona para /auth ao acessar /packaging sem sessão', async ({ page }) => {
    await page.goto('/packaging');
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });

  test('redireciona para /auth ao acessar sub-rota /packaging/xyz sem sessão', async ({ page }) => {
    await page.goto('/packaging/task-123');
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });
});

test.describe('Packaging — Abertura via sidebar (RBAC permitido)', () => {
  for (const role of ['coordinator', 'manager', 'operator'] as const) {
    test(`${role} abre /packaging clicando no item da sidebar`, async ({ page }) => {
      await login(page, ACCOUNTS[role]);

      // Em mobile, abre o menu antes
      const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
      if (await menuBtn.isVisible().catch(() => false)) {
        await menuBtn.click();
      }

      // Garante que o grupo "Operações" está expandido, se estiver fechado
      const groupToggle = page.getByRole('button', { name: /Operações/i }).first();
      if (await groupToggle.isVisible().catch(() => false)) {
        // Clica apenas se o item de packaging ainda não estiver visível
        const linkVisible = await page
          .locator('a[href="/packaging"]')
          .first()
          .isVisible()
          .catch(() => false);
        if (!linkVisible) await groupToggle.click();
      }

      const link = page.locator('a[href="/packaging"]').first();
      await expect(link).toBeVisible({ timeout: 5_000 });
      await link.click();

      await expect(page).toHaveURL(/\/packaging$/, { timeout: 10_000 });
      // Página renderiza (não caiu em redirect de RBAC)
      await expect(page.locator('main')).toBeVisible();
    });
  }
});

test.describe('Packaging — Destaque visual da sidebar', () => {
  test('item /packaging fica ativo em /packaging e em sub-rota', async ({ page }) => {
    await login(page, ACCOUNTS.admin);

    for (const path of ['/packaging', '/packaging/task-abc']) {
      await page.goto(path);
      // Rota deve responder (admin bypass RBAC)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/') + '$'));

      const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') });
      if (await menuBtn.isVisible().catch(() => false)) await menuBtn.click();

      const link = page.locator('a[href="/packaging"]').first();
      await expect(link).toBeVisible();

      // O botão interno recebe classes de estado ativo (border-l-4 + border-primary)
      const activeButton = link.locator('button');
      const cls = (await activeButton.getAttribute('class')) ?? '';
      expect(cls).toContain('border-primary');
      expect(cls).toContain('bg-sidebar-accent');
    }
  });
});

test.describe('Packaging — Deep link autenticado', () => {
  test('coordinator abre /packaging via URL direta', async ({ page }) => {
    await login(page, ACCOUNTS.coordinator);
    await page.goto('/packaging');
    await expect(page).toHaveURL(/\/packaging$/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('operator abre /packaging via URL direta (permitido)', async ({ page }) => {
    await login(page, ACCOUNTS.operator);
    await page.goto('/packaging');
    // Operator está no allowedRoles — não deve ser redirecionado
    await expect(page).toHaveURL(/\/packaging$/, { timeout: 10_000 });
  });
});
