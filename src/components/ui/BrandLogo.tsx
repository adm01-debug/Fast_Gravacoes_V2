import React from 'react';
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className, 
  collapsed = false, 
  size = 'md',
  showSubtitle = true 
}) => {
  const sizes = {
    sm: { icon: 28, fontMain: "text-xs", fontSub: "text-[9px]", gap: "gap-2" },
    md: { icon: 40, fontMain: "text-sm", fontSub: "text-[10px]", gap: "gap-2.5" },
    lg: { icon: 56, fontMain: "text-lg", fontSub: "text-xs", gap: "gap-3" },
    xl: { icon: 80, fontMain: "text-2xl", fontSub: "text-sm", gap: "gap-4" },
  };

  const currentSize = sizes[size];

  return (
    <div className={cn("flex flex-col select-none min-w-0", className)}>
      <div className={cn("flex items-center", currentSize.gap)}>
        {/* Icon "F" */}
        <div
          className="relative flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10"
          style={{
            width: currentSize.icon,
            height: currentSize.icon,
            background: "linear-gradient(135deg, #FF5A1F 0%, #E84D15 100%)"
          }}
        >
          <span className="text-white font-black leading-none" style={{ fontSize: currentSize.icon * 0.55 }}>F</span>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/25 to-transparent pointer-events-none" />
        </div>

        {/* Title */}
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <h1 className={cn("font-extrabold tracking-tight text-white uppercase truncate leading-tight", currentSize.fontMain)}>
              FAST GRAVAÇÕES
            </h1>
            <span className={cn("font-medium tracking-wide text-zinc-400 uppercase truncate leading-tight", currentSize.fontSub)}>
              Gestão de Gravação
            </span>
          </div>
        )}
      </div>

      {/* Tagline */}
      {!collapsed && showSubtitle && (
        <p className={cn("font-bold tracking-[0.15em] text-muted-foreground uppercase truncate leading-none mt-1.5", currentSize.fontSub)}>
          QUALIDADE + VELOCIDADE
        </p>
      )}
    </div>
  );
};