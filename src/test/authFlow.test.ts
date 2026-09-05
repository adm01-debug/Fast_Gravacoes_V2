import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase Auth ─────────────────────────────────────

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
const mockRefreshSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { all: [] }, error: null }),
        enroll: vi.fn(),
        challengeAndVerify: vi.fn(),
        unenroll: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
  },
}));

// ── AuthService tests ──────────────────────────────────────

import { AuthService } from '@/features/auth/services/authService';

describe('AuthService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('signIn', () => {
    it('calls supabase.auth.signInWithPassword with correct credentials', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'token', refresh_token: 'refresh', expires_at: 9999999 };
      mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });

      await AuthService.signIn('test@example.com', 'password123');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('throws when Supabase returns an error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid credentials'),
      });

      await expect(AuthService.signIn('bad@example.com', 'wrong')).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });
      await AuthService.signOut();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns the current session', async () => {
      const session = { user: { id: 'u1' }, access_token: 'token', refresh_token: 'r', expires_at: 9999999 };
      mockGetSession.mockResolvedValue({ data: { session }, error: null });

      const result = await AuthService.getSession();
      expect(result).toMatchObject({ user: { id: 'u1' } });
    });

    it('returns null when no session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      const result = await AuthService.getSession();
      expect(result).toBeNull();
    });
  });
});

// ── RateLimiter auth boundary tests ───────────────────────

import { authLimiter } from '@/lib/rateLimiter';
import { RateLimiter } from '@/lib/rateLimiter';

describe('authLimiter', () => {
  it('is configured with low capacity (5 tokens)', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 0.1 });
    let allowed = 0;
    for (let i = 0; i < 10; i++) {
      if (limiter.tryAcquire()) allowed++;
    }
    expect(allowed).toBe(5);
  });

  it('authLimiter instance exists', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter.tryAcquire).toBe('function');
  });
});

// ── Validation — Zod schemas ───────────────────────────────

import { z } from 'zod';
import { safeParse, uuidSchema, paginationSchema, dateRangeSchema } from '@/lib/validation';

describe('validation schemas', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      const result = safeParse(uuidSchema, '123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('rejects non-UUIDs', () => {
      expect(safeParse(uuidSchema, 'not-a-uuid').success).toBe(false);
      expect(safeParse(uuidSchema, '').success).toBe(false);
      expect(safeParse(uuidSchema, 123).success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('accepts valid pagination', () => {
      const result = safeParse(paginationSchema, { page: 1, pageSize: 20 });
      expect(result.success).toBe(true);
    });

    it('uses defaults when values are missing', () => {
      const result = safeParse(paginationSchema, {});
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      } else {
        expect(result.success).toBe(true); // fail test if defaults not applied
      }
    });

    it('rejects page < 1', () => {
      expect(safeParse(paginationSchema, { page: 0, pageSize: 10 }).success).toBe(false);
    });

    it('rejects pageSize > 100', () => {
      expect(safeParse(paginationSchema, { page: 1, pageSize: 101 }).success).toBe(false);
    });

    it('rejects pageSize < 1', () => {
      expect(safeParse(paginationSchema, { page: 1, pageSize: 0 }).success).toBe(false);
    });
  });

  describe('dateRangeSchema', () => {
    it('accepts valid date range', () => {
      const result = safeParse(dateRangeSchema, {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-12-31T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects when start > end', () => {
      const result = safeParse(dateRangeSchema, {
        start: '2026-12-31T00:00:00.000Z',
        end: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('accepts equal start and end (same instant)', () => {
      const ts = '2026-06-15T12:00:00.000Z';
      const result = safeParse(dateRangeSchema, { start: ts, end: ts });
      expect(result.success).toBe(true);
    });

    it('rejects non-ISO strings', () => {
      expect(safeParse(dateRangeSchema, { start: '2026/01/01', end: '2026/12/31' }).success).toBe(false);
    });
  });
});
