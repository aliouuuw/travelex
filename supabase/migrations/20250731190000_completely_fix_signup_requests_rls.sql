-- Completely fix signup_requests RLS policies

-- First, drop all existing policies
drop policy if exists "Admins can view all signup requests" on public.signup_requests;
drop policy if exists "Admins can update signup requests" on public.signup_requests;
drop policy if exists "Anyone can create signup requests" on public.signup_requests;
drop policy if exists "Unauthenticated users can create signup requests" on public.signup_requests;

-- Disable RLS temporarily
alter table public.signup_requests disable row level security;

-- Re-enable RLS
alter table public.signup_requests enable row level security;

-- Create comprehensive policies

-- Policy 1: Allow anyone (authenticated or not) to insert signup requests
create policy "Allow all users to create signup requests" on public.signup_requests
  for insert
  with check (true);

-- Policy 2: Allow admins to view all signup requests  
create policy "Admins can view all signup requests" on public.signup_requests
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policy 3: Allow admins to update signup requests
create policy "Admins can update signup requests" on public.signup_requests
  for update using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policy 4: Allow admins to delete signup requests (for cleanup)
create policy "Admins can delete signup requests" on public.signup_requests
  for delete using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  ); 