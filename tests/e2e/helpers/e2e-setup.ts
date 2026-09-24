/**
 * Etapa 39/e2e — utilitários compartilhados para specs E2E.
 *
 * O usuário E2E (e2e-ci@fastgravacoes.local) possui os papéis operator E
 * coordinator. Specs que testam páginas restritas a coordinator/manager
 * devem funcionar com este usuário.
 */

import { expect, type Page } from '@playwright/test';

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
