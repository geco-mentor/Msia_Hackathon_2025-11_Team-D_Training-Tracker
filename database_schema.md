# Supabase Database Schema

Based on your project's TypeScript interfaces, here is a simple and effective database schema for Supabase (PostgreSQL).

## Overview

We will use 7 main tables to map your data:

1.  **employees**: Stores employee profiles, including their stats, job title, skill profiles, and gamification progress.
2.  **admins**: Stores admin profiles.
3.  **scenarios**: Stores the training scenarios (CTF challenges), including the rubric (as JSON).
4.  **assessments**: Stores the history of completed scenarios by employees.
5.  **goals**: Stores employee goals.
6.  **achievements**: Stores available badges and milestones.
7.  **user_achievements**: Links employees to their earned achievements.

## SQL Setup

You can run the following SQL in your Supabase **SQL Editor** to create the tables.

```sql
-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Admins Table
create table public.admins (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Employees Table (Enhanced for Gamification)
create table public.employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  username text unique,
  employee_id text unique,
  password_hash text,
  job_title text default 'Employee',
  
  -- Skills & Stats
  skills_profile jsonb default '{}'::jsonb, -- Stores { "Empathy": 80, "Active Listening": 70 }
  ranking int default 0,      -- Global rank (can be derived from leaderboard view)
  win_rate float default 0.0,
  streak int default 0,
  
  -- CTF / Gamification
  total_points int default 0, -- Sum of points from completed challenges
  level int default 1,        -- Calculated level based on points
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Scenarios Table (CTF Challenges)
create table public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  
  -- Metadata
  title text, -- Short title (e.g., "Injection 101")
  skill text not null, -- The primary skill tested (e.g. "Prompt Engineering")
  difficulty text check (difficulty in ('Easy', 'Normal', 'Hard', 'Expert')) not null,
  points int default 10, -- Points awarded for completion
  
  -- Content
  scenario_text text not null,
  task text not null,
  hint text,
  
  -- Type & Validation
  type text check (type in ('text', 'multiple_choice', 'code')) default 'text',
  options jsonb, -- For multiple_choice: ["Option A", "Option B"]
  rubric jsonb not null, -- AI evaluation criteria or correct answer hash
  
  -- Settings
  time_limit int, -- Optional: seconds to complete
  is_active boolean default true,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Assessments Table (History & Scoring)
create table public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.employees(id) on delete cascade not null,
  scenario_id uuid references public.scenarios(id) on delete set null,
  
  -- Results
  score int not null, -- 0-100
  points_awarded int default 0, -- Actual points given (may be adjusted for hints/retries)
  feedback text,
  user_response text,
  difficulty text, -- Snapshot of difficulty at time of attempt
  
  -- Metadata
  attempts int default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Goals Table
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.employees(id) on delete cascade not null,
  description text not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Achievements Table (New)
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- e.g., "First Blood", "Prompt Master"
  description text not null,
  icon text, -- URL or icon name
  criteria jsonb, -- Logic for awarding (e.g., { "min_points": 100 })
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. User Achievements Table (New)
create table public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.employees(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, achievement_id)
);

-- 8. Leaderboard View (New)
create or replace view public.leaderboard as
select 
  id as user_id,
  username,
  total_points,
  rank() over (order by total_points desc) as rank
from public.employees;
```

## Typescript Interface Mapping

*   **Employee**: Maps to `employees` table. Now includes `total_points` and `level`.
*   **Admin**: Maps to `admins` table.
*   **Scenario**: Maps to `scenarios` table. Now includes `title`, `points`, `is_active`.
*   **HistoryItem**: Maps to a row in `assessments`.
*   **Goal**: Maps to `goals` table.
*   **Achievement**: Maps to `achievements` table.

## Next Steps

1.  Go to your Supabase Project Dashboard.
2.  Open the **SQL Editor**.
3.  Paste the SQL code above and click **Run**.
4.  (Optional) If you want to use Supabase Auth for login, you might link the `users` table to `auth.users` using a trigger, but for simplicity, this schema works as a standalone application data structure.
