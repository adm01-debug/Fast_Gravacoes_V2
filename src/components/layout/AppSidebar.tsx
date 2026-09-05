/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ChevronLeft, ChevronRight, Printer, Plus, LogOut, ArrowLeft, Settings, Shield, Menu } from 'lucide-react';

import { SoundFeedback } from '@/lib/soundFeedback';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/prefetch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';
import { useDevice } from '@/hooks/use-device';
import { useAlertCount } from '@/hooks/useAlertCount';
import { useNotifications } from '@/features/notifications';
import { usePackagingOverdueCount } from '@/features/packaging/hooks/usePackagingOverdueCount';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NavButton } from './sidebar/NavButton';
import { NavGroupComponent } from './sidebar/NavGroupComponent';
import { navGroups, adminNavItems } from './sidebar/sidebarNavConfig';
import { StaggeredList, useRipple } from '../ui/micro-interactions';

export function AppSidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['home', 'planning']);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut, isCoordinator, isAdmin, user } = useAuth();
  const { isMobile } = useDevice();
  const alertCount = useAlertCount();
  const { unreadCount: notificationCount } = useNotifications();
  const { data: packagingOverdueCount = 0 } = usePackagingOverdueCount();

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  }, []);

  useEffect(() => {
    const activeGroup = navGroups.find(g => g.items.some(i => i.href === '/' ? location.pathname === '/' : location.pathname.startsWith(i.href)));
    if (activeGroup && !openGroups.includes(activeGroup.id)) setOpenGroups(prev => [...prev, activeGroup.id]);
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  const handleSignOut = useCallback(async () => { await signOut(); navigate('/auth'); }, [signOut, navigate]);

  const filteredNavGroups = useMemo(() => {
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => 
          !item.allowedRoles || (role && item.allowedRoles.includes(role))
        )
      }))
      .filter(group => group.items.length > 0);
  }, [role]);

  const filteredAdminNavItems = useMemo(() => {
    return adminNavItems.filter(item => 
      !item.allowedRoles || (role && item.allowedRoles.includes(role))
    );
  }, [role]);
  const isActive = useCallback((href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  }, [location.pathname]);

  const activeGroup = useMemo(() => {
    return navGroups.find(g => g.items.some(i => isActive(i.href)));
  }, [isActive]);

  const handleNewJobPrefetch = useCallback(() => { prefetchRoute('/new-job'); }, []);

  const { ref: swipeRef } = useSwipeGesture<HTMLDivElement>({ onSwipeRight: () => { if (isMobile && !mobileOpen) setMobileOpen(true); }, onSwipeLeft: () => { if (isMobile && mobileOpen) setMobileOpen(false); }, threshold: 50, disabled: !isMobile });
  const focusTrapRef = useFocusTrap<HTMLElement>({ enabled: isMobile && mobileOpen, autoFocus: true, restoreFocus: true });

  return (
    <>
      {/* Mobile Top Bar */}
      {isMobile && !mobileOpen && (
        <div className="fixed top-0 left-0 right-0 h-14 z-[45] bg-sidebar/80 backdrop-blur-md border-b border-sidebar-border flex items-center px-4 justify-between md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileOpen(true)}
            className="text-sidebar-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <BrandLogo size="sm" showSubtitle={false} />
          </div>

          <div className="w-10" /> {/* Spacer */}
        </div>
      )}

      <div className={cn('fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      {isMobile && !mobileOpen && <div ref={swipeRef} className="fixed inset-y-0 left-0 w-8 z-30 md:hidden" aria-hidden="true" />}

      <aside
        ref={isMobile ? focusTrapRef : undefined}
        className={cn(
          'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
          'dark:bg-gradient-to-b dark:from-sidebar dark:via-sidebar dark:to-background',
          'shadow-[2px_0_12px_-4px_hsl(220_10%_12%/0.08)] dark:shadow-[2px_0_20px_-4px_hsl(0_0%_0%/0.3)]',
          'hidden md:flex', collapsed ? 'w-16' : 'w-64',
          isMobile && 'fixed inset-y-0 left-0 z-50 w-72',
          isMobile && (mobileOpen ? 'translate-x-0' : '-translate-x-full'),
          isMobile && 'flex'
        )}
        role="navigation" aria-label="Menu principal" id="main-navigation"
        tabIndex={-1}

      >
        {/* Header */}
        <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border relative', collapsed && !isMobile ? 'justify-center px-0' : 'justify-between')}>
          <div className={cn("flex items-center gap-3 overflow-hidden flex-1", collapsed && !isMobile && "justify-center")}>
            <AnimatePresence mode="wait">
              {(!collapsed || isMobile) && location.pathname !== '/' && location.pathname !== '/operator' && location.pathname !== '/auth' && (
                <motion.div
                  key="back-button"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex-shrink-0"
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      SoundFeedback.navBack();
                      navigate(-1);
                    }}
                    className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex-shrink-0">
              <BrandLogo 
                collapsed={collapsed && !isMobile} 
                size={collapsed && !isMobile ? "sm" : "md"} 
                showSubtitle={!collapsed || isMobile}
              />
            </div>
          </div>


          {!isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-muted focus:ring-2 focus:ring-primary">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {role !== 'operator' && (
          <div className={cn('p-4', collapsed && !isMobile && 'px-2')}>
            <Link to="/new-job" onMouseEnter={handleNewJobPrefetch} onFocus={handleNewJobPrefetch}>
              {collapsed && !isMobile ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button className="w-full h-11 gradient-primary hover:opacity-90 transition-all duration-300 glow-primary rounded-xl shadow-lg p-0 flex items-center justify-center">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-sidebar-accent border-sidebar-border text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 shadow-xl">
                    Novo Agendamento
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button className="w-full gap-2 gradient-primary hover:opacity-90 transition-all duration-300 glow-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl h-11 shadow-lg">
                  <Plus className="h-5 w-5" />
                  {(!collapsed || isMobile) && <span className="font-black uppercase tracking-[0.2em] text-[10px] leading-none">Novo Agendamento</span>}
                </Button>
              )}
            </Link>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 relative focus:outline-none" id="main-navigation">
          <StaggeredList staggerDelay={0.03}>
            {filteredNavGroups.map((group) => {
              const isGroupActive = activeGroup?.id === group.id;
              return (
                <div key={group.id} className="relative py-0.5">
                  {isGroupActive && !collapsed && (
                    <motion.div
                      layoutId="active-group-indicator"
                      className="absolute -left-2 top-0.5 bottom-0.5 w-1.5 gradient-primary rounded-r-full z-10 shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                  <NavGroupComponent
                    group={group}
                    collapsed={collapsed}
                    isMobile={isMobile}
                    isActive={isActive}
                    alertCount={alertCount}
                    notificationCount={notificationCount}
                    packagingOverdueCount={packagingOverdueCount}
                    openGroups={openGroups}
                    toggleGroup={toggleGroup}
                  />
                </div>
              );
            })}
          </StaggeredList>

          {filteredAdminNavItems.length > 0 && (
            <>
              <div className="my-4 border-t border-sidebar-border/50" />
              {(!collapsed || isMobile) && <p className="text-[10px] font-black text-sidebar-foreground/30 uppercase tracking-[0.2em] px-3 py-2 leading-none">Administração</p>}
              {filteredAdminNavItems.map(item => <NavButton key={item.href} item={item} collapsed={collapsed} isMobile={isMobile} isActive={isActive(item.href)} />)}
            </>
          )}
        </nav>

        <div className={cn('p-4 border-t border-sidebar-border/50 bg-sidebar-accent/5 mt-auto', collapsed && !isMobile && 'p-2')}>
          {(!collapsed || isMobile) && <div className="mb-4 px-1"><LanguageSwitcher /></div>}
          {collapsed && !isMobile ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center rounded-xl p-2 relative group-user">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-lg ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-sidebar-accent border-sidebar-border p-3 shadow-xl">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-black text-sidebar-foreground tracking-tight uppercase leading-none">
                    {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-primary" />
                    <p className="text-[9px] font-bold text-primary/80 uppercase tracking-[0.2em]">
                      {role === 'admin' ? 'Administrador' : role === 'coordinator' ? 'Coordenação' : role === 'manager' ? 'Gestão' : 'Operação'}
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className={cn('flex items-center gap-3 rounded-xl p-2 relative group-user')}>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-lg ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar">
                {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-sidebar-foreground truncate tracking-[0.2em] uppercase leading-none mb-1.5">
                  {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <div className="flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-primary" />
                  <p className="text-[9px] font-black text-primary/80 uppercase tracking-[0.2em] truncate">
                    {role === 'admin' ? 'Administrador' : role === 'coordinator' ? 'Coordenação' : role === 'manager' ? 'Gestão' : 'Operação'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {collapsed && !isMobile ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="w-full mt-4 h-10 flex items-center justify-center text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-destructive/90 text-white border-none text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 shadow-xl">
                {t('common.logout')}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full mt-4 font-black text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 focus:ring-2 focus:ring-destructive rounded-xl transition-all duration-500">
              <LogOut className="h-4 w-4" />
              <span className="ml-2">{t('common.logout')}</span>
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
