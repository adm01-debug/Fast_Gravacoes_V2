import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS, QUARANTINE_TTL_MS, MAX_RETRIES } from '@/lib/offline/offlineQueue';

// Mock Supabase properly
vi.mock('@/integrations/supabase/client', () => {
  const mockTable = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    // Make it a thenable that resolves to { data: [], error: null }
    then: vi.fn().mockImplementation(function(onFulfilled) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled);
    }),
  };

  return {
    supabase: {
      from: vi.fn(() => mockTable),
        auth: {
          onAuthStateChange: vi.fn((cb: (event: string, session?: { user?: { id?: string } } | null) => void) => {
                      (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb = cb;
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          }),
        },
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
  },
}));

const setOnline = (status: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    value: status,
    configurable: true,
  });
  window.dispatchEvent(new Event(status ? 'online' : 'offline'));
};

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOnline(true);
      // Um teste que deixa o thenable pendurado (banco "fora do ar") não pode
      // contaminar os seguintes: volta ao comportamento padrão a cada caso.
      const jobsTable = supabase.from('jobs') as unknown as {
        then: { mockImplementation: (fn: unknown) => void };
      };
      jobsTable.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      );
  });

  it('should queue actions when offline', async () => {
    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });

    expect(result.current.pendingActionsCount).toBe(1);
  });

  it('should sync actions when coming back online', async () => {
    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });

    type MockTable = { then: { mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void } };
    const mockTable = supabase.from('jobs') as unknown as MockTable;
    mockTable.then.mockImplementationOnce((onFulfilled) => {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled);
    });

    // Flip online in its own act() so the hook re-renders and result.current is
    // refreshed to the up-to-date (isOnline=true) closure before we sync.
    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(0);
  });

  it('drains a queue hydrated from localStorage on cold mount while online', async () => {
    // Regression for the E2E failure in offline.spec.ts: a queue persisted by
    // a previous session was never replayed after a reload, because the syncRef
    // trigger effect fired before the ref-assignment effect had populated the
    // ref, and nothing re-fired it. The assignment effect must kick the pass
    // itself on cold mount.
    setOnline(true);

    // Seed localStorage exactly like a reloaded session with a pending action.
    const seeded: Record<string, unknown> = {
      id: 'hydrated-1',
      type: 'update_job',
      payload: { jobId: 'job-1', updates: { status: 'production' } },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify([seeded]));

    type MockTable = { then: { mockImplementation: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void } };
    const mockTable = supabase.from('jobs') as unknown as MockTable;
    mockTable.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    );

    const { result } = renderHook(() => useOfflineSync());
    await waitFor(() => {
      expect(result.current.pendingActionsCount).toBe(0);
    });
  });

  it('should handle sync failures and retries', async () => {
    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });

    type MockTable = { then: { mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void } };
    const mockTable = supabase.from('jobs') as unknown as MockTable;
    mockTable.then.mockImplementationOnce((onFulfilled) => {
      return Promise.resolve({ data: null, error: new Error('Network error') }).then(onFulfilled);
    });

    // Reconnecting triggers a sync pass automatically (the 'online' event
    // effect); wait for that pass to settle instead of calling
    // syncPendingActions manually — a second pass would consume another
    // mocked response and inflate the retry count non-deterministically.
    await act(async () => {
      setOnline(true);
    });
    await waitFor(() => {
      expect(result.current.pendingActions[0]?.retryCount).toBe(1);
    });

    expect(result.current.pendingActionsCount).toBe(1);
  });

  it('detects a conflict instead of blindly overwriting a job that changed on the server while queued', async () => {
    type MockTable = {
      then: {
        mockImplementation: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void;
        mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void;
      };
    };
    const mockTable = supabase.from('jobs') as unknown as MockTable;

    // cacheData() resolves jobs/machines/techniques in parallel — seed a job
    // with updated_at='t1' so updateJobOffline can capture it as baseUpdatedAt.
    mockTable.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: 'job-1', updated_at: 't1' }], error: null }).then(onFulfilled)
    );

    const { result } = renderHook(() => useOfflineSync());
    await act(async () => {
      await result.current.cacheData();
    });
    expect(result.current.cachedData?.jobs[0]).toMatchObject({ id: 'job-1', updated_at: 't1' });

    await act(async () => {
      setOnline(false);
    });
    await act(async () => {
      result.current.updateJobOffline('job-1', { status: 'production' });
    });
    expect(result.current.pendingActionsCount).toBe(1);

    // Server row's updated_at no longer matches 't1' — the conditional
    // .eq('updated_at', baseUpdatedAt) filters it out, so the update matches
    // zero rows. That must surface as a conflict, not a silent no-op success.
    mockTable.then.mockImplementationOnce((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    );

    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(0);
    expect(result.current.failedActionsCount).toBe(1);
    expect(result.current.failedActions[0].reason).toBe('conflict');
  });

  it('replays a queued QR scan via upsert keyed on the action id (idempotent retry)', async () => {
    type MockTable = {
      then: { mockImplementationOnce: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void };
      upsert: ReturnType<typeof vi.fn>;
    };
    const mockTable = supabase.from('qr_scan_history') as unknown as MockTable;

    setOnline(false);
    const { result } = renderHook(() => useOfflineSync());
    await act(async () => {
      result.current.recordQRScanOffline('job-1', 'operator-1', 'start');
    });
    expect(result.current.pendingActionsCount).toBe(1);
    const queuedId = result.current.pendingActions[0].id;

    mockTable.then.mockImplementationOnce((onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    );

    await act(async () => {
      setOnline(true);
    });
    await act(async () => {
      await result.current.syncPendingActions();
    });

    expect(result.current.pendingActionsCount).toBe(0);
    expect(mockTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: queuedId, job_id: 'job-1' }),
      { onConflict: 'id' }
    );
  });

      it('limpa fila e cache do localStorage na saída de sessão (etapa 232)', async () => {
        // Fila e cache desta fila vivem no localStorage; o IndexedDB limpo em
        // offlineStorage.clearAll() não os alcança.
        setOnline(false);
              localStorage.setItem(
                STORAGE_KEYS.CACHED_DATA,
                JSON.stringify({ jobs: [{ id: 'job-1' }], machines: [], techniques: [], lastSyncedAt: null }),
              );
        const { result } = renderHook(() => useOfflineSync());

        await act(async () => {
          result.current.updateJobOffline('job-1', { status: 'production' });
        });
        expect(result.current.pendingActionsCount).toBe(1);
        expect(localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS)).toContain('job-1');

              const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
        expect(authCb).toBeTypeOf('function');

        act(() => {
                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
        });
              act(() => {
                authCb('SIGNED_OUT', null);
              });

        await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));
        expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS) ?? '[]')).toHaveLength(0);
              // O cache de leitura do operador anterior não fica no aparelho.
              expect(localStorage.getItem(STORAGE_KEYS.CACHED_DATA)).toBeNull();
            });

            it('guarda a alteração não entregue e o próximo operador não a herda (etapa 232)', async () => {
              setOnline(false);
              const { result } = renderHook(() => useOfflineSync());
              const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
              const quarantineKey = 'fastgravacoes_orphan_queue_operador-a';

              act(() => {
                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
              });
              await act(async () => {
                result.current.updateJobOffline('job-1', { status: 'production' });
              });
              expect(result.current.pendingActionsCount).toBe(1);

              act(() => {
                authCb('SIGNED_OUT', null);
              });
              await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));

              // A ação não foi entregue ao servidor: não pode ser descartada.
              expect(localStorage.getItem(quarantineKey)).toContain('job-1');

              act(() => {
                authCb('SIGNED_IN', { user: { id: 'operador-b' } });
              });
              await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));
              expect(localStorage.getItem(quarantineKey)).toContain('job-1');
            });

            it('devolve a fila não entregue quando o mesmo operador volta (etapa 232)', async () => {
              setOnline(false);
              const { result } = renderHook(() => useOfflineSync());
              const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;

              act(() => {
                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
              });
              await act(async () => {
                result.current.updateJobOffline('job-1', { status: 'production' });
              });
              act(() => {
                authCb('SIGNED_OUT', null);
              });
              await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));

              act(() => {
                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
              });

              await waitFor(() => expect(result.current.pendingActionsCount).toBe(1));
              expect(result.current.pendingActions[0].payload).toMatchObject({ jobId: 'job-1' });
              // E volta a ser a fila ativa, não só um estado em memória.
              expect(localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS)).toContain('job-1');
              // A cópia guardada já foi gravada na fila ativa: só então sai.
              expect(localStorage.getItem('fastgravacoes_orphan_queue_operador-a')).toBeNull();
      });

            it('saída durante o sync não guarda ação que o servidor já aceitou (etapa 232, thread 1)', async () => {
              // Sair no meio do lote quarentenava a fila ANTERIOR ao lote, com
              // ações que o servidor acabou de aplicar — o próximo login as
              // reenviava em duplicidade.
              setOnline(false);
              const { result } = renderHook(() => useOfflineSync());
              const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
              type MockTable = {
                update: { mock: { calls: unknown[][] } } & ((...args: unknown[]) => unknown);
                then: { mockImplementation: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void };
              };
              const jobsTable = supabase.from('jobs') as unknown as MockTable;

              act(() => {
                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
              });
              await act(async () => {
                result.current.updateJobOffline('job-1', { status: 'production' });
              });
              expect(result.current.pendingActionsCount).toBe(1);

              await act(async () => {
                // O lote é iniciado à mão com o banco pendurado: a saída cai
                // no meio dele, que é o estado que gerava a duplicidade.
                setOnline(true);
                let releaseUpsert: () => void = () => {};
                jobsTable.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
                  new Promise<{ data: unknown[]; error: null }>((resolve) => {
                    releaseUpsert = () => resolve({ data: [], error: null });
                  }).then(onFulfilled)
                );
                let syncDone: Promise<void> = Promise.resolve();
                await act(async () => {
                  syncDone = result.current.syncPendingActions();
                  await Promise.resolve();
                });
                expect(jobsTable.update).toHaveBeenCalledTimes(1);
                act(() => {
                  authCb('SIGNED_OUT', null);
                });
                // Ainda dentro do lote: nada foi quarentenado com a fila antiga.
                expect(localStorage.getItem('fastgravacoes_orphan_queue_operador-a') ?? '').not.toContain('job-1');
                await act(async () => {
                  releaseUpsert();
                  await syncDone;
                });
              });

              await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));
              expect(jobsTable.update).toHaveBeenCalledTimes(1);
              // A ação foi entregue: não pode voltar como pendência.
              expect(localStorage.getItem('fastgravacoes_orphan_queue_operador-a') ?? '').not.toContain('job-1');
              expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS) ?? '[]')).toHaveLength(0);
              expect(localStorage.getItem(STORAGE_KEYS.CACHED_DATA)).toBeNull();
            });

            it('não devolve cópia guardada antiga demais (etapa 232, thread 3)', async () => {
              // Offline: nenhum lote pode drenar a fila e mascarar a restauração.
              setOnline(false);
              const { result } = renderHook(() => useOfflineSync());
              const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
              const quarantineKey = 'fastgravacoes_orphan_queue_operador-a';
              localStorage.setItem(
                quarantineKey,
                JSON.stringify({
                  pending: [{ id: 'job-1' }],
                  failed: [],
                  acknowledged: [],
                  savedAt: Date.now() - QUARANTINE_TTL_MS - 1000,
                }),
              );

              act(() => {
                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
              });

              await waitFor(() => expect(localStorage.getItem(quarantineKey)).toBeNull());
              expect(result.current.pendingActionsCount).toBe(0);
            });

            it('mantém a cópia guardada quando a fila ativa não pôde ser gravada (etapa 232, thread 2)', async () => {
              // Apagar a cópia antes de gravar a fila abria uma janela em que o
              // fechamento da aba perdia a única cópia da alteração.
              setOnline(false);
              const { result } = renderHook(() => useOfflineSync());
              const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
              const quarantineKey = 'fastgravacoes_orphan_queue_operador-a';
              localStorage.setItem(
                quarantineKey,
                JSON.stringify({
                  pending: [{
                    id: 'acao-1',
                    type: 'update_job',
                    payload: { jobId: 'job-1', updates: { status: 'production' } },
                    createdAt: new Date().toISOString(),
                    retryCount: 0,
                  }],
                  failed: [],
                  acknowledged: [],
                  savedAt: Date.now(),
                }),
              );

              const originalSetItem = Storage.prototype.setItem;
              const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
                this: Storage,
                key: string,
                value: string,
              ) {
                if (key === STORAGE_KEYS.PENDING_ACTIONS) throw new Error('QuotaExceededError');
                return originalSetItem.call(this, key, value);
              });

              try {
                act(() => {
                  authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
                });

                await waitFor(() => expect(result.current.pendingActionsCount).toBe(1));
                expect(localStorage.getItem(quarantineKey)).toContain('acao-1');
              } finally {
                spy.mockRestore();
              }
            });

                          it('saída durante o lote guarda a ação rejeitada, não a descarta (etapa 232, thread nova 1)', async () => {
                            // O estado do React só grava depois do lote: quarentenar lendo o
                            // storage guardava a fila anterior e perdia as rejeições.
                            setOnline(false);
                            localStorage.setItem(
                              STORAGE_KEYS.PENDING_ACTIONS,
                              JSON.stringify([{
                                id: 'acao-exausta',
                                type: 'update_job',
                                payload: { jobId: 'job-1', updates: { status: 'production' } },
                                createdAt: new Date().toISOString(),
                                retryCount: MAX_RETRIES,
                              }]),
                            );
                            // Rejeição anterior: já estava na lista para revisão manual e não
                            // pode sumir junto com o estado do operador que sai.
                            localStorage.setItem(
                              STORAGE_KEYS.FAILED_ACTIONS,
                              JSON.stringify([{
                                id: 'acao-antiga',
                                type: 'update_job',
                                payload: { jobId: 'job-0', updates: { status: 'production' } },
                                createdAt: new Date().toISOString(),
                                retryCount: MAX_RETRIES,
                                failedAt: new Date().toISOString(),
                                reason: 'conflict',
                              }]),
                            );
                            const { result } = renderHook(() => useOfflineSync());
                            const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
                            type MockTable = {
                              update: ((...args: unknown[]) => unknown) & { mock: { calls: unknown[][] } };
                              then: { mockImplementation: (fn: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>) => void };
                            };
                            const jobsTable = supabase.from('jobs') as unknown as MockTable;
                            const quarantineKey = 'fastgravacoes_orphan_queue_operador-a';

                            act(() => {
                              authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
                            });
                            expect(result.current.pendingActionsCount).toBe(1);

                            let release: () => void = () => {};
                                                        jobsTable.then.mockImplementation((onFulfilled: (v: unknown) => unknown) =>
                                                          new Promise<{ data: unknown[]; error: { message: string } }>((resolve) => {
                                                            release = () => resolve({ data: [], error: { message: 'boom' } });
                                                          }).then(onFulfilled)
                                                        );
                                                        // O lote começa com o banco pendurado: a saída cai no
                                                        // meio dele, que é o estado em que as rejeições sumiam.
                                                        await act(async () => {
                                                          setOnline(true);
                                                        });
                                                        act(() => {
                                                          authCb('SIGNED_OUT', null);
                                                        });
                                                        // Deixa o efeito de persistência do estado zerado rodar: é ele
                                                        // que apaga a lista antiga do storage antes do fim do lote.
                                                        await act(async () => {
                                                          await Promise.resolve();
                                                        });
                                                        expect(localStorage.getItem(STORAGE_KEYS.FAILED_ACTIONS)).toBe('[]');
                                                        await act(async () => {
                                                          release();
                                                          await Promise.resolve();
                                                        });

                            await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));
                            const quarantined = JSON.parse(localStorage.getItem(quarantineKey) ?? '{}');
                            expect(quarantined.pending ?? []).toHaveLength(0);
                            // Exauriu as tentativas: a alteração nunca foi aplicada.
                            const failedIds = (quarantined.failed ?? []).map((f: { id: string }) => f.id);
                            expect(failedIds).toContain('acao-exausta');
                            expect(failedIds).toContain('acao-antiga');
                            expect(quarantined.failed).toHaveLength(2);
                            expect(quarantined.failed.find((f: { id: string }) => f.id === 'acao-exausta')).toMatchObject({ reason: 'exhausted' });
                          });

                          it('descarta a cópia guardada quando a fila ativa volta a ser gravada (etapa 232, thread nova 2)', async () => {
                            // Restauração em memória + storage cheio: a cópia antiga ficava e
                            // reenviaria no próximo login o que já foi sincronizado.
                            setOnline(false);
                            localStorage.setItem(
                              'fastgravacoes_orphan_queue_operador-a',
                              JSON.stringify({
                                pending: [{
                                  id: 'acao-1',
                                  type: 'update_job',
                                  payload: { jobId: 'job-1', updates: { status: 'production' } },
                                  createdAt: new Date().toISOString(),
                                  retryCount: 0,
                                }],
                                failed: [],
                                acknowledged: [],
                                savedAt: Date.now(),
                              }),
                            );
                            const { result } = renderHook(() => useOfflineSync());
                            const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;

                            const originalSetItem = Storage.prototype.setItem;
                            let refusals = 1;
                            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
                              this: Storage,
                              key: string,
                              value: string,
                            ) {
                              if (key === STORAGE_KEYS.PENDING_ACTIONS && refusals > 0) {
                                refusals--;
                                throw new Error('QuotaExceededError');
                              }
                              return originalSetItem.call(this, key, value);
                            });

                            try {
                              act(() => {
                                authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
                              });
                              await waitFor(() => expect(result.current.pendingActionsCount).toBe(1));
                              expect(localStorage.getItem('fastgravacoes_orphan_queue_operador-a')).toContain('acao-1');

                              await act(async () => {
                                setOnline(true);
                                await result.current.syncPendingActions();
                              });

                              await waitFor(() => expect(result.current.pendingActionsCount).toBe(0));
                              // A fila ativa foi gravada com sucesso: a cópia virou redundante.
                              expect(localStorage.getItem('fastgravacoes_orphan_queue_operador-a')).toBeNull();
                            } finally {
                              spy.mockRestore();
                            }
                          });

                          it('limpa cópias vencidas de outros operadores a cada evento de auth (etapa 232, thread nova 3)', async () => {
                            // O prazo não pode valer só quando o dono volta: até lá a cópia
                            // fica legível para quem tem acesso ao aparelho.
                            setOnline(false);
                            const expiredKey = 'fastgravacoes_orphan_queue_operador-vencido';
                            const validKey = 'fastgravacoes_orphan_queue_operador-b';
                            localStorage.setItem(expiredKey, JSON.stringify({
                              pending: [{ id: 'job-1' }],
                              failed: [],
                              acknowledged: [],
                              savedAt: Date.now() - QUARANTINE_TTL_MS - 1000,
                            }));
                            localStorage.setItem(validKey, JSON.stringify({
                              pending: [{ id: 'job-2' }],
                              failed: [],
                              acknowledged: [],
                              savedAt: Date.now(),
                            }));

                            const { result } = renderHook(() => useOfflineSync());
                            const authCb = (globalThis as unknown as { __offlineSyncAuthCb: (event: string, session?: { user?: { id?: string } } | null) => void }).__offlineSyncAuthCb;
                            expect(result.current.pendingActionsCount).toBe(0);

                            act(() => {
                              authCb('INITIAL_SESSION', { user: { id: 'operador-a' } });
                            });

                            expect(localStorage.getItem(expiredKey)).toBeNull();
                            expect(localStorage.getItem(validKey)).toContain('job-2');
                          });
});
