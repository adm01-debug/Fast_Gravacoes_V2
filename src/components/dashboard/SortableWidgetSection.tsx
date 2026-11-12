import { ReactNode, memo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WidgetConfig } from '@/hooks/useDashboardLayout';

interface SortableWidgetSectionProps {
  widgets: WidgetConfig[];
  section: WidgetConfig['section'];
  direction?: 'vertical' | 'horizontal';
  onReorder: (section: WidgetConfig['section'], activeId: string, overId: string) => void;
  children: ReactNode;
  className?: string;
}

export const SortableWidgetSection = memo(function SortableWidgetSection({
  widgets,
  section,
  direction = 'vertical',
  onReorder,
  children,
  className,
}: SortableWidgetSectionProps) {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder(section, active.id as string, over.id as string);
    }
  }, [section, onReorder]);

  const strategy = direction === 'horizontal'
    ? horizontalListSortingStrategy
    : verticalListSortingStrategy;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map(w => w.id)}
        strategy={strategy}
      >
        <div className={className}>
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
});
