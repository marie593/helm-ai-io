
-- Create project_collaborators table
CREATE TABLE public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('vendor_lead', 'customer_lead', 'collaborator')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- View policy: users with customer access can view collaborators
CREATE POLICY "Users with customer access can view collaborators"
ON public.project_collaborators
FOR SELECT
USING (has_customer_access(auth.uid(), get_project_customer_id(project_id)));

-- Vendor staff can manage collaborators
CREATE POLICY "Vendor staff can manage collaborators"
ON public.project_collaborators
FOR ALL
USING (is_vendor_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_project_collaborators_updated_at
BEFORE UPDATE ON public.project_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
