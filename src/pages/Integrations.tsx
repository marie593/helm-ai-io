import { useState } from 'react';
import { Plug, Plus, RefreshCw, Settings2, Unplug, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'connected' | 'coming_soon';
  icon: string;
  hasConnection?: boolean;
}

const baseIntegrations = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and updates in your Slack channels',
    status: 'available' as const,
    icon: '💬',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Forward emails for AI parsing and action item extraction',
    status: 'available' as const,
    icon: '📧',
  },
  {
    id: 'gcalendar',
    name: 'Google Calendar',
    description: 'Sync milestones and events with your calendar',
    status: 'available' as const,
    icon: '📅',
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Access and share project documents and files',
    status: 'available' as const,
    icon: '📁',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync project documentation and knowledge bases',
    status: 'available' as const,
    icon: '📝',
  },
  {
    id: 'otterai',
    name: 'Otter.ai',
    description: 'Import meeting transcripts and extract action items',
    status: 'available' as const,
    icon: '🎙️',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Sync tasks and issues with Jira projects',
    status: 'available' as const,
    icon: '📋',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Connect customer data with Salesforce CRM',
    status: 'coming_soon' as const,
    icon: '☁️',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Integrate with HubSpot for marketing automation',
    status: 'coming_soon' as const,
    icon: '🧡',
  },
];

export default function Integrations() {
  const { isVendorStaff } = useAuth();
  const queryClient = useQueryClient();
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Fetch projects for calendar connection
  const { data: projects } = useQuery({
    queryKey: ['projects-for-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, customer_id, customers(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isVendorStaff,
  });

  // Fetch existing calendar integrations
  const { data: calendarIntegrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['google-calendar-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*, projects(name, customers(name))');
      if (error) throw error;
      return data;
    },
    enabled: isVendorStaff,
  });

  // List Google Calendars
  const listCalendars = async () => {
    setIsLoadingCalendars(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'list-calendars' },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      setAvailableCalendars(response.data.calendars || []);
      const primary = response.data.calendars?.find((c: GoogleCalendar) => c.primary);
      if (primary) setSelectedCalendarId(primary.id);
    } catch (error: any) {
      console.error('Failed to list calendars:', error);
      toast.error('Failed to load calendars', { description: error.message });
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Connect calendar mutation
  const connectCalendar = useMutation({
    mutationFn: async ({ projectId, calendarId }: { projectId: string; calendarId: string }) => {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'connect', projectId, calendarId },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-integrations'] });
      toast.success('Google Calendar connected successfully');
      setIsCalendarDialogOpen(false);
      resetCalendarDialog();
    },
    onError: (error: Error) => {
      toast.error('Failed to connect calendar', { description: error.message });
    },
  });

  // Sync calendar mutation
  const syncCalendar = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync', projectId },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-integrations'] });
      toast.success('Calendar synced successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to sync calendar', { description: error.message });
    },
  });

  // Disconnect calendar mutation
  const disconnectCalendar = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'disconnect', projectId },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-integrations'] });
      toast.success('Calendar disconnected');
    },
    onError: (error: Error) => {
      toast.error('Failed to disconnect calendar', { description: error.message });
    },
  });

  const resetCalendarDialog = () => {
    setSelectedProjectId('');
    setSelectedCalendarId('');
    setAvailableCalendars([]);
  };

  const handleOpenCalendarDialog = async () => {
    setIsCalendarDialogOpen(true);
    await listCalendars();
  };

  const handleConnectCalendar = () => {
    if (!selectedProjectId || !selectedCalendarId) {
      toast.error('Please select both a project and a calendar');
      return;
    }
    connectCalendar.mutate({ projectId: selectedProjectId, calendarId: selectedCalendarId });
  };

  // Get connected project IDs
  const connectedProjectIds = new Set(calendarIntegrations?.map(i => i.project_id) || []);
  const availableProjects = projects?.filter(p => !connectedProjectIds.has(p.id)) || [];

  // Build integrations list with connection status
  const integrations: Integration[] = baseIntegrations.map(integration => ({
    ...integration,
    hasConnection: integration.id === 'gcalendar' && (calendarIntegrations?.length || 0) > 0,
  }));

  return (
    <AppLayout
      title="Integrations"
      description="Connect your favorite tools and services"
    >
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                  </div>
                  {integration.status === 'coming_soon' && (
                    <Badge variant="secondary">Coming Soon</Badge>
                  )}
                  {integration.hasConnection && (
                    <Badge className="bg-success/10 text-success border-0">Connected</Badge>
                  )}
                </div>
                <CardDescription className="mt-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {integration.id === 'gcalendar' ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleOpenCalendarDialog}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={integration.status === 'coming_soon'}
                  >
                    {integration.status === 'coming_soon' ? (
                      'Coming Soon'
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Connected Google Calendar Integrations */}
        {calendarIntegrations && calendarIntegrations.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Connected Calendar Integrations
              </CardTitle>
              <CardDescription>
                Manage your Google Calendar connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calendarIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📅</span>
                      <div>
                        <p className="font-medium">
                          {(integration.projects as any)?.name || 'Unknown Project'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(integration.projects as any)?.customers?.name || 'Unknown Customer'}
                        </p>
                        {integration.last_sync_at && (
                          <p className="text-xs text-muted-foreground">
                            Last synced: {new Date(integration.last_sync_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncCalendar.mutate(integration.project_id)}
                        disabled={syncCalendar.isPending}
                      >
                        {syncCalendar.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Sync</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectCalendar.mutate(integration.project_id)}
                        disabled={disconnectCalendar.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state for connected integrations */}
        {(!calendarIntegrations || calendarIntegrations.length === 0) && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Connected Integrations
              </CardTitle>
              <CardDescription>
                Your active integrations will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No integrations connected yet</p>
                <p className="text-sm">Connect an integration above to get started</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Google Calendar Connect Dialog */}
      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📅</span> Connect Google Calendar
            </DialogTitle>
            <DialogDescription>
              Select a project and calendar to sync milestones and events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({(project.customers as any)?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProjects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All projects are already connected to a calendar.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Google Calendar</Label>
              {isLoadingCalendars ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading calendars...
                </div>
              ) : availableCalendars.length > 0 ? (
                <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary} {calendar.primary && '(Primary)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground p-2">
                  No calendars available. Please connect Google Calendar first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCalendarDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectCalendar}
              disabled={!selectedProjectId || !selectedCalendarId || connectCalendar.isPending}
            >
              {connectCalendar.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Calendar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
