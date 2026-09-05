/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
import { useDevice } from "@/hooks/use-device";
import { motion, AnimatePresence } from "framer-motion";
import { SoundFeedback } from "@/lib/soundFeedback";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { trigger } = useHapticFeedback();
  const { isMobile } = useDevice();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Only show if not on home/dashboard or utility pages
    const isExcluded = ["/", "/operator", "/auth", "/reset-password", "/install", "/track"].includes(location.pathname);
    setCanGoBack(!isExcluded);
  }, [location]);

  const handleBack = useCallback(() => {
    trigger('light');
    SoundFeedback.navBack();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate, trigger]);

  if (!canGoBack) return null;

  if (isMobile) {
    return null; // Integrated into MobileNavigation
  }

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={cn(
              "gap-2 px-3 h-10 text-muted-foreground hover:text-primary transition-all duration-300",
              "border-2 border-transparent hover:border-primary/20 rounded-xl group/back",
              "hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] active:scale-95",
              className
            )}
            aria-label="Voltar para a página anterior"
            aria-keyshortcuts="Alt+ArrowLeft"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/30 group-hover/back:bg-primary/20 transition-colors">
              <ChevronLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">Voltar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>Voltar</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌥</span>←
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
