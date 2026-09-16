# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**FAST GRAVAÇÕES ES v2** is a production-management SPA for an industrial engraving/personalization business (52 machines, 16 techniques). It is a Vite + React 18 + TypeScript front end backed by Supabase (PostgreSQL + RLS + Deno Edge Functions), originally scaffolded/hosted on the Lovable platform. The UI is in Brazilian Portuguese.

The app is large: 50+ lazy-loaded pages, a deeply nested provider tree, ~30 Supabase Edge Functions, and 100+ SQL migrations. `ANALISE_TECNICA_SISTEMA.md` is a Portuguese technical audit documenting known issues (permissive RLS `USING true`, CORS wildcards, hardcoded webhook URLs, low test coverage) — consult it before assuming current behavior is intentional.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:8090
npm run build          # Production build
npm run build:dev      # Build in development mode
npm run preview        # Serve the production build (port 8090; used by e2e)
npm run lint           # ESLint over the repo

npm run test           # Vitest unit tests (single run)
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with v8 coverage
npm run test:e2e       # Playwright e2e (auto-runs `npm run preview` as webServer)
npm run ci             # build + e2e
```

Run a single unit test file or test:
```bash
npx vitest run src/test/validation.test.ts
npx vitest run -t "name of the test"
```

Run a single Playwright spec / project:
```bash
npx playwright test tests/e2e/auth.spec.ts
npx playwright test --project=chromium        # or --project=mobile-chrome
```

Package manager: both `bun.lockb`/`bun.lock` and `package-lock.json` are committed. npm scripts work; `bun install` also works. Pick one and stay consistent.

## Test layout

- **Unit/integration (Vitest, jsdom):** colocated `*.test.ts(x)` next to source, plus `src/test/*.test.ts`. Setup is `src/test/setup.ts`. Vitest excludes `tests/e2e/**` and `supabase/functions/**`. Coverage thresholds are intentionally low (lines/statements 15%, functions/branches 10%).
- **E2E (Playwright):** `tests/e2e/*.spec.ts`, baseURL `http://localhost:8090`, projects `chromium` and `mobile-chrome`, includes accessibility (`@axe-core/playwright`) and visual-regression specs.

## Architecture

### Composition entry chain
`main.tsx` → `App.tsx` → `AppProviders` → `AnimatedRoutes`.

- `src/main.tsx` wires global concerns *outside* React Router: i18n init, Sentry + `web-vitals` reporting, `AccessibilityProvider`, and `OfflineProvider`.
- `src/App.tsx` mounts `GlobalErrorBoundary`, the toasters, offline/network status, routes, and the push-notification prompt.
- `src/providers/AppProviders.tsx` is the single source of truth for the **provider tree** (~25 nested context providers). Ordering matters — e.g. `AuthProvider` must wrap `PermissionsProvider`, which wraps offline/network/websocket/notification providers. Add new global context here, in the correct position. It also mounts an `Observers` block (`NavigationListener`, notification/alert watchers) that run side effects app-wide.
- React Query client comes from `src/lib/queryConfig.ts` (`createQueryClient`).

### Routing
`src/routes/AppRoutes.tsx` defines all routes. Every page is `React.lazy`-imported and rendered through either `ProtectedPage` (wraps `ProtectedRoute` for RBAC + `PageTransition` + `Suspense` skeleton) or `PublicPage`. When adding a page: create it in `src/pages/`, lazy-import it here, and choose an appropriate loading skeleton from `@/components/loading` and `allowedRoles` (`AppRole`).

### Feature modules vs. shared layers
There are two parallel organizational schemes — respect the existing one when extending:

- `src/features/<domain>/` — self-contained domains (`auth`, `jobs`, `inventory`, `production`, `maintenance`, `analytics`, `notifications`, `admin`) with their own `components/`, `hooks/`, `services/`, `types/`, and a barrel `index.ts`. Import features through their barrel (e.g. `@/features/auth`), not deep paths. Auth, RBAC, MFA, and session management all live in `src/features/auth`.
- `src/components/<area>/` — large catalog of UI grouped by domain area; `src/components/ui/` is the shadcn/ui primitive layer (configured via `components.json`, alias `@/components/ui`).
- `src/hooks/`, `src/contexts/`, `src/services/`, `src/lib/`, `src/schemas/`, `src/types/` — cross-cutting shared layers.

### Backend integration
- `src/integrations/supabase/client.ts` exports the typed `supabase` client (`import { supabase } from "@/integrations/supabase/client"`). **This file is auto-generated — do not hand-edit.** Its custom `global.fetch` instruments PostgREST/RPC calls for latency + error telemetry via `@/lib/logger`. `src/integrations/supabase/types.ts` is the generated `Database` type.
- `supabase/functions/<name>/` are Deno Edge Functions (ERP API, Bitrix24 sync, ML predictions, PDF/Excel generation, push/email, security/login checks, cron jobs, etc.); shared helpers live in `supabase/functions/_shared`.
- `supabase/migrations/` holds the SQL schema history.

### Cross-cutting infrastructure in `src/lib`
Reusable resilience/IO utilities tested in `src/test/`: `circuitBreaker.ts`, `rateLimiter.ts`, `retryWithBackoff.ts`, `sanitize.ts`, `validation.ts`, `errorHandling.ts`, `offlineStorage.ts` (offline-first sync), plus export helpers (`pdfExport`, `excelExport`, `*Export.ts`) and `logger.ts`. The app is offline-capable (PWA via `vite-plugin-pwa`, `OfflineProvider` + `OfflineSyncContext`).

## Conventions

- **Path alias:** `@/` → `src/` (configured in `vite.config.ts`, `vitest.config.ts`, and tsconfig `paths`). Always use `@/...` imports.
- **Validation:** Zod schemas (`src/schemas`, `src/lib/schemas`, per-feature `*.schema.ts`) with `react-hook-form` + `@hookform/resolvers`.
- **Server state:** TanStack React Query. **Client/global state:** React Context (in `src/contexts`) and Zustand where used.
- **Styling:** Tailwind (`tailwind.config.ts`) + shadcn/ui; default theme is **dark** (`next-themes`, `defaultTheme="dark"`). Use `cn()` from `@/lib/utils` for class merging.
- **i18n:** `i18next` / `react-i18next`, locales in `src/i18n/locales`. User-facing strings are Portuguese.
- **TypeScript:** strict-ish (`noImplicitAny`, `strictNullChecks`, `noUnusedLocals/Parameters` on). Note ESLint downgrades many rules to warnings for this large pre-existing codebase, but keeps `react-hooks/rules-of-hooks` and `no-debugger` as errors.
- **Monitoring:** Sentry is initialized in `main.tsx`; Web Vitals are forwarded to Sentry.

## Graphify — architecture evidence

Use `npm run graph:doctor` to validate tooling, `npm run graph:build` to generate
the structural graph, and `npm run graph:check` to check freshness and integrity.
Before cross-file architecture changes, query with `npm run graph:query --
"actualSymbol actualModule" --budget 1500`; verify cited source lines before editing.
Use `graph:affected`, `graph:path` or `graph:explain` for focused investigation.
After source changes run `graph:build` again (cached AST, full reconstruction).
For smaller scopes append `--profile security|frontend|backend` to both build and query.

Read `graphify-out/health.json` and `GRAPH_REPORT.md` before interpreting missing
edges as dead code. The current upstream projection collapses some parallel edges;
`extraction.json` retains raw evidence. SQL extraction describes versioned history,
not the deployed schema or effective RLS. No graph metric certifies runtime security.
Graph artifacts and the Python environment are local/ignored, never Vite assets.
Do not install native hooks over Husky automatically. See `docs/graphify/README.md`
and `docs/plano-graphify-50-etapas.md` for limits and the rollout plan.

## Git hooks (Husky)

Husky is configured: `pre-commit` runs `lint-staged`; `commit-msg` runs `commitlint`. Follow Conventional Commits or the commit-msg hook will reject the message.

## Environment

Vite env vars (prefixed `VITE_`). Required: `VITE_SUPABASE_URL` and the Supabase publishable/anon key. **Note a known inconsistency:** `client.ts` reads `VITE_SUPABASE_PUBLISHABLE_KEY` while `.env.example` documents `VITE_SUPABASE_ANON_KEY` — set the variable the client actually reads. Other integrations (`.env.example`): `VITE_BITRIX_WEBHOOK_URL`, Resend, Twilio, Sentry DSN, Google keys. Per-environment files exist (`.env.production`, `.env.staging`). Never commit real secrets.
