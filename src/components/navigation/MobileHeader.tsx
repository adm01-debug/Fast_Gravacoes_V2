import { ReactNode, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/use-device';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useSmartBack } from '@/hooks/use-smart-back';
import { useDirtyGuard } from '@/contexts/DirtyFormContext';
import { trackNavBack } from '@/lib/navTelemetry';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showMenu?: boolean;
  backTo?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
  transparent?: boolean;
  onMenuClick?: () => void;
}

/**
 * MobileHeader - Header reutilizável para páginas mobile
 *
 * Use para páginas que não usam MainLayout ou precisam de navegação adicional.
 * Fornece botão voltar, título e ações personalizadas.
 */
export function MobileHeader({
  title,
  showBack = true,
  showHome = false,
  showMenu = false,
  backTo,
  leftAction,
  rightAction,
  className,
  transparent = false,
  onMenuClick,
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useDevice();

  const { trigger } = useHapticFeedback();

  const { canGoBack: hasInternalEntry, goBack } = useSmartBack(backTo ?? '/');
  const { confirmIfDirty } = useDirtyGuard();

  const handleBack = useCallback(() => {
    trigger('light');
    trackNavBack('mobile-header', hasInternalEntry ? 'history' : 'fallback');
    confirmIfDirty(goBack);
  }, [trigger, goBack, hasInternalEntry, confirmIfDirty]);

  const handleHome = useCallback(() => {
    trigger('light');
    navigate('/');
  }, [navigate, trigger]);

  const handleMenu = useCallback(() => {
    trigger('light');
    onMenuClick?.();
  }, [onMenuClick, trigger]);

  // Always render on mobile, optionally on desktop
  // If no title is provided, try to get it from location
  const displayTitle = title || (location.pathname === '/' ? 'Dashboard' : undefined);

  if (!isMobile) return null;


  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'flex items-center justify-between h-14 px-3',
        'safe-area-top',
        transparent
          ? 'bg-transparent'
          : 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm',
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-1 min-w-[48px]">
        {leftAction || (
          <>
            {showMenu && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMenu}
                className="h-10 w-10 touch-target active:scale-95 transition-transform"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            {showBack && !showMenu && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-10 w-10 touch-target active:scale-95 transition-transform"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {showHome && !showBack && !showMenu && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHome}
                className="h-10 w-10 touch-target active:scale-95 transition-transform"
                aria-label="Ir para início"
              >
                <Home className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Title */}
      {displayTitle && (
        <h1 className="text-base font-bold text-foreground truncate flex-1 text-center px-2 tracking-tight">
          {displayTitle}
        </h1>
      )}


      {/* Right Section */}
      <div className="flex items-center gap-1 min-w-[48px] justify-end">
        {rightAction}
      </div>
    </header>
  );
}

/**
 * MobileHeaderSpacer - Adiciona espaço para compensar o header fixo
 */
export function MobileHeaderSpacer({ className }: { className?: string }) {
  const { isMobile } = useDevice();

  if (!isMobile) return null;

  return <div className={cn('h-14 safe-area-top', className)} />;
}

export default MobileHeader;
