import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getValidTransitions,
  assertTransition,
} from '@/features/jobs/services/jobStateMachine';
import type { JobStatus } from '@/features/jobs/services/jobsService';

// ── canTransition ─────────────────────────────────────────────

describe('canTransition', () => {
  describe('queue', () => {
    it('allows queue → scheduled', () => expect(canTransition('queue', 'scheduled')).toBe(true));
    it('allows queue → ready', () => expect(canTransition('queue', 'ready')).toBe(true));
    it('allows queue → cancelled', () => expect(canTransition('queue', 'cancelled')).toBe(true));
    it('blocks queue → production (skip step)', () => expect(canTransition('queue', 'production')).toBe(false));
    it('blocks queue → finished', () => expect(canTransition('queue', 'finished')).toBe(false));
    it('blocks queue → queue (self)', () => expect(canTransition('queue', 'queue')).toBe(false));
  });

  describe('scheduled', () => {
    it('allows scheduled → ready', () => expect(canTransition('scheduled', 'ready')).toBe(true));
    it('allows scheduled → production', () => expect(canTransition('scheduled', 'production')).toBe(true));
    it('allows scheduled → queue (back)', () => expect(canTransition('scheduled', 'queue')).toBe(true));
    it('allows scheduled → cancelled', () => expect(canTransition('scheduled', 'cancelled')).toBe(true));
    it('blocks scheduled → finished', () => expect(canTransition('scheduled', 'finished')).toBe(false));
  });

  describe('ready', () => {
    it('allows ready → production', () => expect(canTransition('ready', 'production')).toBe(true));
    it('allows ready → scheduled', () => expect(canTransition('ready', 'scheduled')).toBe(true));
    it('allows ready → queue (back)', () => expect(canTransition('ready', 'queue')).toBe(true));
    it('allows ready → cancelled', () => expect(canTransition('ready', 'cancelled')).toBe(true));
    it('blocks ready → finished', () => expect(canTransition('ready', 'finished')).toBe(false));
  });

  describe('production', () => {
    it('allows production → paused', () => expect(canTransition('production', 'paused')).toBe(true));
    it('allows production → delayed', () => expect(canTransition('production', 'delayed')).toBe(true));
    it('allows production → finished', () => expect(canTransition('production', 'finished')).toBe(true));
    it('allows production → rework', () => expect(canTransition('production', 'rework')).toBe(true));
    it('allows production → cancelled', () => expect(canTransition('production', 'cancelled')).toBe(true));
    it('blocks production → queue', () => expect(canTransition('production', 'queue')).toBe(false));
    it('blocks production → ready', () => expect(canTransition('production', 'ready')).toBe(false));
  });

  describe('paused', () => {
    it('allows paused → production (resume)', () => expect(canTransition('paused', 'production')).toBe(true));
    it('allows paused → cancelled', () => expect(canTransition('paused', 'cancelled')).toBe(true));
    it('blocks paused → finished', () => expect(canTransition('paused', 'finished')).toBe(false));
    it('blocks paused → ready', () => expect(canTransition('paused', 'ready')).toBe(false));
  });

  describe('delayed', () => {
    it('allows delayed → production', () => expect(canTransition('delayed', 'production')).toBe(true));
    it('allows delayed → cancelled', () => expect(canTransition('delayed', 'cancelled')).toBe(true));
    it('blocks delayed → finished', () => expect(canTransition('delayed', 'finished')).toBe(false));
    it('blocks delayed → queue', () => expect(canTransition('delayed', 'queue')).toBe(false));
  });

  describe('rework', () => {
    it('allows rework → production', () => expect(canTransition('rework', 'production')).toBe(true));
    it('allows rework → finished', () => expect(canTransition('rework', 'finished')).toBe(true));
    it('allows rework → cancelled', () => expect(canTransition('rework', 'cancelled')).toBe(true));
    it('blocks rework → queue', () => expect(canTransition('rework', 'queue')).toBe(false));
  });

  describe('buffer', () => {
    it('allows buffer → ready', () => expect(canTransition('buffer', 'ready')).toBe(true));
    it('allows buffer → scheduled', () => expect(canTransition('buffer', 'scheduled')).toBe(true));
    it('allows buffer → cancelled', () => expect(canTransition('buffer', 'cancelled')).toBe(true));
    it('blocks buffer → production', () => expect(canTransition('buffer', 'production')).toBe(false));
    it('blocks buffer → finished', () => expect(canTransition('buffer', 'finished')).toBe(false));
  });

  describe('finished (post-production: only auto-packaging follows)', () => {
    it('allows finished → packaging (auto)', () => expect(canTransition('finished', 'packaging')).toBe(true));
    it('blocks finished → queue', () => expect(canTransition('finished', 'queue')).toBe(false));
    it('blocks finished → production', () => expect(canTransition('finished', 'production')).toBe(false));
    it('blocks finished → cancelled', () => expect(canTransition('finished', 'cancelled')).toBe(false));
    it('blocks finished → finished (self)', () => expect(canTransition('finished', 'finished')).toBe(false));
  });

  describe('cancelled', () => {
    it('allows cancelled → queue (re-queue)', () => expect(canTransition('cancelled', 'queue')).toBe(true));
    it('blocks cancelled → production', () => expect(canTransition('cancelled', 'production')).toBe(false));
    it('blocks cancelled → finished', () => expect(canTransition('cancelled', 'finished')).toBe(false));
  });
});

// ── getValidTransitions ────────────────────────────────────────

describe('getValidTransitions', () => {
  it('returns valid targets for queue', () => {
    const targets = getValidTransitions('queue');
    expect(targets).toContain('scheduled');
    expect(targets).toContain('ready');
    expect(targets).toContain('cancelled');
    expect(targets).not.toContain('production');
    expect(targets).not.toContain('finished');
  });

  it('returns only packaging for finished (post-production step)', () => {
    expect(getValidTransitions('finished')).toEqual(['packaging']);
  });

  it('returns only queue for cancelled', () => {
    const targets = getValidTransitions('cancelled');
    expect(targets).toEqual(['queue']);
  });

  it('returns production and cancelled for paused', () => {
    const targets = getValidTransitions('paused');
    expect(targets).toContain('production');
    expect(targets).toContain('cancelled');
    expect(targets).toHaveLength(2);
  });
});

// ── assertTransition ───────────────────────────────────────────

describe('assertTransition', () => {
  it('does not throw for valid transition', () => {
    expect(() => assertTransition('queue', 'ready')).not.toThrow();
    expect(() => assertTransition('production', 'finished')).not.toThrow();
    expect(() => assertTransition('cancelled', 'queue')).not.toThrow();
  });

  it('throws for invalid transition with descriptive message', () => {
    expect(() => assertTransition('finished', 'queue')).toThrow('Transição inválida');
    expect(() => assertTransition('finished', 'queue')).toThrow('"finished" → "queue"');
  });

  it('throws for finished → production and lists packaging as the only valid target', () => {
    expect(() => assertTransition('finished', 'production')).toThrow(
      'Transições válidas: packaging'
    );
  });

  it('falls back to "estado terminal" wording for a status with no mapped transitions', () => {
    // No JobStatus in the current schema is fully terminal anymore (`finished`
    // now transitions to `packaging`), so this exercises the defensive
    // fallback in assertTransition's message for a status absent from the map.
    expect(() => assertTransition('unknown' as JobStatus, 'production')).toThrow(
      'nenhuma (estado terminal)'
    );
  });

  it('throws for self-transition on queue', () => {
    expect(() => assertTransition('queue', 'queue')).toThrow('Transição inválida');
  });

  it('lists valid transitions in the error message', () => {
    let thrown = '';
    try { assertTransition('queue', 'production'); } catch (e) { thrown = (e as Error).message; }
    // queue can go to scheduled, ready, cancelled — those should appear in the message
    expect(thrown).toContain('scheduled');
    expect(thrown).toContain('ready');
    expect(thrown).toContain('cancelled');
  });
});
