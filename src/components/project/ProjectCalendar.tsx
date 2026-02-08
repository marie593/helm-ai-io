import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectCalendarProps {
  projectId: string;
}

export function ProjectCalendar({ projectId }: ProjectCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: events } = useQuery({
    queryKey: ['calendar-events', projectId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('event_date', format(start, 'yyyy-MM-dd'))
        .lte('event_date', format(end, 'yyyy-MM-dd'))
        .order('event_date');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: milestones } = useQuery({
    queryKey: ['milestones-calendar', projectId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .gte('target_date', format(start, 'yyyy-MM-dd'))
        .lte('target_date', format(end, 'yyyy-MM-dd'))
        .order('target_date');
      
      if (error) throw error;
      return data;
    },
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(startDay).fill(null);

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayEvents = events?.filter(e => e.event_date === dayStr) || [];
    const dayMilestones = milestones?.filter(m => m.target_date === dayStr) || [];
    return { events: dayEvents, milestones: dayMilestones };
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" className="ml-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          
          {paddingDays.map((_, index) => (
            <div key={`pad-${index}`} className="bg-background p-2 min-h-[100px]" />
          ))}
          
          {days.map((day) => {
            const { events: dayEvents, milestones: dayMilestones } = getEventsForDay(day);
            const hasItems = dayEvents.length > 0 || dayMilestones.length > 0;
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'bg-background p-2 min-h-[100px] transition-colors hover:bg-accent/50 cursor-pointer',
                  !isSameMonth(day, currentMonth) && 'text-muted-foreground',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                    isToday(day) && 'bg-primary text-primary-foreground font-semibold'
                  )}
                >
                  {format(day, 'd')}
                </span>
                
                <div className="mt-1 space-y-1">
                  {dayMilestones.map((milestone) => (
                    <Badge
                      key={milestone.id}
                      variant="secondary"
                      className="block truncate text-xs bg-warning/20 text-warning-foreground"
                    >
                      🏁 {milestone.name}
                    </Badge>
                  ))}
                  {dayEvents.slice(0, 2).map((event) => (
                    <Badge
                      key={event.id}
                      variant="secondary"
                      className={cn(
                        'block truncate text-xs',
                        event.ai_suggested && 'bg-primary/20'
                      )}
                    >
                      {event.title}
                    </Badge>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayEvents.length - 2} more
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
