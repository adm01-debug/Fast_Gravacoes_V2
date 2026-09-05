/**
 * Escapes a value for safe interpolation into HTML email bodies. Values
 * sourced from the database (alert messages, machine names, user-entered
 * text) must never be interpolated raw into HTML — an attacker-controlled
 * string like `<img src=x onerror=...>` would otherwise execute in the
 * recipient's mail client.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
