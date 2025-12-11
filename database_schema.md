-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  criteria jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  username text,
  password_hash text,
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.assessments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  scenario_id uuid,
  score integer NOT NULL,
  feedback text,
  difficulty text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  points_awarded integer DEFAULT 0,
  attempts integer DEFAULT 1,
  user_response text,
  questions_asked jsonb DEFAULT '[]'::jsonb,
  answers_given jsonb DEFAULT '[]'::jsonb,
  current_difficulty text DEFAULT 'Normal'::text,
  current_question integer DEFAULT 1,
  total_questions integer DEFAULT 7,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  CONSTRAINT assessments_pkey PRIMARY KEY (id),
  CONSTRAINT assessments_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id),
  CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id)
);
CREATE TABLE public.career_paths (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  department text,
  levels jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT career_paths_pkey PRIMARY KEY (id)
);
CREATE TABLE public.course_ratings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  scenario_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT course_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT course_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id),
  CONSTRAINT course_ratings_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  rubrics ARRAY DEFAULT '{}'::text[],
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.employee_career_goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  goal_title text NOT NULL,
  goal_description text,
  target_timeframe text DEFAULT '5 years'::text,
  generated_roadmap jsonb,
  recommended_certifications ARRAY DEFAULT '{}'::text[],
  recommended_assessments ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_career_goals_pkey PRIMARY KEY (id),
  CONSTRAINT employee_career_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id)
);
CREATE TABLE public.employee_certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  issuer text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT employee_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT employee_certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id)
);
CREATE TABLE public.employee_skills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  skill_name text NOT NULL,
  proficiency_level integer NOT NULL CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT employee_skills_pkey PRIMARY KEY (id),
  CONSTRAINT employee_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id)
);
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  job_title text DEFAULT 'Employee'::text,
  skills_profile jsonb DEFAULT '{}'::jsonb,
  ranking integer DEFAULT 0,
  win_rate double precision DEFAULT 0.0,
  streak integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  username text UNIQUE,
  employee_id text UNIQUE,
  password_hash text,
  total_points integer DEFAULT 0,
  level integer DEFAULT 1,
  job_id uuid,
  department text,
  elo_rating integer DEFAULT 800,
  department_id uuid,
  job_description text,
  career_path_id uuid,
  career_level integer DEFAULT 1,
  is_manager boolean DEFAULT false,
  manager_id uuid,
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT employees_career_path_id_fkey FOREIGN KEY (career_path_id) REFERENCES public.career_paths(id),
  CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id)
);
CREATE TABLE public.general_rubrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT general_rubrics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL UNIQUE,
  description text,
  required_skills jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT jobs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pre_assessments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  scenario_id uuid NOT NULL,
  is_familiar boolean DEFAULT false,
  questions_asked jsonb DEFAULT '[]'::jsonb,
  answers_given jsonb DEFAULT '[]'::jsonb,
  baseline_score integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  current_difficulty text DEFAULT 'Easy'::text,
  personalized_feedback jsonb,
  CONSTRAINT pre_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT pre_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id),
  CONSTRAINT pre_assessments_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id)
);
CREATE TABLE public.scenarios (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  skill text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['Easy'::text, 'Normal'::text, 'Hard'::text])),
  scenario_text text NOT NULL,
  task text NOT NULL,
  rubric jsonb NOT NULL,
  hint text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  title text UNIQUE,
  points integer DEFAULT 10,
  time_limit integer,
  is_active boolean DEFAULT true,
  type text DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'multiple_choice'::text, 'code'::text])),
  options jsonb,
  is_personalized boolean DEFAULT false,
  creator_id uuid,
  category text DEFAULT 'General'::text,
  solves integer DEFAULT 0,
  source_file text,
  status text DEFAULT 'published'::text,
  department_id uuid,
  post_assessment_date timestamp with time zone,
  rubrics jsonb,
  pre_assessment_data jsonb,
  post_assessment_data jsonb,
  extracted_text_file text,
  description text,
  department_ids ARRAY DEFAULT '{}'::uuid[],
  CONSTRAINT scenarios_pkey PRIMARY KEY (id),
  CONSTRAINT scenarios_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);