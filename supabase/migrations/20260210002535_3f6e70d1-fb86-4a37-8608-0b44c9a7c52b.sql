
-- Add booking configuration to projects
ALTER TABLE public.projects
ADD COLUMN booking_type text DEFAULT 'built_in' CHECK (booking_type IN ('built_in', 'calendly', 'hubspot', 'google_calendar')),
ADD COLUMN booking_url text;

-- Create booking requests table for the built-in scheduler
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id),
  requested_date DATE NOT NULL,
  requested_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with customer access can view booking requests"
ON public.booking_requests FOR SELECT
USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Users with customer access can create booking requests"
ON public.booking_requests FOR INSERT
WITH CHECK (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

CREATE POLICY "Vendor staff can manage booking requests"
ON public.booking_requests FOR ALL
USING (is_vendor_staff(auth.uid()));

CREATE TRIGGER update_booking_requests_updated_at
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
