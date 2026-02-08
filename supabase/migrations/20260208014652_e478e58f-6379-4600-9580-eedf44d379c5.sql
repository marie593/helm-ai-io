-- Create enum for feedback source
CREATE TYPE feedback_source AS ENUM ('email', 'chat', 'call', 'ticket', 'manual');

-- Create enum for feedback type
CREATE TYPE feedback_type AS ENUM ('bug', 'feature_request', 'feedback', 'question', 'complaint');

-- Create enum for feedback status
CREATE TYPE feedback_status AS ENUM ('new', 'acknowledged', 'in_progress', 'resolved', 'wont_fix');

-- Create enum for priority
CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create feedback_items table to store all client feedback
CREATE TABLE public.feedback_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source feedback_source NOT NULL DEFAULT 'manual',
  type feedback_type NOT NULL DEFAULT 'feedback',
  status feedback_status NOT NULL DEFAULT 'new',
  priority feedback_priority NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  original_content TEXT, -- The raw content from email/chat/call transcript
  ai_summary TEXT, -- AI-generated summary
  ai_extracted_actions JSONB DEFAULT '[]'::jsonb, -- AI-extracted action items
  ai_sentiment TEXT, -- positive, negative, neutral
  ai_themes TEXT[], -- AI-detected themes/categories
  submitted_by TEXT, -- Name or email of the person who submitted
  submitted_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(id),
  linked_task_id UUID REFERENCES public.tasks(id),
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_feedback_items_project ON public.feedback_items(project_id);
CREATE INDEX idx_feedback_items_type ON public.feedback_items(type);
CREATE INDEX idx_feedback_items_status ON public.feedback_items(status);
CREATE INDEX idx_feedback_items_themes ON public.feedback_items USING GIN(ai_themes);

-- Enable RLS
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with customer access can view feedback"
ON public.feedback_items FOR SELECT
USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Users with access can create feedback"
ON public.feedback_items FOR INSERT
WITH CHECK (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Users with access can update feedback"
ON public.feedback_items FOR UPDATE
USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Vendor admins can delete feedback"
ON public.feedback_items FOR DELETE
USING (is_vendor_admin(auth.uid()));

-- Create product_insights table for aggregated insights across all projects
CREATE TABLE public.product_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme TEXT NOT NULL,
  description TEXT,
  feedback_count INTEGER DEFAULT 0,
  projects_affected UUID[] DEFAULT '{}',
  priority feedback_priority DEFAULT 'medium',
  status feedback_status DEFAULT 'new',
  first_reported_at TIMESTAMPTZ DEFAULT now(),
  last_reported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for product_insights
ALTER TABLE public.product_insights ENABLE ROW LEVEL SECURITY;

-- Only vendor staff can see product insights
CREATE POLICY "Vendor staff can view product insights"
ON public.product_insights FOR SELECT
USING (is_vendor_staff(auth.uid()));

CREATE POLICY "Vendor staff can manage product insights"
ON public.product_insights FOR ALL
USING (is_vendor_staff(auth.uid()));

-- Create support_tickets table for in-app ticket system
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feedback_item_id UUID REFERENCES public.feedback_items(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority feedback_priority DEFAULT 'medium',
  created_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with customer access can view tickets"
ON public.support_tickets FOR SELECT
USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Users with access can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Users with access can update tickets"
ON public.support_tickets FOR UPDATE
USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

-- Create ticket_messages for conversation threads
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customers
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non-internal ticket messages"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_id 
    AND has_customer_access(auth.uid(), get_project_customer_id(st.project_id))
  )
  AND (NOT is_internal OR is_vendor_staff(auth.uid()))
);

CREATE POLICY "Users with access can create messages"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets st 
    WHERE st.id = ticket_id 
    AND has_customer_access(auth.uid(), get_project_customer_id(st.project_id))
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_feedback_items_updated_at
BEFORE UPDATE ON public.feedback_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_product_insights_updated_at
BEFORE UPDATE ON public.product_insights
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();