import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  description?: string;
  id: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <nav aria-label="Progresso do formulário" className="flex items-center justify-between overflow-x-auto pb-4 scrollbar-none">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2 group min-w-[120px]">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-sm",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                      ? "border-primary text-primary ring-4 ring-primary/10"
                      : "border-muted bg-background text-muted-foreground"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 animate-in zoom-in-50 duration-300" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-bold transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground opacity-60 leading-tight mt-0.5 line-clamp-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {!isLast && (
                <div className="mx-2 flex-1 h-[2px] min-w-[20px] bg-muted relative top-[-16px]">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-in-out",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
