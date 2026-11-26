import { describe, it, expect } from 'vitest';
import { auditLogEntrySchema, auditRowFromDb } from './auditLog';

// Linha como o PostgREST devolve de public.audit_log (colunas reais: old_data /
// new_data). Copiada de um registro de producao.
const linhaDoBanco = {
  id: '5e1f97a3-c237-4a5f-8ef0-9cfa7d1277e1',
  entity_type: 'jobs',
  entity_id: 'c8b0bd55-b277-42d2-83b1-426e7f9f8763',
  action: 'INSERT',
  actor_id: 'aa2878da-ee51-4e89-88b0-96f18406bb22',
  actor_email: 'e2e@promobrindes.com.br',
  old_data: null,
  new_data: { id: 'c8b0bd55-b277-42d2-83b1-426e7f9f8763', status: 'queue', quantity: 1000 },
  changed_fields: null,
  hash: '261944a4a6f08b2801b05220f982af67',
  previous_hash: '1a566113daf43f45666ea2e1a20847bc',
  metadata: {},
  created_at: '2026-11-26T00:09:28.929943+00:00',
};

describe('auditLogEntrySchema', () => {
  it('descarta a linha crua do banco (old_data/new_data) — era a causa da trilha vazia', () => {
    expect(auditLogEntrySchema.safeParse(linhaDoBanco).success).toBe(false);
  });

  it('aceita a linha apos a troca de colunas e expoe os dados em new_values', () => {
    const result = auditLogEntrySchema.safeParse(auditRowFromDb(linhaDoBanco));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.new_values).toEqual(linhaDoBanco.new_data);
    expect(result.data.old_values).toBeNull();
  });

  it('aceita registro historico sem hash (41 linhas em producao)', () => {
    const semHash = { ...linhaDoBanco, hash: null };
    expect(auditLogEntrySchema.safeParse(auditRowFromDb(semHash)).success).toBe(true);
  });

  it('nao sobrescreve old_values/new_values quando ja vieram normalizados', () => {
    const normalizado = { ...linhaDoBanco, old_values: { a: 1 }, new_values: { b: 2 } };
    const result = auditLogEntrySchema.safeParse(auditRowFromDb(normalizado));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.old_values).toEqual({ a: 1 });
    expect(result.data.new_values).toEqual({ b: 2 });
  });
});