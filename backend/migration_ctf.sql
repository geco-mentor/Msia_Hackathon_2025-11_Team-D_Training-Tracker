-- Migration: Add CTF support columns

-- Add 'type' and 'options' to scenarios table
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS type text check (type in ('text', 'multiple_choice')) default 'text',
ADD COLUMN IF NOT EXISTS options jsonb;

-- Add 'user_response' to assessments table
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS user_response text;
