import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditEntryCard } from './AuditEntryCard';
import { auditRowFromDb, auditLogEntrySchema, type AuditLogEntry } from '@/lib/schemas/auditLog';

// Linha real de producao: trigger grava a transicao de status como UPDATE.
const transicao = {
  id: '5e1f97a3-c237-4a5f-8ef0-9cfa7d1277e1',
  entity_type: 'jobs',
  entity_id: 'c8b0bd55-b277-42d2-83b1-426e7f9f8763',
  action: 'UPDATE',
  actor_id: 'aa2878da-ee51-4e89-88b0-96f18406bb22',
  actor_email: 'e2e@promobrindes.com.br',
  old_data: { status: 'production' },
  new_data: { status: 'delayed' },
  changed_fields: null,
  hash: '261944a4a6f08b2801b05220f982af67',
  previous_hash: '1a566113daf43f45666ea2e1a20847bc',
  metadata: {},
  created_at: '2026-11-26T00:09:28.929943+00:00',
};

const entryFrom = (row: Record<string, unknown>): AuditLogEntry => {
  const parsed = auditLogEntrySchema.parse(auditRowFromDb(row));
  return parsed;
};

describe('AuditEntryCard', () => {
  it('mostra o novo status em UPDATE que trocou de status', () => {
    render(<AuditEntryCard entry={entryFrom(transicao)} />);
    expect(screen.getByText(/Alterado para/)).toBeTruthy();
    expect(screen.getByText('delayed')).toBeTruthy();
  });

  it('nao mostra transicao quando o status nao mudou', () => {
    render(<AuditEntryCard entry={entryFrom({ ...transicao, old_data: { status: 'delayed' } })} />);
    expect(screen.queryByText(/Alterado para/)).toBeNull();
  });

  it('nao mostra transicao em INSERT', () => {
    render(<AuditEntryCard entry={entryFrom({ ...transicao, action: 'INSERT', old_data: null })} />);
    expect(screen.queryByText(/Alterado para/)).toBeNull();
  });
});