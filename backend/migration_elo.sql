-- Add Elo Rating column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200;
