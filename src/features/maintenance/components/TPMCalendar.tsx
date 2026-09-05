import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaintenanceSchedule } from '@/features/maintenance/hooks/useTPM';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isPast
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TPMCalendarProps {
  schedules: MaintenanceSchedule[];
  onSelectSchedule: (schedule: MaintenanceSchedule) => void;
}

export function TPMCalendar({ schedules, onSelectSchedule }: TPMCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getSchedulesForDay = (day: Date) => {
    return schedules.filter(s => isSameDay(new Date(s.next_due_at), day));
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-title">
            <Calendar className="h-5 w-5 text-primary" />
            Calendário de Manutenções
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            const daySchedules = getSchedulesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            const hasOverdue = daySchedules.some(s => isPast(new Date(s.next_due_at)) && !isToday(new Date(s.next_due_at)));

            return (
              <div
                key={index}
                className={`
                  min-h-[80px] p-1 rounded-lg border border-border/30
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                  ${isCurrentDay ? 'bg-primary/10 border-primary/50' : 'bg-card/30'}
                  ${hasOverdue ? 'bg-red-500/10 border-red-500/30' : ''}
                `}
              >
                <div className={`text-xs font-medium mb-1 ${isCurrentDay ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {daySchedules.slice(0, 3).map((schedule) => (
                    <button
                      key={schedule.id}
                      onClick={() => onSelectSchedule(schedule)}
                      className="w-full text-left"
                    >
                      <Badge
                        variant="secondary"
                        className="w-full justify-start truncate text-[10px] px-1 py-0 h-5"
                        style={{
                          backgroundColor: schedule.maintenance_type?.color + '20',
                          borderColor: schedule.maintenance_type?.color,
                          color: schedule.maintenance_type?.color,
                        }}
                      >
                        {schedule.name.length > 12
                          ? schedule.name.substring(0, 12) + '...'
                          : schedule.name
                        }
                      </Badge>
                    </button>
                  ))}
                  {daySchedules.length > 3 && (
                    <span className="text-[10px] text-muted-foreground pl-1">
                      +{daySchedules.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
