import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getValidTransitions,
  assertTransition,
} from './jobStateMachine';

describe('jobStateMachine', () => {
  describe('canTransition', () => {
    it('permite fluxo padrão: queue → scheduled → ready → production → finished', () => {
      expect(canTransition('queue', 'scheduled')).toBe(true);
      expect(canTransition('scheduled', 'ready')).toBe(true);
      expect(canTransition('ready', 'production')).toBe(true);
      expect(canTransition('production', 'finished')).toBe(true);
    });

    it('bloqueia transições ilegais críticas', () => {
      expect(canTransition('finished', 'queue')).toBe(false);
      expect(canTransition('finished', 'production')).toBe(false);
      expect(canTransition('queue', 'production')).toBe(false);
      expect(canTransition('queue', 'finished')).toBe(false);
      expect(canTransition('paused', 'finished')).toBe(false);
    });

    it('permite cancelamento a partir de qualquer estado não-terminal', () => {
      const nonTerminal = ['queue', 'scheduled', 'ready', 'production', 'paused', 'delayed', 'rework', 'buffer'] as const;
      for (const s of nonTerminal) {
        expect(canTransition(s, 'cancelled')).toBe(true);
      }
    });

    it('cancelled pode ser re-enfileirado (recuperação)', () => {
      expect(canTransition('cancelled', 'queue')).toBe(true);
      expect(canTransition('cancelled', 'production')).toBe(false);
    });

    it('finished só permite avançar para packaging (fluxo de embalagem)', () => {
      expect(getValidTransitions('finished')).toEqual(['packaging']);
      expect(canTransition('finished', 'packaging')).toBe(true);
    });

    it('packaging pode finalizar, retrabalhar ou cancelar', () => {
      expect(canTransition('packaging', 'finished')).toBe(true);
      expect(canTransition('packaging', 'rework')).toBe(true);
      expect(canTransition('packaging', 'cancelled')).toBe(true);
      expect(canTransition('packaging', 'queue')).toBe(false);
    });

    it('production pode pausar, atrasar, retrabalhar ou finalizar', () => {
      expect(canTransition('production', 'paused')).toBe(true);
      expect(canTransition('production', 'delayed')).toBe(true);
      expect(canTransition('production', 'rework')).toBe(true);
      expect(canTransition('production', 'finished')).toBe(true);
    });
  });

  describe('assertTransition', () => {
    it('não lança em transição válida', () => {
      expect(() => assertTransition('queue', 'scheduled')).not.toThrow();
    });

    it('lança mensagem clara em transição inválida', () => {
      expect(() => assertTransition('finished', 'queue')).toThrow(/Transição inválida/);
      expect(() => assertTransition('finished', 'queue')).toThrow(/packaging/);
    });

    it('mensagem lista transições válidas disponíveis', () => {
      expect(() => assertTransition('queue', 'production')).toThrow(/scheduled/);
    });
  });
});
