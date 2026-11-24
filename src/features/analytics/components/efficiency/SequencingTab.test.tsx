import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SequencingTab } from './SequencingTab';
import type { SequencingSuggestion } from '@/features/jobs';

function makeSuggestion(overrides: Partial<SequencingSuggestion> = {}): SequencingSuggestion {
  return {
    id: 'sug-1',
    machineId: 'machine-a',
    date: '2026-12-01',
    machineName: 'Laser 01',
    machineCode: 'LZ01',
    techniqueId: 'tech-1',
    techniqueName: 'Bordado',
    currentSequence: [],
    optimizedSequence: [],
    estimatedSavings: 20,
    colorGroups: [{ color: 'vermelho', jobs: [], jobCount: 2 }],
    bottleneckRisk: 'low',
    totalMinutes: 60,
    currentChanges: 2,
    optimizedChanges: 1,
    totalQuantity: 100,
    aiPriorityScore: 1,
    setupComplexity: 'low',
    ...overrides,
  };
}

describe('SequencingTab', () => {
  it('identifica o dia da sugestao no cartao', () => {
    render(<SequencingTab suggestions={[makeSuggestion()]} />);

    expect(screen.getByText(/01\/12/)).toBeTruthy();
  });

  it('omite o dia quando a sugestao nao tem data', () => {
    render(<SequencingTab suggestions={[makeSuggestion({ date: undefined })]} />);

    expect(screen.queryByText(/\d{2}\/\d{2}/)).toBeNull();
  });

  it('envia a sugestao do cartao ao aplicar', () => {
    const onApply = vi.fn();
    const suggestion = makeSuggestion();
    render(<SequencingTab suggestions={[suggestion]} onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: /Aplicar Sequenciamento/i }));

    expect(onApply).toHaveBeenCalledWith(suggestion);
  });
});
