import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Simulation and Stress Testing', () => {
  test.beforeEach(async ({ page }) => {
    // /simulation é rota protegida (allowedRoles coordinator/manager) — sem
    // login ela redireciona para /auth antes de qualquer asserção rodar.
    // A conta E2E tem as duas roles (operator + coordinator) — antes,
    // AuthProvider.tsx escolhia uma linha de user_roles com .limit(1) sem
    // ORDER BY (ordem não garantida pelo Postgres), então o papel efetivo
    // podia sair 'operator' e negar acesso de forma não-determinística.
    // Corrigido em AuthProvider.tsx para sempre escolher o papel de maior
    // prioridade (admin > manager > coordinator > operator).
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  });

  test('should run mass simulation and display results', async ({ page }) => {
    await page.goto('/simulation');
    
    // Check if simulation page is loaded
    await expect(page.locator('text=Simulador de Stress & Webhooks')).toBeVisible();
    
    // Set quantity to a small number for the test
    const quantityInput = page.locator('input[type="number"]');
    await quantityInput.fill('10');
    
    // Start simulation
    await page.click('text=Iniciar Simulação');
    
    // Wait for simulation to finish (check for progress bar reaching 100% or "Simulando..." text disappearing)
    await expect(page.locator('text=Simulando...')).toBeVisible();
    await expect(page.locator('text=Simulando...')).not.toBeVisible({ timeout: 30000 });
    
    // Verify results cards are visible
    await expect(page.locator('text=Taxa de Sucesso')).toBeVisible();
    await expect(page.locator('text=Latência P95')).toBeVisible();
    
    // Verify chart is rendered
    await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    
    // Verify log is populated
    await expect(page.locator('text=Log Detalhado')).toBeVisible();
    const logs = page.locator('.space-y-2 >> div');
    const count = await logs.count();
    expect(count).toBeGreaterThan(0);
  });
});
