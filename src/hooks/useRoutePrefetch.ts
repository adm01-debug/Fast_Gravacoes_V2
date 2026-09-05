import { useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { logger } from "@/lib/logger";

// Rotas críticas que devem ser prefetch
const CRITICAL_ROUTES = [
  { path: "/", module: () => import("@/pages/Index") },
  { path: "/efficiency", module: () => import("@/pages/EfficiencyDashboard") },
  { path: "/kanban", module: () => import("@/pages/KanbanBoard") },
  { path: "/operator", module: () => import("@/pages/OperatorView") },
  { path: "/kpis", module: () => import("@/pages/KPIDashboard") },
];

// Rotas relacionadas para prefetch baseado na rota atual
const RELATED_ROUTES: Record<string, Array<() => Promise<unknown>>> = {
  "/": [
    () => import("@/pages/EfficiencyDashboard"),
    () => import("@/pages/KanbanBoard"),
    () => import("@/pages/KPIDashboard"),
  ],
  "/efficiency": [
    () => import("@/pages/OEEDashboard"),
    () => import("@/pages/OperatorProductivityPage"),
  ],
  "/kanban": [
    () => import("@/pages/PendingQueue"),
    () => import("@/pages/NewJobPage"),
  ],
  "/operator": [
    () => import("@/pages/QRScannerPage"),
    () => import("@/pages/ShiftHandoverPage"),
  ],
  "/kpis": [
    () => import("@/pages/BIDashboard"),
    () => import("@/pages/ExecutiveDashboard"),
  ],
};

/**
 * Hook para prefetch de rotas críticas
 * - Carrega rotas principais após idle
 * - Carrega rotas relacionadas baseado na navegação
 */
export function useRoutePrefetch() {
  const location = useLocation();

  // Prefetch de rotas críticas após idle
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleCallback = window.requestIdleCallback(() => {
        CRITICAL_ROUTES.forEach(({ module }) => {
          module().catch((e) => logger.debug('Falha no prefetch de rota', e, 'useRoutePrefetch'));
        });
      }, { timeout: 3000 });

      return () => window.cancelIdleCallback(idleCallback);
    } else {
      // Fallback para navegadores sem requestIdleCallback
      const timeout = setTimeout(() => {
        CRITICAL_ROUTES.forEach(({ module }) => {
          module().catch((e) => logger.debug('Falha no prefetch de rota', e, 'useRoutePrefetch'));
        });
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, []);

  // Prefetch de rotas relacionadas à rota atual
  useEffect(() => {
    const relatedModules = RELATED_ROUTES[location.pathname];

    if (!relatedModules) return;

    if ("requestIdleCallback" in window) {
      const idleCallback = window.requestIdleCallback(() => {
        relatedModules.forEach((module) => {
          module().catch((e) => logger.debug('Falha no prefetch de rota', e, 'useRoutePrefetch'));
        });
      }, { timeout: 2000 });

      return () => window.cancelIdleCallback(idleCallback);
    } else {
      const timeout = setTimeout(() => {
        relatedModules.forEach((module) => {
          module().catch((e) => logger.debug('Falha no prefetch de rota', e, 'useRoutePrefetch'));
        });
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [location.pathname]);
}

/**
 * Hook para prefetch on hover/focus
 * Retorna função para prefetch manual de uma rota
 */
export function usePrefetchRoute() {
  const prefetch = useCallback((routePath: string) => {
    // Tenta encontrar em CRITICAL_ROUTES ou RELATED_ROUTES ou apenas tenta importar se for um padrão conhecido
    const route = CRITICAL_ROUTES.find(r => r.path === routePath);
    if (route) {
      route.module().catch((e) => logger.debug('Falha no prefetch de rota', e, 'useRoutePrefetch'));
      return;
    }

    // Prefetch dinâmico para rotas não listadas explicitamente mas que seguem o padrão de páginas
    if (routePath.startsWith('/')) {
      const pageName = routePath.slice(1).split('/')[0];
      if (pageName) {
        // Tenta inferir o nome do componente (ex: /kpis -> KPIDashboard)
        // Isso é limitado pelo bundler, então é melhor ter uma lista ou usar o que já está no AppRoutes
      }
    }
  }, []);

  return prefetch;
}
