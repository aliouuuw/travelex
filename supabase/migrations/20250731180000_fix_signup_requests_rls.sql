-- Drop and recreate the insert policy for signup_requests to ensure it works for unauthenticated users
drop policy if exists "Anyone can create signup requests" on public.signup_requests;

-- Create a more explicit policy for unauthenticated inserts
create policy "Unauthenticated users can create signup requests" on public.signup_requests
  for insert 
  to anon, authenticated
  with check (true); 