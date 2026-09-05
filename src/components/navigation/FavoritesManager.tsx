/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import * as React from "react";
import { Star, StarOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence, Reorder } from "framer-motion";

interface FavoriteItem {
  id: string;
  path: string;
  name: string;
  icon?: string;
}

const STORAGE_KEY = "user_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        // Favoritos corrompidos no localStorage: ignora e mantém a lista vazia.
      }
    }
  }, []);

  const saveFavorites = (items: FavoriteItem[]) => {
    setFavorites(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* quota exceeded */ }
  };

  const addFavorite = (item: Omit<FavoriteItem, "id">) => {
    const exists = favorites.some((f) => f.path === item.path);
    if (exists) {
      toast({
        title: "Já nos favoritos",
        description: `${item.name} já está na sua lista de favoritos.`,
      });
      return;
    }

    const newItem: FavoriteItem = {
      ...item,
      id: `fav-${Date.now()}`,
    };

    saveFavorites([...favorites, newItem]);
    toast({
      title: "Adicionado aos favoritos",
      description: `${item.name} foi adicionado à sua lista.`,
    });
  };

  const removeFavorite = (id: string) => {
    const item = favorites.find((f) => f.id === id);
    saveFavorites(favorites.filter((f) => f.id !== id));
    if (item) {
      toast({
        title: "Removido dos favoritos",
        description: `${item.name} foi removido da sua lista.`,
      });
    }
  };

  const isFavorite = (path: string) => favorites.some((f) => f.path === path);

  const toggleFavorite = (item: Omit<FavoriteItem, "id">) => {
    const existing = favorites.find((f) => f.path === item.path);
    if (existing) {
      removeFavorite(existing.id);
    } else {
      addFavorite(item);
    }
  };

  const reorderFavorites = (newOrder: FavoriteItem[]) => {
    saveFavorites(newOrder);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    reorderFavorites,
  };
}

interface FavoriteButtonProps {
  path: string;
  name: string;
  icon?: string;
  variant?: "icon" | "text";
}

export function FavoriteButton({ path, name, icon, variant = "icon", className }: FavoriteButtonProps & { className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isStarred = isFavorite(path);

  return (
    <Button
      variant="ghost"
      className={cn(
        "transition-colors h-9 w-9",
        isStarred ? "text-warning hover:text-warning" : "text-muted-foreground hover:text-warning",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite({ path, name, icon });
      }}
    >
      <motion.div
        initial={false}
        animate={{ scale: isStarred ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        {isStarred ? (
          <Star className="h-4 w-4 fill-current" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </motion.div>
      {variant === "text" && (
        <span className="ml-2">{isStarred ? "Favoritado" : "Favoritar"}</span>
      )}
    </Button>
  );
}

interface FavoritesDropdownProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

export function FavoritesDropdown({ onNavigate, className }: FavoritesDropdownProps) {
  const { favorites, reorderFavorites, removeFavorite } = useFavorites();

  if (favorites.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("gap-2", className)}>
          <Star className="h-4 w-4 text-warning fill-warning" />
          <span className="hidden md:inline">Favoritos</span>
          <span className="text-xs text-muted-foreground">({favorites.length})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="text-sm font-medium mb-2 px-2">Seus Favoritos</div>
        <Reorder.Group
          axis="y"
          values={favorites}
          onReorder={reorderFavorites}
          className="space-y-1"
        >
          <AnimatePresence>
            {favorites.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent group cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    className="flex-1 text-left text-sm truncate"
                    onClick={() => onNavigate?.(item.path)}
                  >
                    {item.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFavorite(item.id)}
                  >
                    <StarOff className="h-3 w-3" />
                  </Button>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </PopoverContent>
    </Popover>
  );
}
