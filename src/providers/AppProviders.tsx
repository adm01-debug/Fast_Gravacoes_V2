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
  const { user, isLoading } = useAuth();
  const isAuthenticated = Boolean(user?.id) && !isLoading;

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
  const { user, isLoading } = useAuth();
  const isAuthenticated = Boolean(user?.id) && !isLoading;

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
