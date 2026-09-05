import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, TrendingUp, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FuturisticStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  gradient?: string;
  glowColor?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  onExport?: (format: 'csv' | 'pdf') => void;
  onClick?: () => void;
}

export function FuturisticStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  gradient,
  glowColor = 'primary',
  onExport,
  onClick
}: FuturisticStatCardProps) {
  const glowStyles = {
    primary: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.3)]',
    success: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    warning: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    danger: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    purple: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        onClick={onClick}
        className={cn(
        "bg-black/40 border-white/10 backdrop-blur-xl transition-all duration-500 relative overflow-hidden group cursor-pointer",
        glowStyles[glowColor]
      )}>
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", gradient)} />
        <CardContent className="pt-6 relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground text-title tracking-widest uppercase mb-1">{title}</p>
              <h3 className={cn(
                "text-3xl font-bold text-title tracking-tight",
                variant === 'danger' ? 'text-rose-500' : 'text-white'
              )}>{value}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">{subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={cn(
                "p-3 rounded-xl bg-white/5 group-hover:bg-primary/20 transition-all duration-500",
                variant === 'danger' && "group-hover:bg-rose-500/20"
              )}>
                <Icon className={cn(
                  "h-6 w-6 text-white group-hover:text-primary transition-colors duration-500",
                  variant === 'danger' && "group-hover:text-rose-500"
                )} />
              </div>

              {onExport && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1 bg-black/90 border-white/10 backdrop-blur-xl" align="end">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start gap-2 text-xs h-8 hover:bg-white/5"
                        onClick={(e) => { e.stopPropagation(); onExport('csv'); }}
                      >
                        <FileSpreadsheet className="h-3 w-3 text-primary" /> CSV
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start gap-2 text-xs h-8 hover:bg-white/5"
                        onClick={(e) => { e.stopPropagation(); onExport('pdf'); }}
                      >
                        <FileText className="h-3 w-3 text-primary" /> PDF
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {trend ? (
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest",
                trend === 'up' ? 'text-success' : 'text-rose-400'
              )}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                {trendValue} vs LAST PD
              </div>
            ) : <div />}
            {onClick && (
              <div className="flex items-center gap-1 text-[8px] text-primary/40 uppercase text-title tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
                Drill-down <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}><TrendingUp className="h-2 w-2 rotate-90" /></motion.div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
