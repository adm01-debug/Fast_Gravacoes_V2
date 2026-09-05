/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ============= ELEGANT LOADING SPINNERS =============

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'white';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorMap = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  white: 'text-white',
};

// Simple rotating spinner
export function Spinner({ size = 'md', variant = 'default', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin',
        sizeMap[size],
        colorMap[variant],
        className
      )}
    />
  );
}

// Dots loading animation
interface DotsLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DotsLoader({ size = 'md', className }: DotsLoaderProps) {
  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-primary', dotSizes[size])}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Pulse ring loader
export function PulseLoader({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  return (
    <div className={cn('relative', sizes[size], className)}>
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20"
        animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />
      <div className="absolute inset-[25%] rounded-full bg-primary" />
    </div>
  );
}

// Progress bar loader
interface ProgressLoaderProps {
  progress?: number;
  indeterminate?: boolean;
  className?: string;
  showPercentage?: boolean;
}

export function ProgressLoader({
  progress = 0,
  indeterminate = false,
  className,
  showPercentage = false,
}: ProgressLoaderProps) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        {indeterminate ? (
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </div>
      {showPercentage && !indeterminate && (
        <p className="text-xs text-muted-foreground text-center">{progress}%</p>
      )}
    </div>
  );
}

// Full page loader
interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message, className }: PageLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <PulseLoader size="xl" />
      </motion.div>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

// Inline loading with text
interface InlineLoaderProps {
  text?: string;
  className?: string;
}

export function InlineLoader({ text = 'Carregando...', className }: InlineLoaderProps) {
  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <Spinner size="sm" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// Button loading state
interface ButtonLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export function ButtonLoader({
  isLoading,
  children,
  loadingText = 'Processando...',
  className
}: ButtonLoaderProps) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      {isLoading ? (
        <>
          <Spinner size="sm" variant="white" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

// Skeleton with shimmer effect
interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function ShimmerSkeleton({ className, rounded = 'md', style, ...props }: ShimmerSkeletonProps) {
  const roundedMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      {...props}
      style={{ backgroundSize: '200% 100%', ...style }}
      className={cn(
        'relative overflow-hidden bg-muted',
        roundedMap[rounded],
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-background/50 before:to-transparent',
        'before:animate-shimmer',
        className
      )}
    />
  );
}

// Avatar skeleton
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  return <ShimmerSkeleton className={sizes[size]} rounded="full" />;
}

// Text skeleton
interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className="h-4"
          style={{ width: `${100 - i * 15 - Math.random() * 10}%` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default {
  Spinner,
  DotsLoader,
  PulseLoader,
  ProgressLoader,
  PageLoader,
  InlineLoader,
  ButtonLoader,
  ShimmerSkeleton,
  AvatarSkeleton,
  TextSkeleton,
};
