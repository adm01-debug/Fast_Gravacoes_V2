/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { Moon, Sun, Volume2, VolumeX, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useThemeSound } from '@/hooks/useThemeSound';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function ThemeTransitionOverlay({ isVisible, isDark }: { isVisible: boolean; isDark: boolean }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`
        fixed inset-0 pointer-events-none z-[9999]
        transition-opacity duration-500 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        background: isDark
          ? 'radial-gradient(circle at center, hsl(var(--primary) / 0.14) 0%, hsl(var(--background) / 0.72) 100%)'
          : 'radial-gradient(circle at center, hsl(var(--muted) / 0.7) 0%, hsl(var(--background) / 0.55) 100%)',
        backdropFilter: isVisible ? 'blur(2px)' : 'blur(0px)',
      }}
    />,
    document.body
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const { playLightModeSound, playDarkModeSound, soundEnabled, toggleSound } = useThemeSound();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const goingToDark = resolvedTheme !== 'dark';

    setShowOverlay(true);
    setIsAnimating(true);

    // Play appropriate sound
    if (goingToDark) {
      playDarkModeSound();
    } else {
      playLightModeSound();
    }

    // Slight delay before theme change for cinematic effect
    setTimeout(() => {
      setTheme(goingToDark ? 'dark' : 'light');
    }, 150);

    // Hide overlay after transition
    setTimeout(() => {
      setShowOverlay(false);
      setIsAnimating(false);
    }, 600);
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        disabled
        aria-label="Carregando controle de tema"
      >
        <span className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <>
      <ThemeTransitionOverlay isVisible={showOverlay} isDark={!isDark} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'relative h-9 w-9 overflow-hidden transition-all duration-300 ease-out rounded-xl',
              'hover:bg-accent/80 hover:scale-110 active:scale-95 shadow-lg shadow-black/5',
              isAnimating && 'scale-90 opacity-80'
            )}
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {/* Sun icon */}
            <Sun
              className={`
                absolute h-4 w-4
                ${isDark
                  ? 'rotate-90 scale-0 opacity-0 transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]'
                  : 'scale-100 opacity-100 animate-[spin_8s_linear_infinite]'
                }
              `}
              style={{
                filter: isDark ? 'none' : 'drop-shadow(0 0 6px hsl(var(--warning) / 0.6))'
              }}
            />

            {/* Moon icon */}
            <Moon
              className={`
                absolute h-4 w-4
                ${isDark
                  ? 'rotate-0 scale-100 opacity-100 animate-[pulse_3s_ease-in-out_infinite]'
                  : '-rotate-90 scale-0 opacity-0 transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]'
                }
              `}
              style={{
                filter: isDark ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6))' : 'none'
              }}
            />

            {/* Ripple effect on click */}
            {isAnimating && (
              <span
                className={`
                  absolute inset-0 rounded-md
                  animate-ping
                  ${isDark ? 'bg-primary/20' : 'bg-warning/20'}
                `}
                style={{ animationDuration: '400ms', animationIterationCount: 1 }}
              />
            )}

            {/* Sound muted indicator */}
            {!soundEnabled && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-muted-foreground/60 flex items-center justify-center"
                title="Som desativado"
              >
                <VolumeX className="h-1.5 w-1.5 text-background" />
              </span>
            )}

            <span className="sr-only">
              {isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={handleToggle} className="cursor-pointer">
            {isDark ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>Tema Escuro</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
            <Monitor className="mr-2 h-4 w-4" />
            <span>Usar Sistema</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={toggleSound} className="cursor-pointer">
            {soundEnabled ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                <span>Desativar Som</span>
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                <span>Ativar Som</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
