/**
 * Etapa 39/e2e — utilitários compartilhados para specs E2E.
 *
 * O usuário E2E (e2e-ci@fastgravacoes.local) possui os papéis operator E
 * coordinator. Specs que testam páginas restritas a coordinator/manager
 * devem funcionar com este usuário.
 */

import { expect, type Page } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, E2E_TOTP_SECRET } from './credentials';
import { generateTotpCode } from './totp';

/**
 * Login padrão da suíte E2E — preenche e-mail/senha e, se a conta tiver MFA
 * ativo (coordinator exige — ver MFALoginVerification.tsx), responde o
 * desafio TOTP automaticamente a partir de E2E_TOTP_SECRET antes de
 * considerar o login concluído.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/auth');
  await page.fill('#login-email', E2E_EMAIL);
  await page.fill('#login-password', E2E_PASSWORD);
  await page.click('button[type="submit"]');

  const mfaInput = page.locator('#mfa-code');
  const isMfaChallenge = await mfaInput.isVisible({ timeout: 5_000 }).catch(() => false);
  if (isMfaChallenge) {
    if (!E2E_TOTP_SECRET) {
      throw new Error('Conta E2E exige MFA mas E2E_TOTP_SECRET não está definido.');
    }
    await mfaInput.fill(generateTotpCode(E2E_TOTP_SECRET));
    await page.click('button[type="submit"]');
  }

  await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
}

/**
 * Fecha qualquer overlay/modal que possa interceptar cliques.
 */
export async function dismissOverlays(page: Page): Promise<void> {
  const overlay = page.locator('[aria-label="Fechar tour"]');
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    await overlay.click().catch(() => {});
  }
}

/**
 * Assert que aceita EITHER o conteúdo esperado OR "acesso negado".
 * Retorna true se o conteúdo foi encontrado (não bloqueado).
 */
export async function expectContentOrDenied(
  page: Page,
  contentPattern: RegExp,
): Promise<boolean> {
  // Escopado a <main> (id="main-content-scroll" em MainLayout.tsx) — a
  // sidebar sempre visível traz os mesmos rótulos das rotas (ex.: "Kanban",
  // "Operadores") e faria o match passar mesmo com a página real quebrada.
  const content = page.locator('main').getByText(contentPattern).first();
  // "Acesso restrito" é o toast real de ProtectedRoute quando o papel não
  // tem allowedRoles — ele redireciona (não mostra "acesso negado" na
  // própria rota), então o toast é o único sinal de negação nesse caso.
  const denied = page.getByText(/acesso negado|sem permiss[ãa]o|forbidden|acesso restrito/i).first();
  await expect(content.or(denied).first()).toBeVisible({ timeout: 15000 });
  return await content.isVisible();
}
