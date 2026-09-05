/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Star,
  Zap,
  CheckCircle2,
  Sparkles,
  PartyPopper,
  Medal,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

type CelebrationType =
  | 'job-completed'
  | 'goal-achieved'
  | 'streak'
  | 'level-up'
  | 'first-time'
  | 'milestone';

interface CelebrationConfig {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  particleCount: number;
}

const celebrations: Record<CelebrationType, CelebrationConfig> = {
  'job-completed': {
    icon: CheckCircle2,
    title: 'Job Finalizado!',
    subtitle: 'Excelente trabalho!',
    color: 'text-success',
    particleCount: 12,
  },
  'goal-achieved': {
    icon: Target,
    title: 'Meta Alcançada!',
    subtitle: 'Você atingiu sua meta',
    color: 'text-primary',
    particleCount: 20,
  },
  'streak': {
    icon: Zap,
    title: 'Sequência Mantida!',
    subtitle: 'Continue assim!',
    color: 'text-streak',
    particleCount: 15,
  },
  'level-up': {
    icon: Star,
    title: 'Level Up!',
    subtitle: 'Novo nível desbloqueado',
    color: 'text-xp',
    particleCount: 25,
  },
  'first-time': {
    icon: Sparkles,
    title: 'Primeira Vez!',
    subtitle: 'Parabéns pelo marco',
    color: 'text-info',
    particleCount: 18,
  },
  'milestone': {
    icon: Trophy,
    title: 'Marco Atingido!',
    subtitle: 'Conquista desbloqueada',
    color: 'text-rank-gold',
    particleCount: 30,
  },
};

interface CelebrationMomentProps {
  type: CelebrationType;
  isVisible: boolean;
  onComplete?: () => void;
  customTitle?: string;
  customSubtitle?: string;
  duration?: number;
}

// Particle component for celebration effect
function Particle({ delay, color }: { delay: number; color: string }) {
  const randomX = Math.random() * 200 - 100;
  const randomY = Math.random() * -150 - 50;
  const randomRotation = Math.random() * 720 - 360;
  const randomScale = 0.5 + Math.random() * 0.5;

  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        x: randomX,
        y: randomY,
        scale: [0, randomScale, 0],
        rotate: randomRotation,
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: 'easeOut',
      }}
      className={cn(
        'absolute w-2 h-2 rounded-full',
        color
      )}
    />
  );
}

export function CelebrationMoment({
  type,
  isVisible,
  onComplete,
  customTitle,
  customSubtitle,
  duration = 2500,
}: CelebrationMomentProps) {
  const config = celebrations[type];
  const Icon = config.icon;
  const { trigger } = useHapticFeedback();

  useEffect(() => {
    if (isVisible) {
      trigger('success');

      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onComplete, trigger]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Background overlay with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
          />

          {/* Celebration content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="relative flex flex-col items-center"
          >
            {/* Particles */}
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: config.particleCount }).map((_, i) => (
                <Particle
                  key={i}
                  delay={i * 0.02}
                  color={i % 2 === 0 ? 'bg-primary' : 'bg-accent'}
                />
              ))}
            </div>

            {/* Icon with glow */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center mb-4',
                'bg-card border-2 shadow-2xl',
                config.color === 'text-success' && 'border-success/50',
                config.color === 'text-primary' && 'border-primary/50',
                config.color === 'text-xp' && 'border-xp/50',
                config.color === 'text-streak' && 'border-streak/50',
                config.color === 'text-info' && 'border-info/50',
                config.color === 'text-rank-gold' && 'border-rank-gold/50',
              )}
              style={{
                boxShadow: `0 0 60px -10px currentColor`,
              }}
            >
              <Icon className={cn('w-12 h-12', config.color)} />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                'text-display text-foreground',
                'text-center'
              )}
            >
              {customTitle || config.title}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-center mt-1"
            >
              {customSubtitle || config.subtitle}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to trigger celebrations
export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    type: CelebrationType;
    title?: string;
    subtitle?: string;
  } | null>(null);

  const celebrate = useCallback((
    type: CelebrationType,
    options?: { title?: string; subtitle?: string }
  ) => {
    setCelebration({ type, ...options });
  }, []);

  const dismiss = useCallback(() => {
    setCelebration(null);
  }, []);

  const CelebrationComponent = celebration ? (
    <CelebrationMoment
      type={celebration.type}
      isVisible={true}
      onComplete={dismiss}
      customTitle={celebration.title}
      customSubtitle={celebration.subtitle}
    />
  ) : null;

  return { celebrate, dismiss, CelebrationComponent };
}

// Mini celebration for inline success states
interface MiniCelebrationProps {
  isVisible: boolean;
  className?: string;
}

export function MiniCelebration({ isVisible, className }: MiniCelebrationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={cn('inline-flex', className)}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 0.5,
              repeat: 2,
              repeatType: 'loop',
            }}
          >
            <PartyPopper className="w-5 h-5 text-rank-gold" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
