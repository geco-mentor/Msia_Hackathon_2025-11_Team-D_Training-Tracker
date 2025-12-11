-- Cleanup script for testing pre-assessment flow
-- Run this in Supabase SQL Editor to clear test data

-- 1. Delete all pre-assessments (depends on scenarios)
DELETE FROM public.pre_assessments;

-- 2. Delete all assessments (depends on scenarios)
DELETE FROM public.assessments;

-- 3. Delete all scenarios (CTF challenges)
DELETE FROM public.scenarios;

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM public.scenarios) as scenarios_count,
  (SELECT COUNT(*) FROM public.pre_assessments) as pre_assessments_count,
  (SELECT COUNT(*) FROM public.assessments) as assessments_count;
