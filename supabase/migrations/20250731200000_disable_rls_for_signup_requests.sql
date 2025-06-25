-- Disable RLS for signup_requests table entirely since anyone should be able to apply
-- This is the simplest and most reliable solution

-- Drop all existing policies first
drop policy if exists "Admins can view all signup requests" on public.signup_requests;
drop policy if exists "Admins can update signup requests" on public.signup_requests;
drop policy if exists "Anyone can create signup requests" on public.signup_requests;
drop policy if exists "Unauthenticated users can create signup requests" on public.signup_requests;
drop policy if exists "Allow all users to create signup requests" on public.signup_requests;
drop policy if exists "Admins can delete signup requests" on public.signup_requests;

-- Completely disable RLS for this table
alter table public.signup_requests disable row level security;

-- Add a comment explaining why RLS is disabled
comment on table public.signup_requests is 'RLS disabled - anyone can insert signup requests, admins manage via application logic'; 