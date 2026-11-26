import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PushNotificationPrompt } from "@/features/notifications/components/PushNotificationPrompt";
import { NetworkStatusToaster } from "@/components/offline/NetworkStatusToaster";
import { AppProviders } from "@/providers/AppProviders";
import { AnimatedRoutes } from "@/routes/AppRoutes";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { ScrollableRegionFocusGuard } from "@/components/a11y/ScrollableRegionFocusGuard";

const App = () => (
  <GlobalErrorBoundary>
    <AppProviders>
      <Toaster />
      <Sonner />
      <NetworkStatusToaster />
      <ScrollableRegionFocusGuard />
      <AnimatedRoutes />
      <PushNotificationPrompt delay={15000} />
    </AppProviders>
  </GlobalErrorBoundary>
);

export default App;
