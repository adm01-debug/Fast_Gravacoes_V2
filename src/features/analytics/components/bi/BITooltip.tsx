import { cn } from '@/lib/utils';

interface BITooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    [key: string]: unknown;
  }>;
  label?: string;
  prefix?: string;
  showPercentage?: boolean;
}

export function BITooltip({ active, payload, label, prefix = '', showPercentage = false }: BITooltipProps) {
  if (active && payload && payload.length) {
    // Calculate total if percentage is requested
    const total = showPercentage ? payload.reduce((sum, entry) => sum + (entry.value || 0), 0) : 0;

    return (
      <div className="bg-black/95 border border-primary/30 backdrop-blur-2xl p-4 rounded-xl shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] animate-in fade-in zoom-in duration-200 min-w-[160px]">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">{label}</p>
        </div>
        <div className="space-y-2.5">
          {payload.map((entry, index) => {
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : null;

            return (
              <div key={index} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
                    <span className="text-[11px] text-white/70 font-medium">{entry.name}</span>
                  </div>
                  <span className="text-[12px] font-bold font-mono text-white">
                    {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                  </span>
                </div>
                {percentage && (
                  <div className="flex items-center gap-1.5 ml-4">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/40 rounded-full"
                        style={{ width: `${percentage}%`, backgroundColor: entry.color + '40' }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono">{percentage}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

