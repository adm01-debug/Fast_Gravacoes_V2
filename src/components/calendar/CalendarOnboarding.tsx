import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Filter, Keyboard, Move, LayoutGrid, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface CalendarOnboardingProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Filter,
    title: 'Filtros poderosos',
    desc: 'Combine técnica, máquina, status, prioridade e cliente. Tudo é salvo automaticamente para sua próxima visita.',
  },
  {
    icon: Keyboard,
    title: 'Atalhos de teclado',
    desc: 'Use ← → para navegar dias · T para ir ao hoje · F para filtros · / para busca · 1/2 para alternar visões.',
  },
  {
    icon: Move,
    title: 'Conflitos & ocupação',
    desc: 'Blocos com borda vermelha pulsante indicam sobreposição de horários. Ative o mapa de ocupação 🔥 no toolbar.',
  },
  {
    icon: LayoutGrid,
    title: 'Múltiplas visões',
    desc: 'Diária, Semanal e Mensal. Agrupe por máquina ou por técnica. Ajuste o zoom temporal a partir do toolbar.',
  },
];

export function CalendarOnboarding({ open, onClose }: CalendarOnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      setStep(0);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-title">
            <Sparkles className="h-5 w-5 text-primary" />
            Bem-vindo à nova Agenda
          </DialogTitle>
          <DialogDescription className="sr-only">Tour rápido pela agenda</DialogDescription>
        </DialogHeader>

        <div className="py-6 px-2">
          <div className="flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-center mb-2">{current.title}</h3>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">{current.desc}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLast ? 'Começar' : 'Próximo'}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
