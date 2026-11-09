import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";

interface SwipeAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onAction: () => void;
}

interface SwipeActionsProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  disabled?: boolean;
}

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  disabled = false,
}: SwipeActionsProps) {
  const x = useMotionValue(0);
  const { trigger } = useHapticFeedback();
  const [, setIsDragging] = React.useState(false);
  const [actionTriggered, setActionTriggered] = React.useState<string | null>(null);

  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const leftScale = useTransform(x, [0, threshold], [0.8, 1]);
  const rightScale = useTransform(x, [-threshold, 0], [1, 0.8]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const offset = info.offset.x;

    if (Math.abs(offset) >= threshold) {
      if (offset > 0 && leftActions.length > 0) {
        const action = leftActions[0];
        setActionTriggered(action.id);
        trigger("success");
        setTimeout(() => {
          action.onAction();
          setActionTriggered(null);
        }, 200);
      } else if (offset < 0 && rightActions.length > 0) {
        const action = rightActions[0];
        setActionTriggered(action.id);
        trigger("success");
        setTimeout(() => {
          action.onAction();
          setActionTriggered(null);
        }, 200);
      }
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;

    // Haptic feedback when crossing threshold
    if (Math.abs(offset) >= threshold && !actionTriggered) {
      trigger("medium");
    }
  };

  if (disabled || (leftActions.length === 0 && rightActions.length === 0)) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden touch-pan-y">
      {/* Left actions */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-center px-4"
          style={{
            opacity: leftOpacity,
            scale: leftScale,
            backgroundColor: leftActions[0].bgColor,
          }}
        >
          <div className="flex items-center gap-2" style={{ color: leftActions[0].color }}>
            {leftActions[0].icon}
            <span className="text-sm font-medium">{leftActions[0].label}</span>
          </div>
        </motion.div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center px-4"
          style={{
            opacity: rightOpacity,
            scale: rightScale,
            backgroundColor: rightActions[0].bgColor,
          }}
        >
          <div className="flex items-center gap-2" style={{ color: rightActions[0].color }}>
            <span className="text-sm font-medium">{rightActions[0].label}</span>
            {rightActions[0].icon}
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Common swipe action presets
export const SwipeActionPresets = {
  delete: (onDelete: () => void): SwipeAction => ({
    id: "delete",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    label: "Excluir",
    color: "hsl(0, 0%, 100%)",
    bgColor: "hsl(0, 72%, 51%)",
    onAction: onDelete,
  }),

  archive: (onArchive: () => void): SwipeAction => ({
    id: "archive",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    label: "Arquivar",
    color: "hsl(0, 0%, 100%)",
    bgColor: "hsl(220, 14%, 46%)",
    onAction: onArchive,
  }),

  complete: (onComplete: () => void): SwipeAction => ({
    id: "complete",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: "Concluir",
    color: "hsl(0, 0%, 100%)",
    bgColor: "hsl(160, 84%, 39%)",
    onAction: onComplete,
  }),

  edit: (onEdit: () => void): SwipeAction => ({
    id: "edit",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    label: "Editar",
    color: "hsl(0, 0%, 100%)",
    bgColor: "hsl(234, 89%, 63%)",
    onAction: onEdit,
  }),

  favorite: (onFavorite: () => void): SwipeAction => ({
    id: "favorite",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    label: "Favoritar",
    color: "hsl(0, 0%, 100%)",
    bgColor: "hsl(45, 93%, 47%)",
    onAction: onFavorite,
  }),
};
