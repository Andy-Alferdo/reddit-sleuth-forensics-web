-- Drop the existing global unique constraint on case_number
ALTER TABLE public.investigation_cases DROP CONSTRAINT IF EXISTS investigation_cases_case_number_key;

-- Add a composite unique constraint for case_number per user
ALTER TABLE public.investigation_cases ADD CONSTRAINT investigation_cases_case_number_user_unique UNIQUE (case_number, created_by);