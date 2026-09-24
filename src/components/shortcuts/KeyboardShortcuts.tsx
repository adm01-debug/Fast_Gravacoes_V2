import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  action: () => void;
  category: "navigation" | "actions" | "view" | "help";
}

interface KeyboardShortcutsContextValue {
  showHelp: () => void;
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (keys: string[]) => void;
}

const KeyboardShortcutsContext = React.createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  const context = React.useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider");
  }
  return context;
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [shortcuts, setShortcuts] = React.useState<Shortcut[]>([]);

  // Default shortcuts
  const defaultShortcuts: Shortcut[] = React.useMemo(
    () => [
      // Navigation
      { keys: ["g", "h"], description: "Ir para Dashboard", action: () => navigate("/"), category: "navigation" },
      { keys: ["g", "k"], description: "Ir para Kanban", action: () => navigate("/kanban"), category: "navigation" },
      { keys: ["g", "c"], description: "Ir para Calendário", action: () => navigate("/calendar/daily"), category: "navigation" },
      { keys: ["g", "o"], description: "Ir para Operadores", action: () => navigate("/operators"), category: "navigation" },
      { keys: ["g", "m"], description: "Ir para Máquinas", action: () => navigate("/machines"), category: "navigation" },
      { keys: ["g", "s"], description: "Ir para Configurações", action: () => navigate("/settings"), category: "navigation" },

      // Actions
      { keys: ["n"], description: "Nova Ordem", action: () => navigate("/new-job"), category: "actions" },
      { keys: ["s"], description: "Abrir Scanner", action: () => navigate("/scanner"), category: "actions" },

      // View
      { keys: ["t"], description: "Alternar Tema", action: () => setTheme(theme === "dark" ? "light" : "dark"), category: "view" },
      { keys: ["Escape"], description: "Fechar Modal/Dialog", action: () => {}, category: "view" },

      // Help
      { keys: ["?"], description: "Mostrar Atalhos", action: () => setIsHelpOpen(true), category: "help" },
    ],
    [navigate, theme, setTheme]
  );

  const allShortcuts = React.useMemo(
    () => [...defaultShortcuts, ...shortcuts],
    [defaultShortcuts, shortcuts]
  );

  // Track key sequence for multi-key shortcuts
  const [keySequence, setKeySequence] = React.useState<string[]>([]);
  const sequenceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Handle Command+K separately (Command Palette)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        return; // Let Command Palette handle this
      }

      const key = e.key.toLowerCase();

      // Clear timeout and add key to sequence
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }

      const newSequence = [...keySequence, key];
      setKeySequence(newSequence);

      // Check for matching shortcut
      const matchingShortcut = allShortcuts.find((s) =>
        s.keys.every((k, i) => k.toLowerCase() === newSequence[i]?.toLowerCase())
      );

      if (matchingShortcut && matchingShortcut.keys.length === newSequence.length) {
        e.preventDefault();
        matchingShortcut.action();
        setKeySequence([]);
        return;
      }

      // Check if current sequence could lead to a valid shortcut
      const possibleMatch = allShortcuts.some((s) =>
        s.keys.slice(0, newSequence.length).every(
          (k, i) => k.toLowerCase() === newSequence[i]?.toLowerCase()
        )
      );

      if (!possibleMatch) {
        setKeySequence([]);
      } else {
        // Set timeout to reset sequence
        sequenceTimeout.current = setTimeout(() => {
          setKeySequence([]);
        }, 1000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keySequence, allShortcuts]);

  const contextValue: KeyboardShortcutsContextValue = React.useMemo(
    () => ({
      showHelp: () => setIsHelpOpen(true),
      registerShortcut: (shortcut: Shortcut) => {
        setShortcuts((prev) => [...prev.filter((s) => s.keys.join("") !== shortcut.keys.join("")), shortcut]);
      },
      unregisterShortcut: (keys: string[]) => {
        setShortcuts((prev) => prev.filter((s) => s.keys.join("") !== keys.join("")));
      },
    }),
    []
  );

  const categorizedShortcuts = React.useMemo(() => {
    const categories: Record<string, Shortcut[]> = {
      navigation: [],
      actions: [],
      view: [],
      help: [],
    };

    allShortcuts.forEach((s) => {
      categories[s.category].push(s);
    });

    return categories;
  }, [allShortcuts]);

  const categoryLabels: Record<string, string> = {
    navigation: "Navegação",
    actions: "Ações",
    view: "Visualização",
    help: "Ajuda",
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}

      {/* Key sequence indicator */}
      {keySequence.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-lg bg-card border shadow-lg">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          {keySequence.map((key, i) => (
            <Badge key={i} variant="secondary">
              {key}
            </Badge>
          ))}
        </div>
      )}

      {/* Help dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
               Atalhos de Teclado
            </DialogTitle>
            <DialogDescription className="sr-only">
              Lista de atalhos de teclado disponíveis para navegação e ações rápidas no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(categorizedShortcuts).map(([category, items]) => (
              items.length > 0 && (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {categoryLabels[category]}
                  </h3>
                  <div className="space-y-2">
                    {items.map((shortcut) => (
                      <div
                        key={shortcut.keys.join("")}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && <span className="text-muted-foreground">+</span>}
                              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                                {key === "?" ? "Shift + /" : key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Pressione <kbd className="px-1.5 py-0.5 text-xs text-foreground bg-muted rounded border mx-1">Cmd</kbd>
              <kbd className="px-1.5 py-0.5 text-xs text-foreground bg-muted rounded border">K</kbd> para abrir a busca rápida
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </KeyboardShortcutsContext.Provider>
  );
}

// Hook for registering component-specific shortcuts
export function useRegisterShortcut(shortcut: Shortcut) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  React.useEffect(() => {
    registerShortcut(shortcut);
    return () => unregisterShortcut(shortcut.keys);
  }, [shortcut, registerShortcut, unregisterShortcut]);
}
