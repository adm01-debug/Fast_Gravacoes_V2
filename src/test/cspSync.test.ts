import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// O comentario em index.html manda manter o `connect-src` em sincronia com o
// vercel.json "manualmente". Isso ja falhou uma vez: o Google Fonts estava
// liberado em style-src/font-src mas nao em connect-src, e o service worker
// (que refaz o pedido via fetch) era bloqueado. Este teste automatiza a regra.
const root = path.resolve(__dirname, '../..');

function directiveSources(csp: string, name: string): string[] {
  const directive = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  if (!directive) throw new Error(`${name} ausente na politica`);
  return directive.replace(name, '').trim().split(/\s+/).sort();
}

function connectSrc(csp: string): string[] {
  return directiveSources(csp, 'connect-src');
}

function scriptSrc(csp: string): string[] {
  return directiveSources(csp, 'script-src');
}

function policiesFromVercelJson(): { enforce: string } {
  const json = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  const all = json.headers.flatMap((h) => h.headers);
  const enforce = all.find((h) => h.key === 'Content-Security-Policy')?.value;
  if (!enforce) throw new Error('politica CSP enforce ausente no vercel.json');
  return { enforce };
}

function policyFromIndexHtml(): string {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  if (!match) throw new Error('meta CSP ausente no index.html');
  return match[1];
}

describe('CSP', () => {
  it('mantem o connect-src identico entre vercel.json e index.html', () => {
    const { enforce } = policiesFromVercelJson();
    const esperado = connectSrc(enforce);
    expect(connectSrc(policyFromIndexHtml())).toEqual(esperado);
  });

  it('mantem o script-src identico entre vercel.json e index.html', () => {
    const { enforce } = policiesFromVercelJson();
    const esperado = scriptSrc(enforce);
    expect(scriptSrc(policyFromIndexHtml())).toEqual(esperado);
  });

  it('libera o Google Fonts no connect-src (o service worker refaz o pedido via fetch)', () => {
    const { enforce } = policiesFromVercelJson();
    expect(connectSrc(enforce)).toEqual(
      expect.arrayContaining(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']),
    );
  });

  it('nao declara o header report-only (telemetria estabilizada em 48h)', () => {
    const json = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      headers: Array<{ headers: Array<{ key: string; value: string }> }>;
    };
    const all = json.headers.flatMap((h) => h.headers);
    expect(all.some((h) => h.key === 'Content-Security-Policy-Report-Only')).toBe(false);
  });
});
