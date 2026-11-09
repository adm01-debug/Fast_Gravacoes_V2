import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  className = "",
}: PullToRefreshProps) {
  const { ref, pulling, refreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    disabled,
    hapticFeedback: true,
  });

  const [refreshState] = React.useState<"idle" | "success" | "error">("idle");


  const showIndicator = pulling || refreshing || pullDistance > 0;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`relative overflow-y-auto overscroll-y-contain ${className}`}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{
              opacity: 1,
              y: Math.min(pullDistance - 40, 20),
            }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 flex justify-center z-10 pointer-events-none"
          >
            <motion.div
              className={`flex items-center justify-center w-10 h-10 rounded-full shadow-lg ${
                refreshState === "success"
                  ? "bg-success"
                  : refreshState === "error"
                  ? "bg-destructive"
                  : "bg-primary"
              }`}
              style={{
                scale: Math.min(progress, 1),
              }}
            >
              {refreshing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-5 w-5 text-primary-foreground" />
                </motion.div>
              ) : refreshState === "success" ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                >
                  <Check className="h-5 w-5 text-success-foreground" />
                </motion.div>
              ) : refreshState === "error" ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <AlertCircle className="h-5 w-5 text-destructive-foreground" />
                </motion.div>
              ) : (
                <motion.div
                  style={{
                    rotate: progress * 360,
                  }}
                >
                  <RefreshCw
                    className={`h-5 w-5 text-primary-foreground ${
                      progress >= 1 ? "opacity-100" : "opacity-70"
                    }`}
                  />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with transform */}
      <motion.div
        style={{
          transform: `translateY(${refreshing ? 60 : pullDistance}px)`,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {children}
      </motion.div>

      {/* Pull hint text */}
      <AnimatePresence>
        {pulling && !refreshing && progress < 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-0 right-0 text-center text-xs text-muted-foreground pointer-events-none"
          >
            Puxe para atualizar
          </motion.p>
        )}
        {pulling && !refreshing && progress >= 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-0 right-0 text-center text-xs text-primary font-medium pointer-events-none"
          >
            Solte para atualizar
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper component for mobile detection
interface MobilePullToRefreshProps extends PullToRefreshProps {
  enableOnDesktop?: boolean;
}

export function MobilePullToRefresh({
  enableOnDesktop = false,
  ...props
}: MobilePullToRefreshProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.innerWidth < 768
      );
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile && !enableOnDesktop) {
    return <>{props.children}</>;
  }

  return <PullToRefresh {...props} />;
}
