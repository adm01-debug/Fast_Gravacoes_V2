import { memo, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Calendar,
  LayoutGrid,
  AlertTriangle,
  User,
  Menu,
  QrCode,
  Wrench,
  BarChart3,
  Bell,
  Settings,
  BookOpen,
  ArrowRightLeft,
  Download,
  X,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { SoundFeedback } from '@/lib/soundFeedback';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/use-device';
import { useAuth } from '@/features/auth';
import { useAlertCount } from '@/hooks/useAlertCount';
import { useNotifications } from '@/features/notifications';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useDirtyGuard } from '@/contexts/DirtyFormContext';
import { trackNavBack } from '@/lib/navTelemetry';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  roles?: ('operator' | 'coordinator' | 'manager')[];
}

// Primary nav items for different roles
const operatorPrimaryItems: NavItem[] = [
  { id: 'operator', icon: User, label: 'Início', href: '/operator' },
  { id: 'scanner', icon: QrCode, label: 'Scanner', href: '/scanner' },
  { id: 'alerts', icon: AlertTriangle, label: 'Alertas', href: '/alerts' },
  { id: 'shift', icon: ArrowRightLeft, label: 'Turno', href: '/shift-handover' },
];

const coordinatorPrimaryItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Dashboard', href: '/' },
  { id: 'calendar', icon: Calendar, label: 'Agenda', href: '/calendar/daily' },
  { id: 'kanban', icon: LayoutGrid, label: 'Kanban', href: '/kanban' },
  { id: 'alerts', icon: AlertTriangle, label: 'Alertas', href: '/alerts' },
];

const managerPrimaryItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Dashboard', href: '/' },
  { id: 'oee', icon: BarChart3, label: 'OEE', href: '/oee' },
  { id: 'calendar', icon: Calendar, label: 'Agenda', href: '/calendar/daily' },
  { id: 'alerts', icon: AlertTriangle, label: 'Alertas', href: '/alerts' },
];

// More menu items by role
const operatorMoreItems: NavItem[] = [
  { id: 'knowledge', icon: BookOpen, label: 'Base de Conhecimento', href: '/knowledge' },
  { id: 'notifications', icon: Bell, label: 'Notificações', href: '/notifications' },
  { id: 'install', icon: Download, label: 'Instalar App', href: '/install' },
];

const coordinatorMoreItems: NavItem[] = [
  { id: 'oee', icon: BarChart3, label: 'OEE', href: '/oee' },
  { id: 'tpm', icon: Wrench, label: 'TPM', href: '/tpm' },
  { id: 'scanner', icon: QrCode, label: 'QR Scanner', href: '/scanner' },
  { id: 'shift', icon: ArrowRightLeft, label: 'Passagem Turno', href: '/shift-handover' },
  { id: 'knowledge', icon: BookOpen, label: 'Base de Conhecimento', href: '/knowledge' },
  { id: 'notifications', icon: Bell, label: 'Notificações', href: '/notifications' },
  { id: 'settings', icon: Settings, label: 'Configurações', href: '/settings' },
];

const managerMoreItems: NavItem[] = [
  { id: 'tpm', icon: Wrench, label: 'TPM', href: '/tpm' },
  { id: 'kanban', icon: LayoutGrid, label: 'Kanban', href: '/kanban' },
  { id: 'knowledge', icon: BookOpen, label: 'Base de Conhecimento', href: '/knowledge' },
  { id: 'notifications', icon: Bell, label: 'Notificações', href: '/notifications' },
  { id: 'settings', icon: Settings, label: 'Configurações', href: '/settings' },
];

interface MobileNavButtonProps {
  item: NavItem;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
  onHaptic: () => void;
}

const MobileNavButton = memo(function MobileNavButton({
  item,
  isActive,
  badge,
  onClick,
  onHaptic,
}: MobileNavButtonProps) {
  const Icon = item.icon;

  const handleClick = useCallback(() => {
    onHaptic();
    SoundFeedback.navForward();
    onClick();
  }, [onHaptic, onClick]);

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'relative flex flex-col items-center justify-center flex-1 py-1 px-1 min-h-[56px]',
        'touch-target transition-all duration-300 ease-in-out',

        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-label={`${item.label}${badge && badge > 0 ? `, ${badge} alertas` : ''}`}
    >
      {/* Active indicator pill with animation */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            layoutId="mobile-nav-active-pill"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 bg-primary/10 rounded-xl"
            aria-hidden="true"
          />

        )}
      </AnimatePresence>

      <motion.div
        className="relative"
        animate={{ 
          scale: isActive ? 1.2 : 1,
          y: isActive ? -2 : 0
        }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >

        <Icon className="h-6 w-6" />
        <AnimatePresence>
          {badge !== undefined && badge > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground shadow-sm"
            >
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <span className={cn(
        'text-[10px] mt-1 font-bold tracking-tight truncate max-w-full transition-all duration-300',
        isActive ? 'text-primary opacity-100' : 'text-muted-foreground opacity-70'
      )}>
        {item.label}
      </span>

    </motion.button>
  );
});

function MoreMenuContent({
  items,
  currentPath,
  alertCount,
  notificationCount,
  onNavigate,
  onClose
}: {
  items: NavItem[];
  currentPath: string;
  alertCount: number;
  notificationCount: number;
  onNavigate: (href: string) => void;
  onClose: () => void;
}) {
  const { trigger } = useHapticFeedback();

  const handleNavigate = useCallback((href: string) => {
    trigger('light');
    onNavigate(href);
  }, [trigger, onNavigate]);

  return (
    <div className="flex flex-col h-full">
      {/* Drag handle indicator */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" aria-hidden="true" />
      </div>

      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">
          Mais opções
        </h3>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 -mr-2 rounded-full hover:bg-muted active:bg-muted/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </motion.button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href);

            let badge = undefined;
            if (item.id === 'alerts') badge = alertCount;
            if (item.id === 'notifications') badge = notificationCount;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl',
                  'touch-target transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted active:bg-muted/80'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative',
                  isActive ? 'bg-primary/20' : 'bg-muted'
                )}>
                  <Icon className="h-5 w-5" />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground shadow-sm">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="flex-1 text-left font-medium">{item.label}</span>
                <ChevronRight className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  isActive && 'text-primary translate-x-0.5'
                )} />
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function MobileNavigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, prefersReducedMotion } = useDevice();
  const { role } = useAuth();
  const alertCount = useAlertCount();
  const { unreadCount: notificationCount } = useNotifications();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { trigger } = useHapticFeedback();
  const { isVisible } = useScrollDirection({ threshold: 20 });
  const { canGoBack: hasInternalEntry, goBack } = useSmartBack();
  const { confirmIfDirty } = useDirtyGuard();

  const primaryItems = useMemo(() => {
    switch (role) {
      case 'admin':
        return coordinatorPrimaryItems; // Admin uses coordinator items as base
      case 'operator':
        return operatorPrimaryItems;
      case 'manager':
        return managerPrimaryItems;
      case 'coordinator':
      default:
        return coordinatorPrimaryItems;
    }
  }, [role]);


  const moreItems = useMemo(() => {
    switch (role) {
      case 'admin':
        return coordinatorMoreItems; // Admin uses coordinator items as base
      case 'operator':
        return operatorMoreItems;
      case 'manager':
        return managerMoreItems;
      case 'coordinator':
      default:
        return coordinatorMoreItems;
    }
  }, [role]);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const handleNavigate = useCallback((href: string) => {
    confirmIfDirty(() => navigate(href));
    setSheetOpen(false);
  }, [navigate, confirmIfDirty]);

  const handleMoreClick = useCallback(() => {
    trigger('light');
    setSheetOpen(true);
  }, [trigger]);

  // Only render on mobile
  if (!isMobile) return null;

  return (
    <motion.nav
      initial={false}
      animate={{
        y: isVisible || sheetOpen || location.pathname === '/auth' ? 0 : 100,
        opacity: isVisible || sheetOpen || location.pathname === '/auth' ? 1 : 0
      }}

      transition={{
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeOut'
      }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 transition-all duration-300',
        'bg-background/80 backdrop-blur-2xl border-t border-border/50',
        'shadow-[0_-8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.3)]',
        'pb-safe px-2',
        location.pathname === '/auth' && 'hidden'

      )}
      role="navigation"
      aria-label="Navegação principal mobile"
    >
      <div className="flex items-stretch justify-around max-w-md mx-auto h-16">
        {/* Dynamic Back Button for Mobile Nav Bar */}
        <AnimatePresence>
          {location.pathname !== '/' && location.pathname !== '/operator' && location.pathname !== '/auth' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              <MobileNavButton
                item={{ id: 'back', icon: ArrowLeft, label: 'Voltar', href: '#' }}
                isActive={false}
                onClick={() => {
                  SoundFeedback.navBack();
                  trackNavBack('mobile-header', hasInternalEntry ? 'history' : 'fallback');
                  confirmIfDirty(goBack);
                }}
                onHaptic={() => trigger('light')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {primaryItems.map((item) => {
          let badge = undefined;
          if (item.id === 'alerts') badge = alertCount;
          if (item.id === 'notifications') badge = notificationCount;

          return (
            <MobileNavButton
              key={item.id}
              item={item}
              isActive={isActive(item.href)}
              badge={badge}
              onClick={() => handleNavigate(item.href)}
              onHaptic={() => trigger('light')}
            />
          );
        })}

        {/* More Menu Button */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.1 }}
              onClick={handleMoreClick}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 py-1 px-1 min-h-[56px]',
                'touch-target transition-all duration-300 ease-in-out',
                sheetOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <AnimatePresence>
                {sheetOpen && (
                  <motion.span
                    layoutId="mobile-nav-active-pill"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    aria-hidden="true"
                  />
                )}
              </AnimatePresence>

              <motion.div
                className="relative"
                animate={{ 
                  rotate: sheetOpen ? 90 : 0,
                  scale: sheetOpen ? 1.2 : 1
                }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
              >
                <Menu className="h-6 w-6" />
              </motion.div>

              <span className={cn(
                'text-[10px] mt-1 font-bold tracking-tight transition-all duration-300',
                sheetOpen ? 'text-primary opacity-100' : 'text-muted-foreground opacity-70'
              )}>
                Mais
              </span>

            </motion.button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de navegação</SheetTitle>
            </SheetHeader>
            <MoreMenuContent
              items={moreItems}
              currentPath={location.pathname}
              alertCount={alertCount}
              notificationCount={notificationCount}
              onNavigate={handleNavigate}
              onClose={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </motion.nav>
  );
}

export default MobileNavigation;
