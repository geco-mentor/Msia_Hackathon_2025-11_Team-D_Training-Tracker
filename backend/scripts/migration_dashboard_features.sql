-- Dashboard Features Database Migration
-- Run this in Supabase SQL Editor

-- 1. Course Ratings Table (star ratings and reviews for courses)
CREATE TABLE IF NOT EXISTS public.course_ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  scenario_id uuid REFERENCES public.scenarios(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, scenario_id)
);

-- 2. Career Paths Table (progression tracks for employees)
CREATE TABLE IF NOT EXISTS public.career_paths (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  department text,
  levels jsonb DEFAULT '[]'::jsonb,  -- Array of {level, title, required_trainings[], min_elo}
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Update Employees table for career tracking and manager flag
ALTER TABLE employees ADD COLUMN IF NOT EXISTS career_path_id uuid REFERENCES public.career_paths(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS career_level integer DEFAULT 1;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_manager boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.employees(id);

-- 4. Sample Career Paths Data
INSERT INTO career_paths (name, description, department, levels) VALUES
  ('Software Engineering', 'Technical career track for engineers', 'Engineering', '[
    {"level": 1, "title": "Junior Engineer", "required_trainings": [], "min_elo": 800},
    {"level": 2, "title": "Mid Engineer", "required_trainings": ["Technical Excellence"], "min_elo": 1000},
    {"level": 3, "title": "Senior Engineer", "required_trainings": ["System Design", "Innovation"], "min_elo": 1200},
    {"level": 4, "title": "Staff Engineer", "required_trainings": ["Architecture", "Leadership"], "min_elo": 1400},
    {"level": 5, "title": "Principal Engineer", "required_trainings": ["Strategy", "Mentorship"], "min_elo": 1600}
  ]'::jsonb),
  ('Sales Professional', 'Sales career progression track', 'Sales', '[
    {"level": 1, "title": "Sales Associate", "required_trainings": [], "min_elo": 800},
    {"level": 2, "title": "Sales Executive", "required_trainings": ["Sales Strategy"], "min_elo": 1000},
    {"level": 3, "title": "Senior Account Manager", "required_trainings": ["Customer Focus", "Revenue Generation"], "min_elo": 1200},
    {"level": 4, "title": "Sales Manager", "required_trainings": ["Leadership", "Team Management"], "min_elo": 1400}
  ]'::jsonb),
  ('Finance Professional', 'Finance and accounting career track', 'Finance', '[
    {"level": 1, "title": "Financial Analyst", "required_trainings": [], "min_elo": 800},
    {"level": 2, "title": "Senior Analyst", "required_trainings": ["Financial Analysis"], "min_elo": 1000},
    {"level": 3, "title": "Finance Manager", "required_trainings": ["Risk Management", "Compliance"], "min_elo": 1200},
    {"level": 4, "title": "Finance Director", "required_trainings": ["Strategy", "Leadership"], "min_elo": 1400}
  ]'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. Enable Row Level Security (optional but recommended)
ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own ratings
CREATE POLICY "Users can manage their own ratings"
  ON course_ratings FOR ALL
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Anyone can read course ratings
CREATE POLICY "Anyone can view ratings"
  ON course_ratings FOR SELECT
  USING (true);

-- Policy: Anyone can read career paths
CREATE POLICY "Anyone can view career paths"
  ON career_paths FOR SELECT
  USING (true);

-- Grant permissions
GRANT ALL ON course_ratings TO authenticated;
GRANT ALL ON career_paths TO authenticated;

-- 6. Employee Certifications Table (for employees to add their own certificates)
CREATE TABLE IF NOT EXISTS public.employee_certifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  issuer text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for certifications
ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can CRUD their own certifications
CREATE POLICY "Users can manage their own certifications"
  ON employee_certifications FOR ALL
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Anyone can read certifications (for profile viewing)
CREATE POLICY "Anyone can view certifications"
  ON employee_certifications FOR SELECT
  USING (true);

-- Grant permissions
GRANT ALL ON employee_certifications TO authenticated;
