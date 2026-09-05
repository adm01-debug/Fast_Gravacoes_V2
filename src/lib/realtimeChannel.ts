import { useEffect } from 'react';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  RealtimePresenceState,
} from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type PgRow = Record<string, unknown>;
export type RealtimeChangePayload = RealtimePostgresChangesPayload<PgRow>;
export type RealtimeListener = (payload: RealtimeChangePayload) => void;

export interface PgBindSpec {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table?: string;
  filter?: string;
}

interface Entry {
  channel: RealtimeChannel;
  refCount: number;
  listeners: Set<RealtimeListener>;
}

const registry = new Map<string, Entry>();

function buildAndSubscribe(name: string, specs: PgBindSpec[], fanout: (p: RealtimeChangePayload) => void): Entry {
  let ch = supabase.channel(name);
  for (const spec of specs) {
    ch = ch.on(
      'postgres_changes',
      {
        event: spec.event ?? '*',
        schema: spec.schema ?? 'public',
        ...(spec.table ? { table: spec.table } : {}),
        ...(spec.filter ? { filter: spec.filter } : {}),
      },
      fanout,
    );
  }
  const subscribed = ch.subscribe();
  const entry: Entry = { channel: subscribed, refCount: 0, listeners: new Set() };
  registry.set(name, entry);
  return entry;
}

function ensure(
  name: string,
  specs: PgBindSpec[],
): Entry {
  const existing = registry.get(name);
  if (existing) return existing;
  return buildAndSubscribe(name, specs, (payload) => {
    const entry = registry.get(name);
    entry?.listeners.forEach((fn) => fn(payload));
  });
}

function drop(name: string) {
  const entry = registry.get(name);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.listeners.clear();
    supabase.removeChannel(entry.channel);
    registry.delete(name);
  }
}

export function useRealtimeChannel(
  name: string | (() => string),
  specs: PgBindSpec[],
  onChange: RealtimeListener,
) {
  useEffect(() => {
    const resolvedName = typeof name === 'function' ? name() : name;
    const entry = ensure(resolvedName, specs);
    entry.refCount += 1;
    entry.listeners.add(onChange);
    return () => {
      entry.listeners.delete(onChange);
      drop(resolvedName);
    };
  }, [typeof name === 'function' ? name : name]);
}

export function __resetRealtimeRegistryForTests() {
  for (const entry of registry.values()) {
    supabase.removeChannel(entry.channel);
  }
  registry.clear();
}

// ============================================
// PRESENCE CHANNELS (shared singleton)
// ============================================
//
// Same rationale as useRealtimeChannel: multiple consumers + StrictMode
// double-mount should share one channel instead of triggering
// "cannot add `presence` callbacks after `subscribe()`".

type PresenceListener = (state: RealtimePresenceState<Record<string, unknown>>) => void;
type PresenceJoinListener = (newPresences: unknown[]) => void;
type PresenceLeaveListener = (leftPresences: unknown[]) => void;

interface PresenceEntry {
  channel: RealtimeChannel;
  refCount: number;
  syncListeners: Set<PresenceListener>;
  joinListeners: Set<PresenceJoinListener>;
  leaveListeners: Set<PresenceLeaveListener>;
}

const presenceRegistry = new Map<string, PresenceEntry>();

function buildPresenceAndSubscribe(name: string): PresenceEntry {
  const entry: PresenceEntry = {
    channel: undefined as unknown as RealtimeChannel,
    refCount: 0,
    syncListeners: new Set(),
    joinListeners: new Set(),
    leaveListeners: new Set(),
  };
  // All presence callbacks are attached BEFORE subscribe() to satisfy
  // the Supabase client validation. Fanout to the listener sets at runtime.
  const ch = supabase.channel(name)
    .on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as RealtimePresenceState<Record<string, unknown>>;
      entry.syncListeners.forEach((fn) => fn(state));
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      entry.joinListeners.forEach((fn) => fn(newPresences as unknown[]));
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      entry.leaveListeners.forEach((fn) => fn(leftPresences as unknown[]));
    })
    .subscribe();
  entry.channel = ch;
  presenceRegistry.set(name, entry);
  return entry;
}

function ensurePresence(name: string): PresenceEntry {
  const existing = presenceRegistry.get(name);
  if (existing) return existing;
  return buildPresenceAndSubscribe(name);
}

function dropPresence(name: string) {
  const entry = presenceRegistry.get(name);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.syncListeners.clear();
    entry.joinListeners.clear();
    entry.leaveListeners.clear();
    supabase.removeChannel(entry.channel);
    presenceRegistry.delete(name);
  }
}

/**
 * Subscribes to the shared presence channel for `name`. All three listener
 * types are optional; only join/leave are forwarded if provided.
 *
 * Returns the underlying channel so callers can call `.track()`. The
 * reference becomes stable on the second render onward — first render
 * returns null while the singleton is being initialised.
 */
export function usePresenceChannel(
  name: string,
  onSync?: PresenceListener,
  onJoin?: PresenceJoinListener,
  onLeave?: PresenceLeaveListener,
): RealtimeChannel | null {
  // Effect for sync listeners (runs every render where onSync ref changes)
  useEffect(() => {
    if (!onSync) return;
    const entry = ensurePresence(name);
    entry.refCount += 1;
    entry.syncListeners.add(onSync);
    return () => {
      entry.syncListeners.delete(onSync);
      dropPresence(name);
    };
  }, [name, onSync]);

  useEffect(() => {
    if (!onJoin) return;
    const entry = ensurePresence(name);
    entry.refCount += 1;
    entry.joinListeners.add(onJoin);
    return () => {
      entry.joinListeners.delete(onJoin);
      dropPresence(name);
    };
  }, [name, onJoin]);

  useEffect(() => {
    if (!onLeave) return;
    const entry = ensurePresence(name);
    entry.refCount += 1;
    entry.leaveListeners.add(onLeave);
    return () => {
      entry.leaveListeners.delete(onLeave);
      dropPresence(name);
    };
  }, [name, onLeave]);

  return presenceRegistry.get(name)?.channel ?? null;
}
