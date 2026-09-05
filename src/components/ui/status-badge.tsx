import { JobStatus } from '@/types/job';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import {
  Clock,
  ThumbsUp,
  Calendar,
  Play,
  CircleCheckBig,
  Pause,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Archive
} from 'lucide-react';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const statusConfig: Record<JobStatus, {
  label: string;
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
  glowClass?: string;
  animationClass?: string;
}> = {
  queue: {
    label: 'Na Fila',
    icon: Clock,
    bgClass: 'bg-muted dark:bg-muted/50',
    textClass: 'text-muted-foreground',
  },
  ready: {
    label: 'No Jeito',
    icon: ThumbsUp,
    bgClass: 'bg-status-ready',
    textClass: 'text-status-ready-foreground',
    glowClass: 'dark:shadow-[0_0_12px_hsl(45_100%_55%/0.4)]',
    animationClass: 'animate-pulse-soft',
  },
  scheduled: {
    label: 'Agendado',
    icon: Calendar,
    bgClass: 'bg-status-scheduled',
    textClass: 'text-status-scheduled-foreground',
    glowClass: 'dark:shadow-[0_0_12px_hsl(210_100%_60%/0.4)]',
  },
  production: {
    label: 'Em Produção',
    icon: Play,
    bgClass: 'bg-status-production',
    textClass: 'text-status-production-foreground',
    glowClass: 'dark:shadow-[0_0_16px_hsl(280_80%_60%/0.5)]',
    animationClass: 'streak-fire',
  },
  finished: {
    label: 'Finalizado',
    icon: CircleCheckBig,
    bgClass: 'bg-status-finished',
    textClass: 'text-status-finished-foreground',
    glowClass: 'dark:shadow-[0_0_12px_hsl(142_70%_50%/0.4)]',
  },
  paused: {
    label: 'Pausado',
    icon: Pause,
    bgClass: 'bg-status-paused',
    textClass: 'text-status-paused-foreground',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    bgClass: 'bg-status-cancelled',
    textClass: 'text-status-cancelled-foreground',
  },
  delayed: {
    label: 'Atrasado',
    icon: AlertTriangle,
    bgClass: 'bg-status-delayed',
    textClass: 'text-status-delayed-foreground',
    glowClass: 'dark:shadow-[0_0_16px_hsl(24_95%_55%/0.5)]',
    animationClass: 'streak-fire',
  },
  rework: {
    label: 'Retrabalho',
    icon: RotateCcw,
    bgClass: 'bg-status-rework',
    textClass: 'text-status-rework-foreground',
    glowClass: 'dark:shadow-[0_0_12px_hsl(280_80%_60%/0.4)]',
  },
  buffer: {
    label: 'Buffer',
    icon: Archive,
    bgClass: 'bg-indigo-500/20 dark:bg-indigo-500/10',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    glowClass: 'dark:shadow-[0_0_12px_hsl(240_80%_60%/0.3)]',
  },
  packaging: {
    label: 'Embalagem',
    icon: Archive,
    bgClass: 'bg-cyan-500/20 dark:bg-cyan-500/10',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    glowClass: 'dark:shadow-[0_0_12px_hsl(190_80%_60%/0.35)]',
  },
};

export function StatusBadge({ status, size = 'md', showIcon = true, animated = false, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const prevStatusRef = useRef(status);
  const [isPop, setIsPop] = useState(false);

  // Trigger pop animation when status changes
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      setIsPop(true);
      prevStatusRef.current = status;
      const timer = setTimeout(() => setIsPop(false), 300);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full transition-all duration-200',
        config.bgClass,
        config.textClass,
        config.glowClass,
        animated && config.animationClass,
        isPop && 'animate-pop',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], animated && status === 'production' && 'animate-pulse')} />}
      {config.label}
    </span>
  );
}
