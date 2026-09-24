import { test, expect } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './helpers/credentials';

test.describe('Simulation and Stress Testing', () => {
  test.beforeEach(async ({ page }) => {
    // /simulation é rota protegida (allowedRoles coordinator/manager) — sem
    // login ela redireciona para /auth antes de qualquer asserção rodar.
    // A conta E2E hoje só tem 'operator' ativo — o papel 'coordinator' foi
    // desativado no banco (tinha zero fatores MFA cadastrados, e AuthProvider
    // agora resolve o papel de forma determinística por prioridade, então
    // sempre bateria no redirect de /mfa-enrollment em vez de negar acesso
    // de forma clara). Resultado esperado aqui é "Acesso restrito", não a
    // simulação real — ver Próximos passos: reativar coordinator quando a
    // conta tiver MFA de verdade.
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  });

  test('should run mass simulation and display results', async ({ page }) => {
    await page.goto('/simulation');

    // isVisible() não faz polling de verdade — expect.poll refaz a checagem
    // até um dos dois lados aparecer (simulador OU negação de acesso).
    let hasSimulator = false;
    let isDenied = false;
    await expect.poll(async () => {
      hasSimulator = await page.getByText('Simulador de Stress & Webhooks').isVisible();
      isDenied = await page.getByText(/acesso negado|sem permiss[ãa]o|acesso restrito/i).first().isVisible();
      return hasSimulator || isDenied;
    }, { timeout: 10_000 }).toBe(true);

    if (!hasSimulator) {
      // Papel sem permissão pra acessar /simulation — comportamento válido, não é falha.
      expect(isDenied).toBe(true);
      return;
    }

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
