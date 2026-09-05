import * as React from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Undo2, Check, AlertCircle, Info, AlertTriangle, Loader2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeUrl } from "@/lib/sanitize";

type ToastType = "success" | "error" | "warning" | "info" | "default" | "loading" | "promise";

// Extend Window interface for toast manager
interface ToastManager {
  addToast: (options: Omit<UndoableToast, "id"> & { type?: ToastType }) => string;
  updateToast: (id: string, updates: Partial<UndoableToast>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

declare global {
  interface Window {
    __toastManager?: ToastManager;
  }
}

interface UndoableToast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  copyText?: string;
  link?: {
    href: string;
    label: string;
  };
}

interface ToastWithUndoProps extends UndoableToast {
  onDismiss: (id: string) => void;
}

const typeConfig: Record<
  ToastType,
  { icon: React.ReactNode; className: string; progressColor: string }
> = {
  success: {
    icon: <Check className="h-5 w-5 text-success" />,
    className: "border-success/30 bg-gradient-to-r from-success/5 to-success/10",
    progressColor: "bg-success",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-destructive" />,
    className: "border-destructive/30 bg-gradient-to-r from-destructive/5 to-destructive/10",
    progressColor: "bg-destructive",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    className: "border-warning/30 bg-gradient-to-r from-warning/5 to-warning/10",
    progressColor: "bg-warning",
  },
  info: {
    icon: <Info className="h-5 w-5 text-info" />,
    className: "border-info/30 bg-gradient-to-r from-info/5 to-info/10",
    progressColor: "bg-info",
  },
  default: {
    icon: <Info className="h-5 w-5 text-muted-foreground" />,
    className: "border-border bg-card",
    progressColor: "bg-primary",
  },
  loading: {
    icon: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
    className: "border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10",
    progressColor: "bg-primary",
  },
  promise: {
    icon: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
    className: "border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10",
    progressColor: "bg-primary",
  },
};

function ToastItem({
  id,
  title,
  description,
  type = "default",
  duration = 5000,
  onUndo,
  undoLabel = "Desfazer",
  action,
  copyText,
  link,
  onDismiss,
}: ToastWithUndoProps) {
  const [progress, setProgress] = React.useState(100);
  const [isPaused, setIsPaused] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const config = typeConfig[type];

  // Swipe to dismiss
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);

  React.useEffect(() => {
    if (isPaused || type === "loading" || type === "promise") return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        if (newProgress <= 0) {
          onDismiss(id);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [id, duration, isPaused, onDismiss, type]);

  const handleUndo = () => {
    onUndo?.();
    onDismiss(id);
  };

  const handleCopy = async () => {
    if (copyText) {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onDismiss(id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      style={{ x, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm cursor-grab active:cursor-grabbing ${config.className}`}
    >
      <div className="flex items-start gap-3 p-4">
        <motion.div
          className="flex-shrink-0 mt-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
        >
          {config.icon}
        </motion.div>

        <div className="flex-1 min-w-0">
          <motion.p
            className="font-medium text-sm text-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.p>
          {description && (
            <motion.p
              className="text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {description}
            </motion.p>
          )}

          {/* Actions Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {onUndo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                className="h-7 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
              >
                <Undo2 className="h-3.5 w-3.5 mr-1" />
                {undoLabel}
              </Button>
            )}

            {action && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  action.onClick();
                  onDismiss(id);
                }}
                className="h-7 px-2"
              >
                {action.icon}
                {action.label}
              </Button>
            )}

            {copyText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-success" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            )}

            {link && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(sanitizeUrl(link.href), "_blank")}
                className="h-7 px-2"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                {link.label}
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 hover:bg-muted/50"
          onClick={() => onDismiss(id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar - only show for timed toasts */}
      {type !== "loading" && type !== "promise" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
          <motion.div
            className={`h-full ${config.progressColor}`}
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Swipe indicator */}
      <motion.div
        className="absolute inset-y-0 right-0 w-1 bg-destructive/50"
        style={{ scaleY: useTransform(x, [0, 100], [0, 1]) }}
      />
    </motion.div>
  );
}

// Toast container and manager
interface ToastContainerProps {
  position?:
    | "top-left"
    | "top-right"
    | "top-center"
    | "bottom-left"
    | "bottom-right"
    | "bottom-center";
  maxToasts?: number;
}

export function ToastContainer({
  position = "bottom-right",
  maxToasts = 5,
}: ToastContainerProps) {
  const [toasts, setToasts] = React.useState<UndoableToast[]>([]);

  // Expose toast methods globally
  React.useEffect(() => {
    const addToast = (toast: Omit<UndoableToast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev.slice(-(maxToasts - 1)), { ...toast, id }]);
      return id;
    };

    const updateToast = (id: string, updates: Partial<UndoableToast>) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    };

    const dismissToast = (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const clearToasts = () => {
      setToasts([]);
    };

    window.__toastManager = { addToast, updateToast, dismissToast, clearToasts };

    return () => {
      delete window.__toastManager;
    };
  }, [maxToasts]);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-20 md:bottom-4 left-4",
    "bottom-right": "bottom-20 md:bottom-4 right-4",
    "bottom-center": "bottom-20 md:bottom-4 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none ${positionClasses[position]}`}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem {...toast} onDismiss={handleDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helper function to show toasts
export function showToast(
  options: Omit<UndoableToast, "id"> & { type?: ToastType }
) {
  if (window.__toastManager) {
    return window.__toastManager.addToast(options);
  }
  return null;
}

// Convenience methods
export const toast = {
  success: (title: string, options?: Partial<Omit<UndoableToast, "id" | "type">>) =>
    showToast({ title, type: "success", ...options }),

  error: (title: string, options?: Partial<Omit<UndoableToast, "id" | "type">>) =>
    showToast({ title, type: "error", duration: 8000, ...options }),

  warning: (title: string, options?: Partial<Omit<UndoableToast, "id" | "type">>) =>
    showToast({ title, type: "warning", ...options }),

  info: (title: string, options?: Partial<Omit<UndoableToast, "id" | "type">>) =>
    showToast({ title, type: "info", ...options }),

  loading: (title: string, options?: Partial<Omit<UndoableToast, "id" | "type">>) =>
    showToast({ title, type: "loading", ...options }),

  undo: (
    title: string,
    onUndo: () => void,
    options?: Partial<Omit<UndoableToast, "id" | "type" | "onUndo">>
  ) =>
    showToast({
      title,
      type: "success",
      onUndo,
      duration: 8000,
      ...options,
    }),

  // Promise toast - shows loading, then success/error
  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ): Promise<T> => {
    const id = showToast({ title: messages.loading, type: "loading" });

    try {
      const result = await promise;
      window.__toastManager?.updateToast(String(id), {
        title: typeof messages.success === "function" ? messages.success(result) : messages.success,
        type: "success",
        duration: 5000,
      });
      return result;
    } catch (err) {
      window.__toastManager?.updateToast(String(id), {
        title: typeof messages.error === "function" ? messages.error(err as Error) : messages.error,
        type: "error",
        duration: 8000,
      });
      throw err;
    }
  },

  // Dismiss a specific toast
  dismiss: (id: string) => {
    window.__toastManager?.dismissToast(id);
  },

  // Clear all toasts
  clear: () => {
    window.__toastManager?.clearToasts();
  },
};
