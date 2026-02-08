-- Add title column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN title text;

-- Add a comment to explain the field
COMMENT ON COLUMN public.profiles.title IS 'Job title or role description for the user';