import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useFuseSearch } from "@/hooks/useFuseSearch";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, Calendar, LayoutGrid, BarChart3, Settings, Users, Bell, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileHeader, MobileHeaderSpacer } from "@/components/navigation/MobileHeader";
import { cn } from "@/lib/utils";

// Popular pages for suggestions
const popularPages = [
  { name: 'Dashboard', href: '/', icon: Home, description: 'Visão geral' },
  { name: 'Calendário', href: '/calendar/daily', icon: Calendar, description: 'Agenda diária' },
  { name: 'Kanban', href: '/kanban', icon: LayoutGrid, description: 'Gestão visual' },
  { name: 'KPIs', href: '/kpis', icon: BarChart3, description: 'Indicadores' },
  { name: 'Operadores', href: '/operators', icon: Users, description: 'Equipe' },
  { name: 'Alertas', href: '/alerts', icon: Bell, description: 'Notificações' },
  { name: 'Documentos', href: '/documents', icon: FileText, description: 'Arquivos' },
  { name: 'Configurações', href: '/settings', icon: Settings, description: 'Ajustes' },
];

// Try to find similar pages based on path
function findSimilarPages(pathname: string) {
  const pathParts = pathname.toLowerCase().split('/').filter(Boolean);

  return popularPages.filter(page => {
    const pageParts = page.href.toLowerCase().split('/').filter(Boolean);
    return pathParts.some(part =>
      pageParts.some(pagePart =>
        pagePart.includes(part) || part.includes(pagePart)
      )
    ) || page.name.toLowerCase().includes(pathParts.join(''));
  }).slice(0, 3);
}

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const similarPages = useMemo(() => findSimilarPages(location.pathname), [location.pathname]);

  // Apply Fuse.js fuzzy search for pages
  const fuseFilteredPages = useFuseSearch(popularPages, searchQuery, {
    keys: ['name', 'description'],
    threshold: 0.4,
  });

  const filteredPages = useMemo(() => {
    if (!searchQuery) return popularPages.slice(0, 6);
    return fuseFilteredPages;
  }, [searchQuery, fuseFilteredPages]);

  useEffect(() => {
    // Update document title
    document.title = 'Página não encontrada | FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO';
  }, [location.pathname]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredPages.length > 0) {
      navigate(filteredPages[0].href);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader
        title="Página não encontrada"
        showBack={true}
        showHome={false}
      />
      <MobileHeaderSpacer />

      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-lg w-full"
        >
          {/* 404 Illustration */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative"
          >
            <div className="text-[100px] md:text-[160px] font-bold text-muted-foreground/10 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg"
              >
                <Search className="w-10 h-10 md:w-12 md:h-12 text-primary" />
              </motion.div>
            </div>
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl text-title font-bold text-foreground">
              Página não encontrada
            </h1>
            <p className="text-muted-foreground">
              A página <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span> não existe.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar páginas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-11"
            />
          </form>

          {/* Similar pages suggestion */}
          {similarPages.length > 0 && !searchQuery && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Você quis dizer:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {similarPages.map((page) => (
                  <Link
                    key={page.href}
                    to={page.href}
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    {page.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Popular/Filtered pages */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Resultados:' : 'Páginas populares:'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredPages.map((page, index) => {
                const Icon = page.icon;
                return (
                  <motion.div
                    key={page.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={page.href}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl",
                        "bg-card hover:bg-muted border border-border",
                        "transition-all hover:shadow-md hover:-translate-y-0.5"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{page.name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {filteredPages.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground py-4">
                Nenhuma página encontrada para "{searchQuery}"
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button asChild variant="gradient" className="gap-2">
              <Link to="/">
                <span className="inline-flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Ir para Dashboard
                </span>
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
