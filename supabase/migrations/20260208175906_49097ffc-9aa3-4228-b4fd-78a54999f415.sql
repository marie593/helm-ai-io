-- Create table to store Google Calendar integration settings per project
CREATE TABLE public.google_calendar_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Create table to track synced events (for two-way sync)
CREATE TABLE public.calendar_sync_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  local_event_id UUID,
  local_milestone_id UUID,
  google_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('milestone', 'calendar_event')),
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(google_event_id, project_id)
);

-- Add foreign keys for local events
ALTER TABLE public.calendar_sync_mappings
  ADD CONSTRAINT calendar_sync_mappings_local_event_id_fkey 
  FOREIGN KEY (local_event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_sync_mappings
  ADD CONSTRAINT calendar_sync_mappings_local_milestone_id_fkey 
  FOREIGN KEY (local_milestone_id) REFERENCES public.milestones(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_calendar_integrations
CREATE POLICY "Users with customer access can view integrations"
  ON public.google_calendar_integrations FOR SELECT
  USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Vendor staff can manage integrations"
  ON public.google_calendar_integrations FOR ALL
  USING (is_vendor_staff(auth.uid()));

-- RLS policies for calendar_sync_mappings
CREATE POLICY "Users with customer access can view sync mappings"
  ON public.calendar_sync_mappings FOR SELECT
  USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Vendor staff can manage sync mappings"
  ON public.calendar_sync_mappings FOR ALL
  USING (is_vendor_staff(auth.uid()));

-- Add updated_at trigger for google_calendar_integrations
CREATE TRIGGER update_google_calendar_integrations_updated_at
  BEFORE UPDATE ON public.google_calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();