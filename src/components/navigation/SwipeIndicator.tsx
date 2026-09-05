/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function SwipeIndicator() {
  const location = useLocation();
  const isRoot = location.pathname === '/' || location.pathname === '/operator' || location.pathname === '/auth';
  const { direction, distance, swiping } = useSwipeGesture({
    threshold: 80,
    preventScroll: false
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (swiping && direction === 'right' && !isRoot) {
      setIsVisible(true);
    } else if (!swiping) {
      setTimeout(() => setIsVisible(false), 200);
    }
  }, [swiping, direction, isRoot]);

  if (isRoot) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-12 z-[100] pointer-events-none flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.8 }}
        animate={{ 
          opacity: isVisible ? Math.min(distance / 150, 0.8) : 0,
          x: isVisible ? Math.min(distance / 4, 20) - 20 : -20,
          scale: isVisible ? Math.min(0.8 + distance / 400, 1.2) : 0.8
        }}
        className={cn(
          "w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30",
          distance > 80 && "bg-primary/40 border-primary/60 scale-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
        )}
      >
        <ArrowLeft className={cn(
          "h-6 w-6 text-primary transition-transform",
          distance > 80 && "scale-110"
        )} />
      </motion.div>
    </div>
  );
}
