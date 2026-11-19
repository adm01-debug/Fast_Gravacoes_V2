/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * Use at trust boundaries: user inputs, URL params, dynamic content.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const ESCAPE_RE = /[&<>"'/`]/g;

/** Escape HTML special characters to prevent XSS in rendered content. */
export function escapeHtml(input: string): string {
  return input.replace(ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char] || char);
}

/** Strip all HTML tags from a string. */
export function stripTags(input: string): string {
  if (!input.includes('<')) return input;

  let out = '';
  let i = 0;
  const n = input.length;
  while (i < n) {
    const char = input[i];
    if (char === '<') {
      // A tag spans from '<' to the next '>'. If there is no closing '>',
      // keep the '<' and continue (prevents stripping standalone '<').
      const close = input.indexOf('>', i + 1);
      if (close !== -1) {
        i = close + 1;
        continue;
      }
    }
    out += char;
    i++;
  }
  return out;
}

/** Sanitize a string for safe display: strip tags + escape remaining chars. */
export function sanitizeText(input: string): string {
  return escapeHtml(stripTags(input));
}

/**
 * Sanitize a URL to prevent javascript: and data: protocol attacks.
 * Returns the URL if safe, or an empty string if dangerous.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return '';
  }

  // Allow http, https, mailto, tel, and relative URLs
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('/') ||
    lower.startsWith('#') ||
    lower.startsWith('.')
  ) {
    return trimmed;
  }

  // Block everything else
  return '';
}

/** Remove null bytes and control characters (except newlines and tabs). */
export function sanitizeControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Full sanitization pipeline for user text input.
 * Removes control chars, strips tags, escapes HTML.
 */
export function sanitizeInput(input: string): string {
  return sanitizeText(sanitizeControlChars(input));
}
