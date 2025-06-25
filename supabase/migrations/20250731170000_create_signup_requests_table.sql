-- Create signup_requests table for driver applications
create table public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  message text, -- Optional message from the applicant
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

-- Enable RLS
alter table public.signup_requests enable row level security;

-- Policy for admins to view all requests
create policy "Admins can view all signup requests" on public.signup_requests
  for select using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policy for admins to update requests (approve/reject)
create policy "Admins can update signup requests" on public.signup_requests
  for update using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Policy for anyone to insert signup requests
create policy "Anyone can create signup requests" on public.signup_requests
  for insert with check (true);

-- Function to update the updated_at timestamp
create or replace function public.update_signup_request_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update timestamp
create trigger update_signup_requests_timestamp
  before update on public.signup_requests
  for each row execute function public.update_signup_request_timestamp(); 