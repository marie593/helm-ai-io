
-- Table to store demo/contact form requests from prospective users
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  work_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_size TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public contact form)
CREATE POLICY "Anyone can submit a demo request"
  ON public.demo_requests
  FOR INSERT
  WITH CHECK (true);

-- Only vendor staff can view demo requests
CREATE POLICY "Vendor staff can view demo requests"
  ON public.demo_requests
  FOR SELECT
  USING (is_vendor_staff(auth.uid()));

-- Only vendor admins can manage demo requests
CREATE POLICY "Vendor admins can manage demo requests"
  ON public.demo_requests
  FOR DELETE
  USING (is_vendor_admin(auth.uid()));
