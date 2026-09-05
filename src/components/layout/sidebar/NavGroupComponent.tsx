import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NavButton, NavItem } from './NavButton';

export interface NavGroup {
  id: string;
  icon: React.ElementType;
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface NavGroupComponentProps {
  group: NavGroup;
  collapsed: boolean;
  isMobile: boolean;
  isActive: (href: string) => boolean;
  alertCount: number;
  notificationCount: number;
  packagingOverdueCount?: number;
  openGroups: string[];
  toggleGroup: (id: string) => void;
}

export const NavGroupComponent = memo(function NavGroupComponent({
  group, collapsed, isMobile, isActive, alertCount, notificationCount, packagingOverdueCount = 0, openGroups, toggleGroup,
}: NavGroupComponentProps) {
  const Icon = group.icon;
  const isOpen = openGroups.includes(group.id);
  const hasActiveItem = group.items.some(item => isActive(item.href));

  const itemsWithBadge = group.items.map(item => {
    let badgeCount: number | undefined = undefined;
    if (item.href === '/alerts') badgeCount = alertCount;
    if (item.href === '/notifications') badgeCount = notificationCount;
    if (item.href === '/packaging') badgeCount = packagingOverdueCount;

    return {
      ...item,
      badge: (badgeCount !== undefined && badgeCount > 0) ? badgeCount : undefined
    };
  });

  if (collapsed && !isMobile) {
    return <>{itemsWithBadge.map(item => <NavButton key={item.href} item={item} collapsed={collapsed} isMobile={isMobile} isActive={isActive(item.href)} />)}</>;
  }

  if (group.items.length === 1) {
    return <NavButton item={itemsWithBadge[0]} collapsed={collapsed} isMobile={isMobile} isActive={isActive(itemsWithBadge[0].href)} />;
  }

  return (
    <div className="space-y-0.5">
      <Button
        variant="ghost"
        onClick={() => toggleGroup(group.id)}
        className={cn(
          "w-full justify-between gap-3 h-10 px-3 transition-all duration-500 group/btn",
          "hover:bg-sidebar-accent hover:text-sidebar-foreground hover:pl-4 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "text-sidebar-foreground/70 font-black tracking-[0.2em] uppercase text-[10px] leading-none",
          hasActiveItem && "text-sidebar-foreground bg-sidebar-accent/50 shadow-sm border-l-2 border-primary/30"
        )}
        aria-expanded={isOpen}
        aria-controls={`nav-group-${group.id}`}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("h-4 w-4 shrink-0 transition-all duration-500 group-hover/btn:scale-125 group-hover/btn:rotate-6 group-hover/btn:text-primary", hasActiveItem && "text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]")} />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase leading-none">{group.label}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </motion.div>
      </Button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div id={`nav-group-${group.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className="pl-4 space-y-0.5 border-l-2 border-border/30 ml-5">
              {itemsWithBadge.map(item => <NavButton key={item.href} item={item} collapsed={false} isMobile={isMobile} isActive={isActive(item.href)} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
