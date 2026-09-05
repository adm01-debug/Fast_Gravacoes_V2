import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── IndexedDB mock ─────────────────────────────────────────
// jsdom doesn't ship IndexedDB, so we provide a minimal in-memory shim.

const store: Record<string, unknown> = {};

const mockIDB = {
  open: vi.fn(() => {
    const request = {
      result: {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn((val: unknown, key: string) => { store[key] = val; return { onsuccess: null }; }),
            put: vi.fn((val: unknown, key: string) => { store[key] = val; return { onsuccess: null }; }),
            get: vi.fn((key: string) => {
              const r = { result: store[key], onsuccess: null as null | ((e: unknown) => void) };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            }),
            delete: vi.fn((key: string) => { delete store[key]; return { onsuccess: null }; }),
            getAll: vi.fn(() => {
              const r = { result: Object.values(store), onsuccess: null as null | ((e: unknown) => void) };
              setTimeout(() => r.onsuccess?.({ target: r }), 0);
              return r;
            }),
            clear: vi.fn(() => {
              Object.keys(store).forEach(k => delete store[k]);
              return { onsuccess: null };
            }),
          })),
        })),
        objectStoreNames: { contains: vi.fn(() => true) },
        createObjectStore: vi.fn(),
      },
      onupgradeneeded: null as null | ((e: unknown) => void),
      onsuccess: null as null | ((e: unknown) => void),
      onerror: null as null | ((e: unknown) => void),
    };
    setTimeout(() => request.onsuccess?.({ target: request }), 0);
    return request;
  }),
};

Object.defineProperty(globalThis, 'indexedDB', { value: mockIDB, writable: true });

// ── Tests for sanitize (re-confirming edge cases) ──────────

import { sanitizeUrl, sanitizeInput, escapeHtml, stripTags, sanitizeControlChars } from '@/lib/sanitize';

describe('sanitize - additional edge cases', () => {
  describe('sanitizeUrl', () => {
    it('allows https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('allows http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('allows relative URLs', () => {
      expect(sanitizeUrl('/jobs/123')).toBe('/jobs/123');
      expect(sanitizeUrl('./relative')).toBe('./relative');
      expect(sanitizeUrl('#anchor')).toBe('#anchor');
    });

    it('allows mailto and tel', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(sanitizeUrl('tel:+5511999999999')).toBe('tel:+5511999999999');
    });

    it('blocks javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
      expect(sanitizeUrl('  javascript:void(0)')).toBe('');
    });

    it('blocks data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl('DATA:text/plain,test')).toBe('');
    });

    it('blocks vbscript:', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
    });

    it('blocks unknown protocols', () => {
      expect(sanitizeUrl('ftp://server/file')).toBe('');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });
  });

  describe('escapeHtml', () => {
    it('escapes all special HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).not.toContain('<');
      expect(escapeHtml('<script>alert("xss")</script>')).not.toContain('>');
      expect(escapeHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
    });

    it('escapes ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapes quotes', () => {
      expect(escapeHtml('"hello"')).toContain('&quot;');
      expect(escapeHtml("'hello'")).toContain('&#x27;');
    });

    it('does not modify clean strings', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('stripTags', () => {
    it('removes HTML tags', () => {
      expect(stripTags('<p>Hello</p>')).toBe('Hello');
      expect(stripTags('<b>bold</b> text')).toBe('bold text');
    });

    it('handles nested tags', () => {
      expect(stripTags('<div><p>test</p></div>')).toBe('test');
    });

    it('handles self-closing tags', () => {
      expect(stripTags('Hello<br/>World')).toBe('HelloWorld');
    });

    it('passes through plain text unchanged', () => {
      expect(stripTags('plain text')).toBe('plain text');
    });
  });

  describe('sanitizeControlChars', () => {
    it('removes null bytes', () => {
      expect(sanitizeControlChars('hello\x00world')).toBe('helloworld');
    });

    it('removes control characters except tab and newline', () => {
      expect(sanitizeControlChars('a\x01b\x08c')).toBe('abc');
      expect(sanitizeControlChars('a\x7fb')).toBe('ab');
    });

    it('preserves tab and newline', () => {
      expect(sanitizeControlChars('a\tb\nc')).toBe('a\tb\nc');
    });

    it('passes through clean strings', () => {
      expect(sanitizeControlChars('Normal text 123')).toBe('Normal text 123');
    });
  });

  describe('sanitizeInput', () => {
    it('strips tags and escapes HTML entities', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('removes control characters', () => {
      const result = sanitizeInput('hello\x00world');
      expect(result).toBe('helloworld');
    });

    it('handles empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });
});
