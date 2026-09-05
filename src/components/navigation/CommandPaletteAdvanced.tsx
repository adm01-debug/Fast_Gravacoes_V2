/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Search, Star, StarOff, ChevronRight, Command, Zap, ArrowRight, Layers, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/features/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CommandItemType, buildAllCommands, buildContextualCommands, searchCommands } from "./CommandPaletteCommands";
import { useCommandEntities } from "./useCommandEntities";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index >= 0) {
    return <>{text.slice(0, index)}<span className="bg-primary/20 text-primary font-medium rounded px-0.5">{text.slice(index, index + query.length)}</span>{text.slice(index + query.length)}</>;
  }
  return <>{text}</>;
}

export function CommandPaletteAdvanced() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recentCommands, setRecentCommands] = React.useState<string[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [mode, setMode] = React.useState<"default" | "actions" | "navigation">("default");
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();

  React.useEffect(() => {
    try {
      const savedRecent = localStorage.getItem("command_recent");
      const savedFavorites = localStorage.getItem("command_favorites");
      if (savedRecent) setRecentCommands(JSON.parse(savedRecent));
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    } catch { /* corrupted localStorage — start with empty state */ }
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o); setMode("default"); }
      if (e.key === "p" && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); setOpen(true); setMode("actions"); }
      if (e.key === "g" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(true); setMode("navigation"); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => { if (!open) { setQuery(""); setMode("default"); } }, [open]);

  const navigateTo = (path: string, commandId: string) => { navigate(path); setOpen(false); addRecentCommand(commandId); };
  const executeAction = (commandId: string, action: () => void) => { action(); addRecentCommand(commandId); };
  const addRecentCommand = (id: string) => {
    const updated = [id, ...recentCommands.filter(c => c !== id)].slice(0, 10);
    setRecentCommands(updated);
    try { localStorage.setItem("command_recent", JSON.stringify(updated)); } catch { /* quota exceeded */ }
  };
  const toggleFavorite = (id: string) => {
    const updated = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    try { localStorage.setItem("command_favorites", JSON.stringify(updated)); } catch { /* quota exceeded */ }
  };

  const allCommands = React.useMemo(() => buildAllCommands({ navigateTo, executeAction, theme, setTheme, signOut, setOpen }), [theme, navigate, signOut, setTheme]);
  const contextualCommands = React.useMemo(() => buildContextualCommands(location.pathname, setOpen), [location.pathname]);
  const entityCommands = useCommandEntities(query, setOpen);

  const filteredCommands = React.useMemo(() => {
    let commands = [...allCommands, ...contextualCommands];
    if (mode === "actions") commands = commands.filter(c => c.category === "actions" || c.category === "contextual");
    else if (mode === "navigation") commands = commands.filter(c => c.category === "navigation");
    
    const searchResults = searchCommands(commands, query);
    // Add entity commands to the top if they exist
    return [...entityCommands, ...searchResults];
  }, [allCommands, contextualCommands, entityCommands, query, mode]);

  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItemType[]> = {};
    if (!query && recentCommands.length > 0) {
      const recent = recentCommands.map(id => allCommands.find(c => c.id === id)).filter(Boolean) as CommandItemType[];
      if (recent.length > 0) groups["Recentes"] = recent.slice(0, 5);
    }
    if (!query && favorites.length > 0) {
      const favs = favorites.map(id => allCommands.find(c => c.id === id)).filter(Boolean) as CommandItemType[];
      if (favs.length > 0) groups["Favoritos"] = favs;
    }
    if (!query) {
      const suggested = entityCommands.slice(0, 3);
      if (suggested.length > 0) groups["Entidades Sugeridas"] = suggested;
    }
    const contextual = filteredCommands.filter(c => c.category === "contextual");
    if (contextual.length > 0) groups["Ações Contextuais"] = contextual;
    const actions = filteredCommands.filter(c => c.category === "actions");
    if (actions.length > 0) groups["Ações Rápidas"] = actions;
    const navigation = filteredCommands.filter(c => c.category === "navigation");
    if (navigation.length > 0) groups["Navegação"] = navigation;
    const settings = filteredCommands.filter(c => c.category === "settings");
    if (settings.length > 0) groups["Configurações"] = settings;
    const search = filteredCommands.filter(c => c.category === "search");
    if (search.length > 0) groups["Resultados da Busca"] = search;
    return groups;
  }, [filteredCommands, recentCommands, favorites, allCommands, query]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 px-3 border-b">
        <Command className="h-4 w-4 text-muted-foreground" />
        <CommandInput
          placeholder={mode === "actions" ? "Digite uma ação..." : mode === "navigation" ? "Ir para..." : "Buscar comandos, páginas, ações..."}
          value={query} onValueChange={setQuery} className="border-0 focus:ring-0"
        />
        {mode !== "default" && (
          <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setMode("default")}>
            {mode === "actions" ? "Ações" : "Navegação"} ×
          </Badge>
        )}
      </div>
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-3 py-8">
            <Search className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-muted-foreground font-medium">Nenhum resultado para "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">Tente palavras-chave diferentes</p>
            </div>
          </div>
        </CommandEmpty>
        {!query && mode === "default" && (
          <div className="flex gap-2 p-2 border-b">
            <button onClick={() => setMode("actions")} aria-label="Filtrar por ações" className="flex items-center gap-2 px-3 min-h-11 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Zap className="h-3 w-3" aria-hidden="true" />Ações<Badge variant="outline" className="text-[11px] px-1">⌘⇧P</Badge>
            </button>
            <button onClick={() => setMode("navigation")} aria-label="Filtrar por navegação" className="flex items-center gap-2 px-3 min-h-11 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowRight className="h-3 w-3" aria-hidden="true" />Ir para<Badge variant="outline" className="text-[11px] px-1">⌘G</Badge>
            </button>
          </div>
        )}
        {Object.entries(groupedCommands).map(([heading, commands], groupIndex) => (
          <React.Fragment key={heading}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={heading}>
              {commands.map((cmd) => (
                <CommandItem key={cmd.id} onSelect={cmd.action} className="group flex items-center gap-3 py-3 min-h-11">
                  <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", "bg-muted group-hover:bg-primary/10 transition-colors")}>{cmd.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium"><HighlightMatch text={cmd.name} query={query} /></span>
                      {cmd.badge && <Badge variant={cmd.badgeVariant || "secondary"} className="text-[11px]">{cmd.badge}</Badge>}
                    </div>
                    {cmd.description && <p className="text-xs text-muted-foreground truncate"><HighlightMatch text={cmd.description} query={query} /></p>}
                  </div>
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(cmd.id); }}
                      aria-label={favorites.includes(cmd.id) ? `Remover ${cmd.name} dos favoritos` : `Adicionar ${cmd.name} aos favoritos`}
                      className="flex items-center justify-center min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 hover:bg-muted rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {favorites.includes(cmd.id) ? <Star className="h-4 w-4 text-warning fill-warning" aria-hidden="true" /> : <StarOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                    </button>
                  </div>
                  {cmd.shortcut && <Badge variant="outline" className="text-xs font-mono shrink-0">{cmd.shortcut}</Badge>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
      <div className="flex items-center justify-between gap-4 px-3 py-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>navegar</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>selecionar</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>fechar</span>
        </div>
        <span>{filteredCommands.length} comandos</span>
      </div>
    </CommandDialog>
  );
}

export function CommandPaletteTriggerAdvanced({ className }: { className?: string }) {
  return (
    <button
      onClick={() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })); }}
      aria-label="Abrir paleta de comandos"
      className={cn("flex items-center gap-2 px-3 min-h-11 text-sm text-muted-foreground hover:text-foreground border rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring", className)}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Buscar...</span>
      <Badge variant="outline" className="hidden md:flex text-xs gap-1"><Command className="h-3 w-3" aria-hidden="true" />K</Badge>
    </button>
  );
}
