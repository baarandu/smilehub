-- =====================================================
-- DEBUG: Database Schema and Triggers
-- Execute this to inspect potential conflicts
-- =====================================================

-- 1. List all triggers on auth.users
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation as event,
    action_statement as definition
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- 2. List columns of public.profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public';

-- 3. List constraints on public.profiles
SELECT 
    conname as constraint_name, 
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;
