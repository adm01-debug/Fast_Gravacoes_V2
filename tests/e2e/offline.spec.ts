import { test, expect } from '@playwright/test';
import { login } from './helpers/e2e-setup';

test.describe('Offline Syncing and Persistence', () => {
  test('should queue actions offline and show sync indicators', async ({ page, context }) => {
    // O passo 5 espera até 25s pra fila esvaziar via retry/backoff real
    // (MAX_RETRIES=3, backoff exponencial em useOfflineSync.ts) — acima do
    // timeout padrão de 30s por teste somado aos passos anteriores.
    test.setTimeout(50_000);

    // Diagnóstico (mantido como rede de segurança): se algo abaixo falhar,
    // qualquer crash do ErrorBoundary gravado em localStorage (síncrono,
    // funciona offline) entra no corpo do erro real lançado pelo teste.
    const readCrashDump = () => page.evaluate(() =>
      localStorage.getItem('__last_error_boundary_crash__')
    );
    const withCrashContext = async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        const crash = await readCrashDump().catch(() => null);
        if (crash) {
          throw new Error(`${(err as Error).message}\n\n[ErrorBoundary crash detectado]: ${crash}`);
        }
        throw err;
      }
    };

    // Causa raiz real do crash (confirmada via o dump acima em CI real): o
    // teste rodava sem login, então '/' redirecionava pra '/auth' — cujo
    // chunk lazy-loaded corria contra o setOffline(true) logo abaixo. Uma
    // ação de update_job enfileirada também só faz sentido pra um usuário
    // autenticado. Login primeiro (como o resto da suíte) elimina o redirect
    // e a corrida por completo.
    await login(page);
    await page.goto('/');

    // 1. Go offline
    await context.setOffline(true);
    
    // 2. Verify offline banner/toast appears
    // Toast ("Sem conexão") e banner persistente ("Você está offline") podem
    // estar visíveis ao mesmo tempo — .or() une os dois conjuntos de elementos
    // e violava o strict mode do Playwright (2 elementos visíveis == falha).
    // Checagem OU real: cada lado avaliado isoladamente via expect.poll.
    let hasToast = false;
    let hasBanner = false;
    await withCrashContext(() => expect.poll(async () => {
      hasToast = await page.locator('text=Sem conexão').isVisible();
      hasBanner = await page.locator('text=Você está offline').isVisible();
      return hasToast || hasBanner;
    }, { timeout: 10_000 }).toBe(true));
    
    // 3. Queue a pending action through the real addPendingAction path
    // (localStorage + React state), via the test-only hook OfflineSyncContext
    // exposes when built with VITE_E2E_TEST_HOOKS=true. A previous version of
    // this test dispatched a CustomEvent nothing in the app listened for —
    // dead code, the queue never actually gained an entry.
    const getPendingCount = () => page.evaluate(() => {
      const get = (window as unknown as {
        __E2E_GET_PENDING_COUNT__?: () => number;
      }).__E2E_GET_PENDING_COUNT__;
      if (!get) {
        throw new Error('__E2E_GET_PENDING_COUNT__ ausente — build sem VITE_E2E_TEST_HOOKS=true?');
      }
      return get();
    });

    await withCrashContext(() => page.evaluate(() => {
      const addPendingAction = (window as unknown as {
        __E2E_ADD_PENDING_ACTION__?: (type: string, payload: Record<string, unknown>) => string;
      }).__E2E_ADD_PENDING_ACTION__;
      if (!addPendingAction) {
        throw new Error('__E2E_ADD_PENDING_ACTION__ ausente — build sem VITE_E2E_TEST_HOOKS=true?');
      }
      addPendingAction('update_job', { jobId: 'e2e-offline-test', updates: { status: 'production' } });
    }));

    // Confirma que a fila realmente ganhou a entrada — exatamente o que o
    // CustomEvent morto da versão anterior deste teste nunca fazia.
    await withCrashContext(() => expect.poll(getPendingCount, { timeout: 5_000 }).toBe(1));

    // 4. Go back online
    await context.setOffline(false);

    // 5. A fila precisa esvaziar — sucesso, conflito, ou exaustão de retries
    // (MAX_RETRIES=3, backoff exponencial 3s/6s/12s em useOfflineSync.ts,
    // ~21s no pior caso) — provando que um passe de sync de verdade
    // processou a ação enfileirada. Não usa texto de toast: "Conexão
    // restaurada" (NetworkStatusToaster.tsx) dispara em qualquer evento
    // 'online', com ou sem ação pendente na fila, e não prova que o
    // pipeline de sync rodou.
    await expect.poll(getPendingCount, { timeout: 25_000 }).toBe(0);
  });
});
