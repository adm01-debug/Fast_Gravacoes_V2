/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  icon?: React.ReactNode;
}

interface GlobalSearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  recentSearches?: string[];
  onRecentSearchSelect?: (query: string) => void;
  trendingSearches?: string[];
}

export function GlobalSearch({
  onSearch,
  onSelect,
  placeholder = "Buscar em todo o sistema...",
  recentSearches = [],
  onRecentSearchSelect,
  trendingSearches = [],
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    let mounted = true;
    const performSearch = async () => {
      setIsLoading(true);
      try {
        const searchResults = await onSearch(debouncedQuery);
        if (!mounted) return;
        setResults(searchResults);
        setSelectedIndex(-1);
      } catch (error) {
        if (!mounted) return;
        setResults([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    performSearch();
    return () => { mounted = false; };
  }, [debouncedQuery, onSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (result: SearchResult) => {
    onSelect?.(result);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleRecentSearch = (search: string) => {
    setQuery(search);
    onRecentSearchSelect?.(search);
  };

  const showSuggestions = isOpen && query.length < 2 && (recentSearches.length > 0 || trendingSearches.length > 0);
  const showResults = isOpen && query.length >= 2;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            aria-label="Busca global"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AnimatePresence mode="wait">
          {/* Suggestions (when query is short) */}
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-4"
            >
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="h-3 w-3" />
                    Buscas recentes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.slice(0, 5).map((search) => (
                      <Badge
                        key={search}
                        variant="secondary"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleRecentSearch(search)}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {trendingSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <TrendingUp className="h-3 w-3" />
                    Em alta
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {trendingSearches.slice(0, 5).map((search) => (
                      <Badge
                        key={search}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleRecentSearch(search)}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Results */}
          {showResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-h-80 overflow-y-auto"
            >
              {results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {result.icon && (
                        <div className="flex-shrink-0 text-muted-foreground">
                          {result.icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {result.type}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado para "{query}"
                  </p>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}

// Compact search input for mobile
export function CompactSearch({
  onSearch,
  onSelect,
}: Pick<GlobalSearchProps, "onSearch" | "onSelect">) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(true)}
        className="md:hidden"
        aria-label="Abrir busca"
      >
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ width: 40 }}
      animate={{ width: "100%" }}
      className="fixed inset-x-0 top-0 z-50 p-4 bg-background border-b md:relative md:p-0 md:border-0 md:bg-transparent"
    >
      <div className="relative flex items-center gap-2">
        <GlobalSearch
          onSearch={onSearch}
          onSelect={(result) => {
            onSelect?.(result);
            setIsExpanded(false);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(false)}
          className="md:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
