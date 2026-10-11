import * as Sentry from '@sentry/react';

// Mesma condição do init em main.tsx — sem DSN (ou fora de produção) o SDK
// não está inicializado e captureMessage viraria ruído no console.
const enabled = Boolean(import.meta.env.VITE_SENTRY_DSN) && import.meta.env.PROD;

export type NavBackVia = 'button' | 'swipe' | 'hotkey' | 'breadcrumb' | 'mobile-header';

export function trackNavBack(via: NavBackVia, to: 'history' | 'fallback') {
  if (!enabled) return;
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `nav.back via=${via} to=${to}`,
    level: 'info',
  });
}

export function trackNavEvent(name: string, data?: Record<string, string | number | boolean>) {
  if (!enabled) return;
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `${name}${data ? ' ' + JSON.stringify(data) : ''}`,
    level: 'info',
  });
}

export function trackDeepLinkExit(pathname: string) {
  if (!enabled) return;
  Sentry.captureMessage('nav.deeplink.fallback', {
    level: 'info',
    extra: { pathname },
  });
}
