import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Shimmer animation component
export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn(
      'relative overflow-hidden bg-muted rounded',
      'before:absolute before:inset-0',
      'before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent',
      'before:animate-shimmer',
      className
    )} />
  );
}

// Page skeleton wrapper
export const PageSkeleton = memo(({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-in fade-in duration-300", className)}>
    {children}
  </div>
));

// Header skeleton
export const HeaderSkeleton = memo(({ className }: { className?: string }) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
    <div className="space-y-2">
      <Skeleton className="h-8 w-48 md:w-64" />
      <Skeleton className="h-4 w-32 md:w-48" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-10" />
    </div>
  </div>
));

// Stats card skeleton — anatomically mirrors StatsCard
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-5 glass-card', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
      </div>
    </Card>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton
export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted/50 p-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3 flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Card skeleton
export function CardSkeleton({
  hasHeader = true,
  hasFooter = false,
  lines = 3,
  className,
  children,
}: {
  hasHeader?: boolean;
  hasFooter?: boolean;
  lines?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {hasHeader && (
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
      )}
      <CardContent className={cn(!hasHeader && 'pt-6', 'space-y-3')}>
        {children || Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </CardContent>
      {hasFooter && (
        <div className="p-4 pt-0 flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </Card>
  );
}

// Chart skeleton
export function ChartSkeleton({
  type = 'bar',
  className,
}: {
  type?: 'bar' | 'line' | 'pie';
  className?: string;
}) {
  if (type === 'pie') {
    return (
      <div className={cn('flex items-center justify-center gap-6 p-6', className)}>
        <Skeleton className="h-36 w-36 rounded-full shrink-0" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Y axis labels */}
      <div className="flex gap-4">
        <div className="w-8 space-y-6 pt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
        {/* Bars */}
        <div className="flex-1 flex items-end gap-1.5 h-32">
          {[65, 80, 45, 90, 55, 70, 40].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      {/* X axis labels */}
      <div className="flex gap-1.5 pl-12">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

// Timeline skeleton
export const TimelineSkeleton = memo(({ rows = 6, className }: { rows?: number; className?: string }) => (
  <Card className={cn("glass-card", className)}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex gap-2 border-b border-border/30 pb-2">
          <Skeleton className="w-16 h-4" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-4" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="flex-1 h-10 rounded-lg" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
));

// Form skeleton
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// List skeleton
export function ListSkeleton({
  items = 5,
  hasAvatar = false,
  hasAction = false,
  className,
}: {
  items?: number;
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          {hasAvatar && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {hasAction && <Skeleton className="h-8 w-20 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// Kanban skeleton
export function KanbanSkeleton({
  columns = 4,
  cardsPerColumn = 3,
  className,
}: {
  columns?: number;
  cardsPerColumn?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="w-72 shrink-0 space-y-3">
          {/* Column header */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          {/* Cards */}
          <div className="space-y-2">
            {Array.from({ length: cardsPerColumn }).map((_, card) => (
              <div key={card} className="p-3 rounded-lg border bg-card space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CardSkeleton hasHeader lines={0} className="h-80">
            <ChartSkeleton />
          </CardSkeleton>
        </div>
        <div>
          <CardSkeleton hasHeader>
            <ListSkeleton items={4} hasAvatar />
          </CardSkeleton>
        </div>
      </div>
    </div>
  );
}

// Specific Page Skeletons
export const DashboardPageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <DashboardSkeleton />
  </PageSkeleton>
));

export const CalendarPageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <TimelineSkeleton rows={8} />
  </PageSkeleton>
));

export const KanbanPageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <KanbanSkeleton columns={5} cardsPerColumn={3} />
  </PageSkeleton>
));

export const ListPageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <div className="flex gap-2 mb-4">
      <Skeleton className="h-10 flex-1 max-w-sm" />
      <Skeleton className="h-10 w-32" />
    </div>
    <ListSkeleton items={6} />
  </PageSkeleton>
));

export const TablePageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <TableSkeleton rows={8} columns={6} />
  </PageSkeleton>
));

export const KPIPageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={1} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="line" />
      </div>
    </div>
  </PageSkeleton>
));

export const EfficiencyPageSkeleton = memo(() => (
  <PageSkeleton>
    <HeaderSkeleton />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <CardSkeleton lines={4} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={4} />
    </div>
  </PageSkeleton>
));

export const AuthPageSkeleton = memo(() => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <Card className="w-full max-w-md p-6 space-y-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-4 w-40 mx-auto" />
    </Card>
  </div>
));

// Progressive loading wrapper
interface ProgressiveSkeletonProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  minLoadTime?: number;
  className?: string;
}

export function ProgressiveSkeleton({
  isLoading,
  skeleton,
  children,
  delay = 0,
  minLoadTime = 300,
  className,
}: ProgressiveSkeletonProps) {
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [showContent, setShowContent] = React.useState(false);
  const loadStartRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (isLoading) {
      loadStartRef.current = Date.now();
      const timer = setTimeout(() => setShowSkeleton(true), delay);
      return () => clearTimeout(timer);
    } else {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadTime - elapsed);

      const timer = setTimeout(() => {
        setShowSkeleton(false);
        setShowContent(true);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [isLoading, delay, minLoadTime]);

  if (isLoading && showSkeleton) {
    return <div className={className}>{skeleton}</div>;
  }

  if (!isLoading && showContent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return null;
}

export default {
  Shimmer,
  StatsCardSkeleton,
  TableSkeleton,
  CardSkeleton,
  ChartSkeleton,
  FormSkeleton,
  ListSkeleton,
  KanbanSkeleton,
  DashboardSkeleton,
  ProgressiveSkeleton,
};
