-- Add new fields to customers table for expanded profile information
ALTER TABLE public.customers
ADD COLUMN company_size text,
ADD COLUMN teams_involved text[],
ADD COLUMN goals text,
ADD COLUMN notes text;

-- Add comments for clarity
COMMENT ON COLUMN public.customers.company_size IS 'Company size category (e.g., 1-10, 11-50, 51-200, 201-500, 500+)';
COMMENT ON COLUMN public.customers.teams_involved IS 'Array of team names involved in implementation';
COMMENT ON COLUMN public.customers.goals IS 'Customer implementation goals';
COMMENT ON COLUMN public.customers.notes IS 'Additional notes about the customer';

-- Add DELETE policy for vendor admins on customers (already has ALL policy for admins, but let's ensure it's explicit)
-- The existing "Vendor admins can manage customers" policy with ALL command already covers DELETE