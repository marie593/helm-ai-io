import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Clock, FileText, Loader2, Copy, Check, Share2, Mail, MessageSquare, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import type { Customer } from '@/types/database';

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('month');
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCalendarClient, setSelectedCalendarClient] = useState<string>('all');
  const [selectedDigestClients, setSelectedDigestClients] = useState<string[]>([]);
  const { toast } = useToast();

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 0 })
    });
  }, [weekStart]);

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }
    
    setCustomers(data || []);
  };

  const toggleDigestClient = (clientId: string) => {
    setSelectedDigestClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllDigestClients = () => {
    if (selectedDigestClients.length === customers.length) {
      setSelectedDigestClients([]);
    } else {
      setSelectedDigestClients(customers.map(c => c.id));
    }
  };

  const generateDigest = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-digest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            customerIds: selectedDigestClients.length > 0 ? selectedDigestClients : undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate digest');
      }

      setDigest(result.digest);
      toast({
        title: 'Digest Generated',
        description: `Summary covers ${result.metadata.projectCount} projects with ${result.metadata.tasksCompleted} tasks completed this week.`,
      });
    } catch (error) {
      console.error('Error generating digest:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate digest',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const sendViaEmail = () => {
    const subject = encodeURIComponent('Weekly Implementation Digest');
    const body = encodeURIComponent(digest || '');
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast({ title: 'Email client opened' });
  };

  const sendViaSlack = () => {
    toast({
      title: 'Slack Integration',
      description: 'Slack integration needs to be configured. Would you like to set it up?',
    });
  };

  const getSelectedClientsLabel = () => {
    if (selectedDigestClients.length === 0) return 'All Clients';
    if (selectedDigestClients.length === customers.length) return 'All Clients';
    if (selectedDigestClients.length === 1) {
      const client = customers.find(c => c.id === selectedDigestClients[0]);
      return client?.name || '1 Client';
    }
    return `${selectedDigestClients.length} Clients`;
  };

  return (
    <AppLayout
      title="Calendar"
      description="Weekly digests and calendar management"
    >
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Calendar */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Schedule</CardTitle>
              <div className="flex items-center gap-3">
                <Select value={selectedCalendarClient} onValueChange={setSelectedCalendarClient}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ToggleGroup 
                  type="single" 
                  value={calendarView} 
                  onValueChange={(value) => value && setCalendarView(value as 'week' | 'month')}
                  className="border rounded-md"
                >
                  <ToggleGroupItem value="week" aria-label="Weekly view" className="px-3">
                    Week
                  </ToggleGroupItem>
                  <ToggleGroupItem value="month" aria-label="Monthly view" className="px-3">
                    Month
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calendarView === 'month' ? (
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border w-full"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-base font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded-md",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-sm py-2",
                  row: "flex w-full mt-2",
                  cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 min-h-[60px]",
                  day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md transition-colors",
                  day_range_end: "day-range-end",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            ) : (
              <div className="rounded-md border">
                {/* Week Navigation */}
                <div className="flex items-center justify-between p-4 border-b">
                  <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-base font-medium">
                    {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, { weekStartsOn: 0 }), 'MMM d, yyyy')}
                  </span>
                  <Button variant="outline" size="icon" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Week Days List */}
                <div className="divide-y">
                  {weekDays.map((day) => {
                    const isSelected = date && isSameDay(day, date);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setDate(day)}
                        className={`
                          flex items-center w-full p-4 transition-colors text-left
                          ${isSelected 
                            ? 'bg-primary/10' 
                            : 'hover:bg-accent'
                          }
                        `}
                      >
                        {/* Date Column */}
                        <div className={`
                          flex flex-col items-center justify-center w-16 h-16 rounded-lg shrink-0
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : isToday 
                              ? 'bg-accent text-accent-foreground' 
                              : 'bg-muted'
                          }
                        `}>
                          <span className="text-xs font-medium uppercase">
                            {format(day, 'EEE')}
                          </span>
                          <span className="text-2xl font-bold">
                            {format(day, 'd')}
                          </span>
                        </div>
                        
                        {/* Details Column */}
                        <div className="ml-4 flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {format(day, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            No events scheduled
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Digest */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Weekly Digest
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI-generated summary of this week's progress, ready for client communication.
              </p>
              
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Clients</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {getSelectedClientsLabel()}
                      </span>
                      {selectedDigestClients.length > 0 && selectedDigestClients.length < customers.length && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedDigestClients.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-2" align="start">
                    <div className="space-y-1">
                      <div 
                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={selectAllDigestClients}
                      >
                        <Checkbox 
                          checked={selectedDigestClients.length === customers.length && customers.length > 0}
                          onCheckedChange={selectAllDigestClients}
                        />
                        <span className="text-sm font-medium">Select All</span>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <ScrollArea className="h-[200px]">
                        {customers.map((customer) => (
                          <div 
                            key={customer.id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => toggleDigestClient(customer.id)}
                          >
                            <Checkbox 
                              checked={selectedDigestClients.includes(customer.id)}
                              onCheckedChange={() => toggleDigestClient(customer.id)}
                            />
                            <span className="text-sm">{customer.name}</span>
                          </div>
                        ))}
                        {customers.length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">No clients found</p>
                        )}
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                className="w-full" 
                onClick={generateDigest}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Digest
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {digest && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Generated Digest</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={copyToClipboard}>
                        {copied ? (
                          <Check className="h-4 w-4 mr-2 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copy to clipboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={sendViaEmail}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={sendViaSlack}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send to Slack
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-ul:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{digest}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No upcoming events. Calendar sync will be available soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
