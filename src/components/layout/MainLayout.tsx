import { ReactNode, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from './ThemeToggle';
import { OfflineStatusBanner } from '../offline/OfflineStatusBanner';
import { SkipLinks, MainContent } from '../accessibility';
import { NetworkStatusIndicator } from '@/hooks/useNetworkStatus';
import { SessionProvider } from '@/features/auth';
import { SectionErrorBoundary } from '../ui/section-error-boundary';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNotifications } from '@/features/notifications';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

// Lazy-load non-critical layout components
const AssistantButton = lazy(() => import('../assistant/AssistantButton').then(m => ({ default: m.AssistantButton })));
const NotificationIntegrator = lazy(() => import('@/features/notifications').then(m => ({ default: m.NotificationIntegrator })));
const RealtimeIndicator = lazy(() => import('../dashboard/RealtimeIndicator').then(m => ({ default: m.RealtimeIndicator })));
const OperatorMachinesIndicator = lazy(() => import('./OperatorMachinesIndicator').then(m => ({ default: m.OperatorMachinesIndicator })));
const QuickFavoritesBar = lazy(() => import('./QuickFavoritesBar').then(m => ({ default: m.QuickFavoritesBar })));
const OfflineReadyIndicator = lazy(() => import('../offline/OfflineReadyIndicator').then(m => ({ default: m.OfflineReadyIndicator })));
const MobileNavigation = lazy(() => import('../navigation/MobileNavigation').then(m => ({ default: m.MobileNavigation })));
const MobileQuickActions = lazy(() => import('../navigation/MobileQuickActions').then(m => ({ default: m.MobileQuickActions })));

const SystemOnboarding = lazy(() => import('../onboarding/SystemOnboarding').then(m => ({ default: m.SystemOnboarding })));
const Breadcrumbs = lazy(() => import('../navigation/Breadcrumbs').then(m => ({ default: m.Breadcrumbs })));
const BackButton = lazy(() => import('../navigation/BackButton').then(m => ({ default: m.BackButton })));
const SwipeIndicator = lazy(() => import('../navigation/SwipeIndicator').then(m => ({ default: m.SwipeIndicator })));
const TopProgressBar = lazy(() => import('../navigation/TopProgressBar').then(m => ({ default: m.TopProgressBar })));



import { useDevice } from '@/hooks/use-device';
import { cn } from '@/lib/utils';
import { useNavigationHotkeys } from '@/hooks/use-navigation-hotkeys';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useNavigate } from 'react-router-dom';



interface MainLayoutProps {
  children: ReactNode;
}

/** Inline fallback for lazy layout widgets — renders nothing */
const EmptyFallback = null;

export function MainLayout({ children }: MainLayoutProps) {
  const { isMobile, prefersReducedMotion } = useDevice();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();


  // Dynamic page title for SEO
  usePageTitle();
  
  // Navigation global hotkeys
  useNavigationHotkeys();

  // Swipe to back on mobile
  const { ref: swipeRef } = useSwipeGesture({
    onSwipeRight: () => {
      if (isMobile && location.pathname !== '/' && location.pathname !== '/auth') {
        navigate(-1);
      }
    },
    threshold: 80,
    preventScroll: false
  });



  const shouldAnimate = !prefersReducedMotion;

  return (
    <SessionProvider>
      <div className="flex h-dvh w-full bg-background overflow-hidden">
        {/* Skip Links for Accessibility */}
        <SkipLinks />
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>

        {/* Sidebar - hidden on mobile, shown on tablet+ */}
        <AppSidebar />

        <main
          ref={swipeRef as React.RefObject<HTMLDivElement>}
          className={cn(
            "flex-1 flex flex-col overflow-y-auto overflow-x-hidden relative",
            "h-full scrollbar-thin outline-none"
          )}
          id="main-content-scroll"
        >

          <OfflineStatusBanner />
          <Suspense fallback={null}>
            <SwipeIndicator />
          </Suspense>

          {/* Desktop top bar */}
          <div className="fixed top-4 right-4 z-40 hidden md:flex items-center gap-2" role="toolbar" aria-label="Ações rápidas">
            <SectionErrorBoundary section="Favoritos" compact>
              <Suspense fallback={EmptyFallback}>
                <QuickFavoritesBar />
              </Suspense>
            </SectionErrorBoundary>
            <SectionErrorBoundary section="Máquinas" compact>
              <Suspense fallback={EmptyFallback}>
                <OperatorMachinesIndicator />
              </Suspense>
            </SectionErrorBoundary>
            <Suspense fallback={EmptyFallback}>
              <NetworkStatusIndicator />
            </Suspense>
            <Suspense fallback={EmptyFallback}>
              <OfflineReadyIndicator />
            </Suspense>
            <ThemeToggle />

            <Link to="/notifications" aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}>
              <Button variant="ghost" size="icon" className="relative h-11 w-11" aria-label="Abrir notificações">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <SectionErrorBoundary section="Realtime" compact>
              <Suspense fallback={EmptyFallback}>
                <RealtimeIndicator />
              </Suspense>
            </SectionErrorBoundary>
          </div>

          {/* Mobile/Tablet top bar */}
          <div className="fixed top-2 right-3 z-40 flex md:hidden items-center gap-1.5 safe-area-top" role="toolbar" aria-label="Ações rápidas mobile">
            <Suspense fallback={EmptyFallback}>
              <NetworkStatusIndicator />
            </Suspense>
            <Suspense fallback={EmptyFallback}>
              <OfflineReadyIndicator />
            </Suspense>
            <ThemeToggle />

            <Link to="/notifications" aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}>
              <Button variant="ghost" size="icon" className="relative min-h-11 min-w-11" aria-label="Abrir notificações">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>

          {/* Content with proper padding and safe-area insets */}
          <MainContent className={cn(
            "pt-12 md:pt-4",
            "pb-24 md:pb-4",
            "px-4 sm:px-6 lg:px-8",
            "min-h-0",
            "transition-all duration-300"
          )}>

            {/* Global Navigation Header - Only show when not on home page or auth pages */}
            {!['/', '/auth', '/reset-password', '/install', '/track'].includes(location.pathname) && (
              <header className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6 no-export border-b border-border/10 pb-6">
              <div className="flex items-center gap-4">
                <Suspense fallback={null}>
                  <BackButton className="shadow-sm" />
                </Suspense>
                
                <div className="flex flex-col gap-1">
                  <Suspense fallback={<div className="h-6 bg-muted/40 animate-pulse rounded-md w-48" />}>
                    <Breadcrumbs />
                  </Suspense>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/40 shadow-inner">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  Sistema Online
                </div>
                <Suspense fallback={null}>
                  <RealtimeIndicator />
                </Suspense>
              </div>
            </header>
            )}


            {/* Render direct children as PageTransition is handled in AppRoutes for better SPA experience */}
            {children}


          </MainContent>

          {/* Mobile navigation spacer */}
          {isMobile && <div className="h-20 shrink-0" aria-hidden="true" />}
        </main>

        {/* Mobile navigation */}
        <SectionErrorBoundary section="Navegação mobile" compact>
          <Suspense fallback={EmptyFallback}>
            <MobileNavigation />
          </Suspense>
        </SectionErrorBoundary>

        {/* Mobile FAB */}
        <SectionErrorBoundary section="Ações rápidas" compact>
          <Suspense fallback={EmptyFallback}>
            <MobileQuickActions />
          </Suspense>
        </SectionErrorBoundary>

        {/* Global components */}
        <SectionErrorBoundary section="Assistente" compact>
          <Suspense fallback={EmptyFallback}>
            <AssistantButton />
          </Suspense>
        </SectionErrorBoundary>
        <Suspense fallback={EmptyFallback}>
          <NotificationIntegrator />
        </Suspense>
        {/* CommandPaletteAdvanced é montado globalmente em ProductDesignProvider (gated por auth) */}
        <Suspense fallback={EmptyFallback}>
          <SystemOnboarding />
        </Suspense>
      </div>
    </SessionProvider>
  );
}