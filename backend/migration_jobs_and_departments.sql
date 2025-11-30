-- 1. Jobs Table (New)
create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  title text not null unique,
  description text,
  required_skills jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add columns to Employees Table
alter table public.employees 
add column if not exists job_id uuid references public.jobs(id) on delete set null,
add column if not exists department text;

-- 3. Update Leaderboard View to include department
drop view if exists public.leaderboard;
create or replace view public.leaderboard as
select 
  id as user_id,
  username,
  total_points,
  department,
  rank() over (order by total_points desc) as rank
from public.employees;
