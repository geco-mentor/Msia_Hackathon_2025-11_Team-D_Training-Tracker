-- Migration: Add new columns for enhanced post-assessment
-- questions_asked: stores array of micro-scenarios
-- answers_given: stores array of answers with scores
-- current_difficulty: tracks adaptive difficulty
-- current_question: current question number
-- total_questions: total questions in assessment
-- completed: whether assessment is finished
-- completed_at: completion timestamp

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS questions_asked jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS answers_given jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS current_difficulty text DEFAULT 'Normal';

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS current_question int DEFAULT 1;

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS total_questions int DEFAULT 7;

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
