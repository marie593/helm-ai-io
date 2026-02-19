
-- Organization-wide company profile (single row, shared by all vendor staff)
CREATE TABLE public.company_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_description text,
  client_types text,
  industry text,
  avg_onboarding_length text,
  onboarding_processes text,
  team_size_structure text,
  tools_tech_stack text,
  success_metrics text,
  documentation_links jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

-- Only vendor staff can view
CREATE POLICY "Vendor staff can view company profile"
ON public.company_profile FOR SELECT
USING (is_vendor_staff(auth.uid()));

-- Only vendor admins can insert/update
CREATE POLICY "Vendor admins can manage company profile"
ON public.company_profile FOR ALL
USING (is_vendor_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_company_profile_updated_at
BEFORE UPDATE ON public.company_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for company documentation
INSERT INTO storage.buckets (id, name, public) VALUES ('company-docs', 'company-docs', false);

-- Storage policies
CREATE POLICY "Vendor staff can view company docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-docs' AND is_vendor_staff(auth.uid()));

CREATE POLICY "Vendor admins can upload company docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-docs' AND is_vendor_admin(auth.uid()));

CREATE POLICY "Vendor admins can delete company docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-docs' AND is_vendor_admin(auth.uid()));
