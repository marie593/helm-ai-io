-- Create Gmail integrations table
CREATE TABLE public.gmail_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  email_address TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  history_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create imported emails table  
CREATE TABLE public.imported_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_integration_id UUID NOT NULL REFERENCES public.gmail_integrations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  sender TEXT,
  sender_email TEXT,
  recipient TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  snippet TEXT,
  body_text TEXT,
  body_html TEXT,
  labels TEXT[],
  ai_summary TEXT,
  ai_action_items JSONB,
  ai_sentiment TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gmail_integration_id, gmail_message_id)
);

-- Enable RLS
ALTER TABLE public.gmail_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for gmail_integrations
CREATE POLICY "Users can view their own Gmail integration"
  ON public.gmail_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Gmail integration"
  ON public.gmail_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Gmail integration"
  ON public.gmail_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Gmail integration"
  ON public.gmail_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for imported_emails (via gmail_integration ownership)
CREATE POLICY "Users can view emails from their Gmail integration"
  ON public.imported_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gmail_integrations gi 
      WHERE gi.id = gmail_integration_id AND gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert emails for their Gmail integration"
  ON public.imported_emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gmail_integrations gi 
      WHERE gi.id = gmail_integration_id AND gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update emails from their Gmail integration"
  ON public.imported_emails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmail_integrations gi 
      WHERE gi.id = gmail_integration_id AND gi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete emails from their Gmail integration"
  ON public.imported_emails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gmail_integrations gi 
      WHERE gi.id = gmail_integration_id AND gi.user_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_gmail_integrations_updated_at
  BEFORE UPDATE ON public.gmail_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster email lookups
CREATE INDEX idx_imported_emails_project ON public.imported_emails(project_id);
CREATE INDEX idx_imported_emails_received ON public.imported_emails(received_at DESC);