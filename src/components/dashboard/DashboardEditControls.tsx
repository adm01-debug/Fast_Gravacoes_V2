import { memo } from 'react';
import { Settings2, RotateCcw, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WidgetConfig } from '@/hooks/useDashboardLayout';

interface DashboardEditControlsProps {
  isEditMode: boolean;
  widgets: WidgetConfig[];
  onToggleEditMode: () => void;
  onResetLayout: () => void;
  onToggleWidget: (widgetId: string) => void;
  className?: string;
}

export const DashboardEditControls = memo(function DashboardEditControls({
  isEditMode,
  widgets,
  onToggleEditMode,
  onResetLayout,
  onToggleWidget,
  className,
}: DashboardEditControlsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Personalizar dashboard" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Personalizar</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Widgets Visíveis</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {widgets.map((widget) => (
            <DropdownMenuItem
              key={widget.id}
              onClick={() => onToggleWidget(widget.id)}
              className="cursor-pointer"
            >
              {widget.visible ? (
                <Eye className="h-4 w-4 mr-2 text-success" />
              ) : (
                <EyeOff className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              {widget.title}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onResetLayout} className="cursor-pointer">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant={isEditMode ? 'default' : 'outline'}
        size="sm"
        aria-label={isEditMode ? 'Concluir edição do layout' : 'Reorganizar widgets'}
        onClick={onToggleEditMode}
        className="gap-2"
      >
        {isEditMode ? (
          <>
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Concluir</span>
          </>
        ) : (
          <>
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reorganizar</span>
          </>
        )}
      </Button>
    </div>
  );
});
