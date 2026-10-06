import * as React from "react";
import { OnboardingTour, useOnboarding } from "@/components/onboarding/OnboardingTour";
import { CommandPaletteAdvanced } from "@/components/navigation/CommandPaletteAdvanced";
import { KeyboardShortcutsProvider } from "@/components/shortcuts/KeyboardShortcuts";
import { ToastContainer } from "@/features/notifications/components/ToastWithUndo";

interface ProductDesignProviderProps {
  children: React.ReactNode;
  enableOnboarding?: boolean;
  enableCommandPalette?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableToastWithUndo?: boolean;
}

/**
 * ProductDesignProvider - Wraps the app with all Product Design improvements
 *
 * Features included:
 * - Onboarding Tour (first-time user experience)
 * - Command Palette (Cmd+K for quick navigation)
 * - Keyboard Shortcuts (vim-like navigation)
 * - Toast with Undo (undoable notifications)
 *
 * Note: the floating AI assistant button lives in MainLayout (AssistantButton).
 */
export function ProductDesignProvider({
  children,
  enableOnboarding = true,
  enableCommandPalette = true,
  enableKeyboardShortcuts = true,
  enableToastWithUndo = true,
}: ProductDesignProviderProps) {
  const { showTour, setShowTour } = useOnboarding();

  const content = (
    <>
      {children}

      {/* Onboarding Tour */}
      {enableOnboarding && (
        <OnboardingTour
          isOpen={showTour}
          onClose={() => setShowTour(false)}
          onComplete={() => setShowTour(false)}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      {enableCommandPalette && <CommandPaletteAdvanced />}

      {/* Toast Container for undoable notifications */}
      {enableToastWithUndo && <ToastContainer />}

    </>
  );

  // Wrap with keyboard shortcuts provider if enabled
  if (enableKeyboardShortcuts) {
    return <KeyboardShortcutsProvider>{content}</KeyboardShortcutsProvider>;
  }

  return content;
}
