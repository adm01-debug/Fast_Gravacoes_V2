import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

/**
 * Props for the StatsCard component
 */
export interface StatsCardProps {
  /** The title of the statistic */
  title: string;
  /** The main value to display */
  value: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon from lucide-react */
  icon: LucideIcon;
  /** Optional trend data (percentage and direction) */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Visual variant affecting colors and glow effects */
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'accent' | 'muted';
  /** Additional CSS classes */
  className?: string;
  /** Whether to use a more compact layout */
  compact?: boolean;
}

const variantStyles = {
  primary: {
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    iconColor: 'text-primary',
    accentColor: 'text-primary',
    glowClass: 'hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]',
    borderClass: 'border-primary/20 dark:border-primary/10',
  },
  success: {
    iconBg: 'bg-success/10 dark:bg-success/20',
    iconColor: 'text-success',
    accentColor: 'text-success',
    glowClass: 'hover:shadow-[0_0_20px_rgba(var(--success-rgb),0.15)]',
    borderClass: 'border-success/20 dark:border-success/10',
  },
  warning: {
    iconBg: 'bg-warning/10 dark:bg-warning/20',
    iconColor: 'text-warning',
    accentColor: 'text-warning',
    glowClass: 'hover:shadow-[0_0_20px_rgba(var(--warning-rgb),0.15)]',
    borderClass: 'border-warning/20 dark:border-warning/10',
  },
  info: {
    iconBg: 'bg-info/10 dark:bg-info/20',
    iconColor: 'text-info',
    accentColor: 'text-info',
    glowClass: 'hover:shadow-[0_0_20px_rgba(var(--info-rgb),0.15)]',
    borderClass: 'border-info/20 dark:border-info/10',
  },
  accent: {
    iconBg: 'bg-accent/10 dark:bg-accent/20',
    iconColor: 'text-accent-foreground',
    accentColor: 'text-accent-foreground',
    glowClass: '',
    borderClass: 'border-accent/20',
  },
  muted: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    accentColor: 'text-muted-foreground',
    glowClass: '',
    borderClass: 'border-muted-foreground/10',
  },
};

function StatsCardComponent({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'primary',
  className,
  compact = false
}: StatsCardProps) {
  const { t } = useTranslation();
  const styles = useMemo(() => variantStyles[variant], [variant]);

  if (compact) {
    return (
      <Card 
        tabIndex={0}
        role="region"
        aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
        className={cn(
          'group p-4 glass-card transition-all duration-500 relative overflow-hidden',
          'hover:-translate-y-1 hover:shadow-xl focus:ring-2 focus:ring-primary focus:outline-none',
          styles.glowClass,
          styles.borderClass,
          className
        )}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner',
            styles.iconBg
          )}>
            <Icon className={cn('w-6 h-6 drop-shadow-sm', styles.iconColor)} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[11px] font-medium text-muted-foreground truncate uppercase tracking-wider">
              {title}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-display text-foreground group-hover:scale-105 transition-transform duration-500 origin-left">
                {value}
              </p>
              {subtitle && (
                <p className="text-[11px] font-semibold text-muted-foreground/80 truncate bg-muted/30 px-2 py-0.5 rounded-full">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}${trend ? `, tendência de ${trend.value}%` : ''}`}
      className={cn(
        'group p-6 glass-card transition-all duration-500 relative overflow-hidden',
        'hover:-translate-y-1.5 hover:shadow-2xl focus:ring-2 focus:ring-primary focus:outline-none',
        styles.glowClass,
        styles.borderClass,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1 relative z-10">
          <h3 className="text-xs font-bold text-muted-foreground truncate uppercase tracking-widest opacity-80">
            {title}
          </h3>
          <p className="text-display-lg text-foreground group-hover:scale-105 transition-transform duration-500 origin-left">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm font-medium text-muted-foreground/80 mt-1 truncate inline-flex bg-muted/30 px-2.5 py-0.5 rounded-full">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className={cn(
                'text-sm font-semibold',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )} aria-label={trend.isPositive ? 'Tendência positiva' : 'Tendência negativa'}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-[11px] text-muted-foreground">{t('common.vsYesterday', 'vs. ontem')}</span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-700 group-hover:scale-125 group-hover:rotate-6 shadow-inner relative z-10',
          styles.iconBg
        )}>
          <Icon className={cn('w-7 h-7 drop-shadow-md', styles.iconColor)} aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

export const StatsCard = memo(StatsCardComponent);
StatsCard.displayName = 'StatsCard';
