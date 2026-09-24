import { ReactNode, type ComponentType } from "react";
import { HelmetProvider } from "react-helmet-async";
import { ProviderComposer } from "./ProviderComposer";
import { ThemeProvider } from "next-themes";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth";
import { ReauthProvider } from "@/contexts/ReauthContext";
import { EfficiencyNotificationProvider } from "@/features/notifications/components/EfficiencyNotificationProvider";
import { RealtimeNotificationsProvider } from "@/features/notifications/components/RealtimeNotificationsProvider";
import { OfflineSyncProvider } from "@/contexts/OfflineSyncContext";
import { ProductDesignProvider } from "@/components/design-system/ProductDesignProvider";
import { CelebrationProvider } from "@/components/ui/celebration";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { NetworkStatusProvider } from "@/hooks/useNetworkStatus";
// OfflineProvider removed (redundant)
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { NavigationListener } from "@/components/navigation/NavigationListener";
import { InAppNotificationWatcher } from "@/features/notifications/components/InAppNotificationWatcher";
import { SmartAlertsWatcher } from "@/features/notifications/components/SmartAlertsWatcher";
import { BIAlertsWatcher } from "@/features/analytics/components/bi/BIAlertsWatcher";

import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeContextProvider } from "@/contexts/ThemeContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { TransitionConfigProvider } from "@/contexts/TransitionConfigContext";
import { useAuth } from "@/features/auth";

import { createQueryClient } from "@/lib/queryConfig";

const queryClient = createQueryClient();

function ProductDesignFeatureProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Só depende de `user`, não de `isLoading`: `isLoading` também cobre o
  // fetch (rede) de profile/role em AuthProvider.fetchUserData, que o
  // CommandPaletteAdvanced não usa (nem ele nem CommandPaletteCommands
  // consultam `role`/`profile` — só `signOut`). Gatear nele atrasava a
  // montagem da paleta em vários segundos após um hard refresh (Cmd+K
  // silenciosamente não fazia nada nesse intervalo), e era a causa raiz de
  // accessibility.spec.ts:44/77 falharem: page.goto('/') remonta o
  // AuthProvider do zero, e a suíte só aguarda 1s antes do Cmd+K — tempo
  // insuficiente para a viagem de rede de profile+role, mas suficiente para
  // a sessão ser restaurada (o que já habilita `user`).
  const isAuthenticated = Boolean(user?.id);

  return (
    <ProductDesignProvider
      enableOnboarding
      enableCommandPalette={isAuthenticated}
      enableKeyboardShortcuts
      enableToastWithUndo
    >
      {children}
    </ProductDesignProvider>
  );
}

const APP_PROVIDERS: ComponentType<{ children: ReactNode }>[] = [
  ThemeContextProvider,
  TransitionConfigProvider,
  TooltipProvider,
  UserPreferencesProvider,
  FeatureFlagsProvider,
  BreadcrumbProvider,
  SearchProvider,
  SidebarProvider,
  ConfirmationProvider,
  NotificationsProvider,
  AuthProvider,
  ReauthProvider,
  PermissionsProvider,
  OfflineSyncProvider,
  NetworkStatusProvider,
  WebSocketProvider,
  EfficiencyNotificationProvider,
  RealtimeNotificationsProvider,
  ProductDesignFeatureProvider,
  CelebrationProvider,
  FeedbackProvider,
];

function ComposedProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ProviderComposer providers={APP_PROVIDERS}>
        {children}
      </ProviderComposer>
    </ThemeProvider>
  );
}

function Observers() {
  const { user } = useAuth();
  // Só depende de `user`, não de `isLoading` (mesmo raciocínio de
  // ProductDesignFeatureProvider acima): nenhum dos 3 watchers consome
  // role/profile, só `user?.id` — gatear em isLoading atrasaria a
  // montagem deles em segundos após um hard refresh sem necessidade.
  const isAuthenticated = Boolean(user?.id);

  return (
    <>
      <NavigationListener />
      {isAuthenticated && (
        <>
          <InAppNotificationWatcher />
          <SmartAlertsWatcher />
          <BIAlertsWatcher />
        </>
      )}
    </>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ComposedProviders>
              <Observers />
              {children}
            </ComposedProviders>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
