// Env validation must precede every other import — see envGuard.ts.
import "@/lib/envGuard";
import { createRoot } from "react-dom/client";
import { onCLS, onFID, onLCP, onTTFB, onINP } from "web-vitals";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { logger } from "./lib/logger";

// Initialize i18n
import "./i18n";

// Import global providers
import { AccessibilityProvider } from "./components/accessibility/AccessibilityProvider";
import { OfflineProvider } from "./hooks/useLocalStorage";

// Sentry: initialize only when DSN is configured. Without init(),
// captureMessage/captureException são no-ops silenciosos.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const SENTRY_ENABLED = Boolean(SENTRY_DSN) && import.meta.env.PROD;

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: (import.meta.env.VITE_APP_ENV as string) || "production",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}

// Performance Monitoring (Web Vitals → Sentry apenas quando habilitado)
const sendToSentry = ({ name, delta, id, value }: { name: string; delta: number; id: string; value: number }) => {
  if (!SENTRY_ENABLED) return;
  Sentry.captureMessage(`Web Vital: ${name}`, {
    level: "info",
    extra: { delta, id, value },
    tags: { vital_name: name },
  });
};

onCLS(sendToSentry);
onFID(sendToSentry);
onLCP(sendToSentry);
onTTFB(sendToSentry);
onINP(sendToSentry);

// Register Service Worker for PWA / push notifications.
// The hooks in features/notifications/* aguardam `navigator.serviceWorker.ready`,
// portanto sem registro elas ficariam esperando indefinidamente.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        logger.warn('Service Worker registration failed', err, 'sw');
      });
  });
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <AccessibilityProvider>
    <OfflineProvider>
      <App />
    </OfflineProvider>
  </AccessibilityProvider>
);
