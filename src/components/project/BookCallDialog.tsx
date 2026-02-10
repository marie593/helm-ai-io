import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Video, ExternalLink, CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BookCallDialogProps {
  projectId: string;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
];

type BookingType = 'built_in' | 'calendly' | 'hubspot' | 'google_calendar';

export function BookCallDialog({ projectId }: BookCallDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Booking form state
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  // Config state
  const [configType, setConfigType] = useState<BookingType>('built_in');
  const [configUrl, setConfigUrl] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project-booking', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('booking_type, booking_url, name')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ['booking-requests', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*, profiles:requested_by(full_name, email)')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('requested_date');
      if (error) throw error;
      return data;
    },
  });

  const saveConfig = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('projects')
        .update({
          booking_type: configType,
          booking_url: configType === 'built_in' ? null : configUrl,
        })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-booking', projectId] });
      setIsConfiguring(false);
      toast.success('Booking settings saved');
    },
  });

  const submitBooking = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime) throw new Error('Select date and time');
      const { error } = await supabase.from('booking_requests').insert({
        project_id: projectId,
        requested_by: user?.id,
        requested_date: format(selectedDate, 'yyyy-MM-dd'),
        requested_time: selectedTime,
        duration_minutes: parseInt(duration),
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests', projectId] });
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes('');
      toast.success('Call request submitted! Your CSM will confirm shortly.');
    },
    onError: () => {
      toast.error('Failed to submit booking request');
    },
  });

  const bookingType = (project?.booking_type as BookingType) || 'built_in';
  const bookingUrl = project?.booking_url;

  const handleExternalBooking = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };

  const getExternalLabel = (type: BookingType) => {
    switch (type) {
      case 'calendly': return 'Calendly';
      case 'hubspot': return 'HubSpot';
      case 'google_calendar': return 'Google Calendar';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Video className="h-4 w-4" />
          Book a Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Book a Call</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setIsConfiguring(!isConfiguring);
                setConfigType(bookingType);
                setConfigUrl(bookingUrl || '');
              }}
            >
              {isConfiguring ? 'Cancel' : '⚙️ Settings'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isConfiguring ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Method</Label>
              <Select value={configType} onValueChange={(v) => setConfigType(v as BookingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="built_in">Built-in Scheduler</SelectItem>
                  <SelectItem value="calendly">Calendly</SelectItem>
                  <SelectItem value="hubspot">HubSpot Meetings</SelectItem>
                  <SelectItem value="google_calendar">Google Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {configType !== 'built_in' && (
              <div className="space-y-2">
                <Label>{getExternalLabel(configType)} URL</Label>
                <Input
                  placeholder={`https://${configType === 'calendly' ? 'calendly.com/your-name' : configType === 'hubspot' ? 'meetings.hubspot.com/your-name' : 'calendar.google.com/...'}`}
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={() => saveConfig.mutate()}
              disabled={saveConfig.isPending || (configType !== 'built_in' && !configUrl)}
              className="w-full"
            >
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        ) : bookingType !== 'built_in' && bookingUrl ? (
          /* External booking link */
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              Schedule a call with your CSM via {getExternalLabel(bookingType)}
            </p>
            <Button onClick={handleExternalBooking} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open {getExternalLabel(bookingType)}
            </Button>
          </div>
        ) : (
          /* Built-in scheduler */
          <div className="space-y-4">
            {/* Date picker */}
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="space-y-2">
                <Label>Select Time</Label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            {selectedTime && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Duration
                </Label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={duration === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setDuration(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedTime && (
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="What would you like to discuss?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={() => submitBooking.mutate()}
              disabled={!selectedDate || !selectedTime || submitBooking.isPending}
              className="w-full"
            >
              {submitBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request Call
            </Button>

            {/* Pending requests */}
            {pendingRequests && pendingRequests.length > 0 && (
              <div className="border-t border-border pt-3 space-y-2">
                <Label className="text-xs text-muted-foreground">Pending Requests</Label>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span>
                      {format(new Date(req.requested_date), 'MMM d')} at {req.requested_time}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {req.duration_minutes}min · {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
