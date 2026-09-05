import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Sparkles, Lightbulb, Target, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "body",
    title: "Bem-vindo ao FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO! 🎉",
    description: "Vamos fazer um tour rápido para você conhecer as principais funcionalidades do sistema.",
    icon: <Sparkles className="h-6 w-6 text-primary" />,
  },
  {
    id: "dashboard",
    target: "[data-tour='dashboard']",
    title: "Dashboard Principal",
    description: "Aqui você tem uma visão geral de todas as operações, KPIs e métricas importantes.",
    icon: <Target className="h-6 w-6 text-success" />,
  },
  {
    id: "navigation",
    target: "[data-tour='sidebar']",
    title: "Navegação Rápida",
    description: "Use a barra lateral para acessar todas as áreas do sistema. Dica: pressione Cmd+K para busca rápida!",
    icon: <Zap className="h-6 w-6 text-warning" />,
  },
  {
    id: "tips",
    target: "body",
    title: "Dicas Úteis",
    description: "Explore os atalhos de teclado, personalize seu dashboard e configure notificações para não perder nada!",
    icon: <Lightbulb className="h-6 w-6 text-coins" />,
  },
];

export function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [steps] = React.useState<TourStep[]>(DEFAULT_STEPS);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    localStorage.setItem("onboarding_completed", "true");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding_skipped", "true");
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div role="button" tabIndex={-1} aria-label="Fechar tour" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleSkip} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); handleSkip(); } }} />

        {/* Tour Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10"
        >
          <Card className="w-[90vw] max-w-md shadow-2xl border-primary/20">
            <CardHeader className="relative pb-2">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={handleSkip}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 200 }}
                  className="p-3 rounded-xl bg-primary/10"
                >
                  {step.icon}
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Passo {currentStep + 1} de {steps.length}
                  </p>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </div>
              </div>

              <Progress value={progress} className="h-1" />
            </CardHeader>

            <CardContent className="pt-4">
              <motion.p
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-muted-foreground"
              >
                {step.description}
              </motion.p>
            </CardContent>

            <CardFooter className="flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Pular Tour
              </Button>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}

                <Button size="sm" onClick={handleNext}>
                  {currentStep < steps.length - 1 ? (
                    <>
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Começar!
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Step Indicators */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2"
          role="tablist"
          aria-label="Etapas do tour"
        >
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentStep(index)}
              role="tab"
              aria-selected={index === currentStep}
              aria-label={`Ir para etapa ${index + 1} de ${steps.length}`}
              className={`min-h-6 min-w-6 flex items-center justify-center rounded-full transition-all ${
                index === currentStep
                  ? "w-10 bg-primary"
                  : index < currentStep
                  ? "w-6 bg-primary/50"
                  : "w-6 bg-muted"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="sr-only">Etapa {index + 1}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showTour, setShowTour] = React.useState(false);

  React.useEffect(() => {
    const completed = localStorage.getItem("onboarding_completed");
    const skipped = localStorage.getItem("onboarding_skipped");

    if (!completed && !skipped) {
      // Delay to allow page to load
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem("onboarding_completed");
    localStorage.removeItem("onboarding_skipped");
    setShowTour(true);
  };

  return {
    showTour,
    setShowTour,
    resetOnboarding,
  };
}
