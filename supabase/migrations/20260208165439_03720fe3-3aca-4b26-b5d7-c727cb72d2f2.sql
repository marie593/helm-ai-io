-- Create customer invitations table for pending invites
CREATE TABLE public.customer_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_customer_invitations_email ON public.customer_invitations(email);
CREATE INDEX idx_customer_invitations_token ON public.customer_invitations(token);

-- Enable RLS
ALTER TABLE public.customer_invitations ENABLE ROW LEVEL SECURITY;

-- Vendor staff can view invitations for customers they have access to
CREATE POLICY "Vendor staff can view invitations"
ON public.customer_invitations
FOR SELECT
USING (is_vendor_staff(auth.uid()));

-- Vendor admins can manage invitations
CREATE POLICY "Vendor admins can manage invitations"
ON public.customer_invitations
FOR ALL
USING (is_vendor_admin(auth.uid()));

-- Users can view their own pending invitations by email
CREATE POLICY "Users can view their own invitations"
ON public.customer_invitations
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_customer_invitations_updated_at
BEFORE UPDATE ON public.customer_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();