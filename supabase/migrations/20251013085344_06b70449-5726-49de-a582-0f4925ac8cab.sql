-- Add contact_email field to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS contact_email TEXT;