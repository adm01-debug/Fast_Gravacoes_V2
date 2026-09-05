/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============= SMOOTH CONTENT TRANSITIONS =============

interface ContentTransitionProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minLoadTime?: number;
  fadeDelay?: number;
}

/**
 * Smooth transition between loading skeleton and content
 * - Prevents flash of loading state for fast loads
 * - Ensures minimum display time for skeleton (prevents jarring UX)
 * - Elegant fade transition between states
 */
export function ContentTransition({
  isLoading,
  skeleton,
  children,
  className,
  minLoadTime = 400,
  fadeDelay = 100,
}: ContentTransitionProps) {
  const [showContent, setShowContent] = useState(!isLoading);
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const loadStartRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (isLoading) {
      loadStartRef.current = Date.now();
      setShowContent(false);

      // Show skeleton after small delay to prevent flash
      const timer = setTimeout(() => setShowSkeleton(true), fadeDelay);
      return () => clearTimeout(timer);
    } else {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadTime - elapsed);

      const timer = setTimeout(() => {
        setShowSkeleton(false);
        setShowContent(true);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [isLoading, minLoadTime, fadeDelay]);

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {showSkeleton && isLoading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {skeleton}
          </motion.div>
        )}

        {showContent && !isLoading && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Staggered list transition
interface StaggeredListProps {
  children: React.ReactNode[];
  isLoading?: boolean;
  skeleton?: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredList({
  children,
  isLoading = false,
  skeleton,
  className,
  staggerDelay = 0.05,
}: StaggeredListProps) {
  if (isLoading && skeleton) {
    return <div className={className}>{skeleton}</div>;
  }

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: index * staggerDelay,
            ease: 'easeOut',
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

// Fade transition wrapper
interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export function FadeTransition({
  show,
  children,
  className,
  duration = 0.2,
}: FadeTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Scale fade transition
interface ScaleFadeProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ScaleFade({ show, children, className }: ScaleFadeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Slide transition
interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export function SlideTransition({
  show,
  children,
  direction = 'up',
  className,
}: SlideTransitionProps) {
  const offsets = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, ...offsets[direction] }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...offsets[direction] }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Loading overlay for async operations
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  spinner?: React.ReactNode;
  blur?: boolean;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  children,
  spinner,
  blur = true,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute inset-0 z-10 flex items-center justify-center bg-background/60',
              blur && 'backdrop-blur-sm'
            )}
          >
            {spinner || (
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default {
  ContentTransition,
  StaggeredList,
  FadeTransition,
  ScaleFade,
  SlideTransition,
  LoadingOverlay,
};
