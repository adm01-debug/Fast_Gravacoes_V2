/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { memo, useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, Trophy, Star, Zap, PartyPopper, Sparkles } from 'lucide-react';

// ============= Confetti Component =============
interface ConfettiPieceProps {
  color: string;
  delay: number;
  x: number;
}

const ConfettiPiece = memo(function ConfettiPiece({ color, delay, x }: ConfettiPieceProps) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ backgroundColor: color, left: `${x}%` }}
      initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: window.innerHeight + 20,
        x: [0, Math.random() * 100 - 50],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay,
        ease: 'easeOut',
      }}
    />
  );
});

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  colors?: string[];
  count?: number;
}

export const Confetti = memo(function Confetti({
  isActive,
  duration = 3000,
  colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  count = 50,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<Array<{ id: number; color: string; delay: number; x: number }>>([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isActive && !prefersReducedMotion) {
      const newPieces = Array.from({ length: count }, (_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        x: Math.random() * 100,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, count, colors, duration, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {pieces.map(piece => (
          <ConfettiPiece key={piece.id} color={piece.color} delay={piece.delay} x={piece.x} />
        ))}
      </AnimatePresence>
    </div>
  );
});

// ============= Success Celebration Toast =============
interface CelebrationToastProps {
  isVisible: boolean;
  title: string;
  message?: string;
  icon?: 'success' | 'trophy' | 'star' | 'zap' | 'party' | 'sparkles';
  onClose: () => void;
  duration?: number;
}

const iconMap = {
  success: CheckCircle2,
  trophy: Trophy,
  star: Star,
  zap: Zap,
  party: PartyPopper,
  sparkles: Sparkles,
};

const iconColors = {
  success: 'text-success',
  trophy: 'text-amber-500',
  star: 'text-yellow-500',
  zap: 'text-primary',
  party: 'text-pink-500',
  sparkles: 'text-purple-500',
};

export const CelebrationToast = memo(function CelebrationToast({
  isVisible,
  title,
  message,
  icon = 'success',
  onClose,
  duration = 4000,
}: CelebrationToastProps) {
  const prefersReducedMotion = useReducedMotion();
  const Icon = iconMap[icon];

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
            'bg-card border border-border rounded-xl shadow-2xl',
            'px-5 py-4 flex items-center gap-4 min-w-[280px] max-w-[90vw]',
            'dark:bg-card/95 dark:backdrop-blur-xl dark:border-white/10'
          )}
        >
          <motion.div
            animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className={cn('p-2 rounded-full bg-background', iconColors[icon])}
          >
            <Icon className="w-6 h-6" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">{title}</h4>
            {message && <p className="text-sm text-muted-foreground truncate">{message}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============= Celebration Context =============
interface CelebrationContextType {
  celebrate: (options: Omit<CelebrationToastProps, 'isVisible' | 'onClose'>) => void;
  triggerConfetti: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
}

interface CelebrationProviderProps {
  children: ReactNode;
}

export const CelebrationProvider = memo(function CelebrationProvider({ children }: CelebrationProviderProps) {
  const [toast, setToast] = useState<Omit<CelebrationToastProps, 'isVisible' | 'onClose'> | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const celebrate = useCallback((options: Omit<CelebrationToastProps, 'isVisible' | 'onClose'>) => {
    setToast(options);
  }, []);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 100);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate, triggerConfetti }}>
      {children}
      <Confetti isActive={showConfetti} />
      {toast && (
        <CelebrationToast
          isVisible={!!toast}
          {...toast}
          onClose={handleCloseToast}
        />
      )}
    </CelebrationContext.Provider>
  );
});

// ============= Achievement Badge Animation =============
interface AchievementBadgeProps {
  isVisible: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
}

export const AchievementBadge = memo(function AchievementBadge({
  isVisible,
  title,
  subtitle,
  icon = <Trophy className="w-8 h-8" />,
  color = 'from-amber-400 to-orange-500',
}: AchievementBadgeProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className={cn(
              'px-6 py-4 rounded-2xl shadow-2xl',
              'bg-gradient-to-r text-white',
              color,
              'flex items-center gap-4'
            )}
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {icon}
            </motion.div>
            <div>
              <h4 className="font-bold text-lg">{title}</h4>
              {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============= Progress Milestone Animation =============
interface ProgressMilestoneProps {
  current: number;
  total: number;
  milestones?: number[];
  onMilestone?: (milestone: number) => void;
}

export const ProgressMilestone = memo(function ProgressMilestone({
  current,
  total,
  milestones = [25, 50, 75, 100],
  onMilestone,
}: ProgressMilestoneProps) {
  const percentage = Math.min(100, Math.round((current / total) * 100));
  const [lastMilestone, setLastMilestone] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const reached = milestones.filter(m => percentage >= m && m > lastMilestone);
    if (reached.length > 0) {
      const highest = Math.max(...reached);
      setLastMilestone(highest);
      onMilestone?.(highest);
    }
  }, [percentage, milestones, lastMilestone, onMilestone]);

  return (
    <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeOut' }}
      />
      {milestones.map(milestone => (
        <div
          key={milestone}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full transition-colors',
            percentage >= milestone ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
          style={{ left: `${milestone}%`, transform: 'translateX(-50%) translateY(-50%)' }}
        />
      ))}
    </div>
  );
});
