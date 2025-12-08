-- Migration: Add new columns for enhanced pre-assessment
-- current_difficulty: tracks adaptive difficulty progression
-- personalized_feedback: stores AI-generated feedback at completion

ALTER TABLE public.pre_assessments 
ADD COLUMN IF NOT EXISTS current_difficulty text DEFAULT 'Easy';

ALTER TABLE public.pre_assessments 
ADD COLUMN IF NOT EXISTS personalized_feedback jsonb;

-- Optional: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pre_assessments_user_scenario 
ON public.pre_assessments(user_id, scenario_id);
