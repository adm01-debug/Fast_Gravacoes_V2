import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, QrCode, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/use-device';
import { useAuth } from '@/features/auth';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useDirtyGuard } from '@/contexts/DirtyFormContext';

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}

const coordinatorActions: QuickAction[] = [
  { id: 'new-job', icon: Plus, label: 'Novo Job', href: '/new-job', color: 'bg-primary' },
  { id: 'scanner', icon: QrCode, label: 'Scanner', href: '/scanner', color: 'bg-chart-2' },
  { id: 'calendar', icon: Calendar, label: 'Agenda', href: '/calendar/daily', color: 'bg-chart-3' },
];

const operatorActions: QuickAction[] = [
  { id: 'scanner', icon: QrCode, label: 'Scanner', href: '/scanner', color: 'bg-primary' },
  { id: 'alert', icon: AlertTriangle, label: 'Reportar', href: '/alerts', color: 'bg-warning' },
  { id: 'shift', icon: FileText, label: 'Turno', href: '/shift-handover', color: 'bg-chart-3' },
];

const managerActions: QuickAction[] = [
  { id: 'new-job', icon: Plus, label: 'Novo Job', href: '/new-job', color: 'bg-primary' },
  { id: 'calendar', icon: Calendar, label: 'Agenda', href: '/calendar/daily', color: 'bg-chart-2' },
];

/**
 * MobileQuickActions - Floating Action Button with quick actions
 *
 * Provides quick access to common actions based on user role.
 * Expands to show action menu when tapped.
 */
export function MobileQuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { isMobile } = useDevice();
  const { role } = useAuth();
  const { trigger } = useHapticFeedback();
  const { confirmIfDirty } = useDirtyGuard();

  const actions = role === 'operator'
    ? operatorActions
    : role === 'manager'
      ? managerActions
      : coordinatorActions;

  const toggleOpen = useCallback(() => {
    trigger(isOpen ? 'light' : 'medium');
    setIsOpen(!isOpen);
  }, [isOpen, trigger]);

  const handleAction = useCallback((action: QuickAction) => {
    trigger('light');
    // Sair da página respeita o dirty-guard — mantém o menu aberto se o
    // usuário cancelar a saída no AlertDialog.
    confirmIfDirty(() => {
      setIsOpen(false);
      navigate(action.href);
    });
  }, [navigate, trigger, confirmIfDirty]);

  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container - positioned above bottom nav */}
      <div className="fixed bottom-20 right-4 z-50 pb-safe">
        {/* Action buttons */}
        <AnimatePresence>
          {isOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3 mb-2">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { delay: index * 0.05 }
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      y: 20,
                      transition: { delay: (actions.length - index - 1) * 0.03 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAction(action)}
                    className="flex items-center gap-3"
                  >
                    <span className="px-3 py-1.5 bg-card rounded-lg shadow-lg text-sm font-medium text-foreground">
                      {action.label}
                    </span>
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center shadow-lg',
                      action.color,
                      'text-primary-foreground'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          onClick={toggleOpen}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            'gradient-primary text-primary-foreground',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            isOpen && 'bg-muted text-muted-foreground'
          )}
          style={{
            boxShadow: isOpen ? undefined : 'var(--shadow-glow-primary), var(--shadow-xl)'
          }}
          aria-label={isOpen ? 'Fechar menu' : 'Ações rápidas'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </motion.button>
      </div>
    </>
  );
}

export default MobileQuickActions;
