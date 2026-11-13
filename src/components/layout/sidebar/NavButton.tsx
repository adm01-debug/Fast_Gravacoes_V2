import React, { useCallback, memo, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/prefetch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SoundFeedback } from '@/lib/soundFeedback';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  allowedRoles?: string[];
}

interface NavButtonProps {
  item: NavItem;
  collapsed: boolean;
  isMobile: boolean;
  isActive: boolean;
}

export const NavButton = memo(forwardRef<HTMLDivElement, NavButtonProps>(function NavButton({ item, collapsed, isMobile, isActive }, ref) {
  const Icon = item.icon;
  const { trigger } = useHapticFeedback();

  const handleClick = useCallback(() => {
    trigger('light');
    SoundFeedback.navForward();
  }, [trigger]);

  const handlePrefetch = useCallback(() => {
    prefetchRoute(item.href);
  }, [item.href]);

  const button = (
    <Link to={item.href} className="block group/link" onMouseEnter={handlePrefetch} onFocus={handlePrefetch} onClick={handleClick}>
      <Button
        variant="ghost"
        aria-label={item.label}
        className={cn(
          'w-full justify-start gap-3 h-11 px-3 relative transition-all duration-300 group/nav',
          'hover:bg-sidebar-accent hover:text-sidebar-foreground hover:pl-4 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:bg-sidebar-accent',
          isActive && [
            'bg-sidebar-accent text-primary font-bold border-l-4 border-primary shadow-sm',
            'shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.08),0_0_25px_rgba(var(--primary-rgb),0.12)] border-r border-primary/10',
            'hover:pl-4 transition-all duration-300',
          ],
          !isActive && 'border-l-4 border-transparent text-sidebar-foreground/70',
          collapsed && !isMobile && 'justify-center px-0 hover:pl-0 border-l-0'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0 transition-all duration-300 group-hover/nav:scale-125 group-hover/nav:rotate-3 group-hover/nav:text-primary', isActive && 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]')} />
        {(!collapsed || isMobile) && <span className="truncate text-[10px] font-black tracking-[0.2em] leading-none uppercase">{item.label}</span>}
        {(!collapsed || isMobile) && item.badge && (
          <span className="ml-auto gradient-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full animate-pulse-glow">{item.badge}</span>
        )}
        {(collapsed && !isMobile) && item.badge && (
          <span className="absolute -top-1 -right-1 gradient-primary text-primary-foreground text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">{item.badge}</span>
        )}
      </Button>
    </Link>
  );

  if (collapsed && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2 bg-sidebar-accent border-sidebar-border text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 shadow-xl">
          {item.label}
          {item.badge && <span className="gradient-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5 rounded-full">{item.badge}</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}));
NavButton.displayName = 'NavButton';
