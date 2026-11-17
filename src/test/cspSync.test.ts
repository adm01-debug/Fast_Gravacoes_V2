import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// O comentario em index.html manda manter o `connect-src` em sincronia com o
// vercel.json "manualmente". Isso ja falhou uma vez: o Google Fonts estava
// liberado em style-src/font-src mas nao em connect-src, e o service worker
// (que refaz o pedido via fetch) era bloqueado. Este teste automatiza a regra.
const root = path.resolve(__dirname, '../..');

function connectSrc(csp: string): string[] {
  const directive = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src'));
  if (!directive) throw new Error('connect-src ausente na politica');
  return directive.replace('connect-src', '').trim().split(/\s+/).sort();
}

function policiesFromVercelJson(): { enforce: string; reportOnly: string } {
  const json = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  const all = json.headers.flatMap((h) => h.headers);
  const enforce = all.find((h) => h.key === 'Content-Security-Policy')?.value;
  const reportOnly = all.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value;
  if (!enforce || !reportOnly) throw new Error('politicas CSP ausentes no vercel.json');
  return { enforce, reportOnly };
}

function policyFromIndexHtml(): string {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  if (!match) throw new Error('meta CSP ausente no index.html');
  return match[1];
}

describe('CSP', () => {
  it('mantem o connect-src identico nas tres politicas', () => {
    const { enforce, reportOnly } = policiesFromVercelJson();
    const esperado = connectSrc(enforce);
    expect(connectSrc(reportOnly)).toEqual(esperado);
    expect(connectSrc(policyFromIndexHtml())).toEqual(esperado);
  });

  it('libera o Google Fonts no connect-src (o service worker refaz o pedido via fetch)', () => {
    const { enforce } = policiesFromVercelJson();
    expect(connectSrc(enforce)).toEqual(
      expect.arrayContaining(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']),
    );
  });

  it('nao declara upgrade-insecure-requests na politica report-only, onde o browser a ignora', () => {
    const { reportOnly } = policiesFromVercelJson();
    expect(reportOnly).not.toContain('upgrade-insecure-requests');
  });
});
