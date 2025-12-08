-- Pre-Assessments Table
-- Tracks employee pre-assessment completion before they can access training/post-assessment
-- Created: 2025-12-07

create table if not exists public.pre_assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.employees(id) on delete cascade not null,
  scenario_id uuid references public.scenarios(id) on delete cascade not null,
  is_familiar boolean default false,
  questions_asked jsonb default '[]'::jsonb,
  answers_given jsonb default '[]'::jsonb,
  baseline_score int default 0,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  unique(user_id, scenario_id)
);

-- Index for faster lookups by user and scenario
create index if not exists idx_pre_assessments_user_scenario 
on public.pre_assessments(user_id, scenario_id);

-- Index for finding incomplete pre-assessments
create index if not exists idx_pre_assessments_completed 
on public.pre_assessments(completed) where completed = false;
