import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, PartyPopper, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= FEEDBACK TOAST =============

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'celebration';

const iconMap: Record<FeedbackType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
  celebration: PartyPopper,
};

const colorMap: Record<FeedbackType, string> = {
  success: 'text-green-500',
  error: 'text-destructive',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
  loading: 'text-primary',
  celebration: 'text-warning',
};

interface FeedbackToastProps {
  type: FeedbackType;
  title: string;
  message?: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function FeedbackToast({ type, title, message, isVisible, onClose, duration = 4000, action }: FeedbackToastProps) {
  const Icon = iconMap[type];

  useEffect(() => {
    if (isVisible && type !== 'loading') {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose, type]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
            <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', colorMap[type], type === 'loading' && 'animate-spin')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{title}</p>
              {message && <p className="text-xs text-muted-foreground mt-0.5">{message}</p>}
              {action && (
                <button
                  onClick={action.onClick}
                  className="text-xs text-primary hover:underline mt-1 font-medium"
                >
                  {action.label}
                </button>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============= FEEDBACK CONTEXT =============

interface FeedbackOptions {
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface FeedbackContextType {
  showFeedback: (options: FeedbackOptions) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showLoading: (title: string, message?: string) => void;
  showCelebration: (title: string, message?: string) => void;
  hideFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

interface FeedbackProviderProps {
  children: ReactNode;
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [feedback, setFeedback] = useState<FeedbackOptions | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showFeedback = useCallback((options: FeedbackOptions) => {
    setFeedback(options);
    setIsVisible(true);
  }, []);

  const hideFeedback = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setFeedback(null), 300);
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showFeedback({ type: 'success', title, message });
  }, [showFeedback]);

  const showError = useCallback((title: string, message?: string) => {
    showFeedback({ type: 'error', title, message });
  }, [showFeedback]);

  const showWarning = useCallback((title: string, message?: string) => {
    showFeedback({ type: 'warning', title, message });
  }, [showFeedback]);

  const showInfo = useCallback((title: string, message?: string) => {
    showFeedback({ type: 'info', title, message });
  }, [showFeedback]);

  const showLoading = useCallback((title: string, message?: string) => {
    showFeedback({ type: 'loading', title, message });
  }, [showFeedback]);

  const showCelebration = useCallback((title: string, message?: string) => {
    showFeedback({ type: 'celebration', title, message });
  }, [showFeedback]);

  return (
    <FeedbackContext.Provider
      value={{
        showFeedback,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showLoading,
        showCelebration,
        hideFeedback,
      }}
    >
      {children}
      {feedback && (
        <FeedbackToast
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          isVisible={isVisible}
          onClose={hideFeedback}
          duration={feedback.duration}
          action={feedback.action}
        />
      )}
    </FeedbackContext.Provider>
  );
}

export default FeedbackProvider;
