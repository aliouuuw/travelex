-- Create the profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'passenger',
  rating float8 not null default 0,
  updated_at timestamptz,
  created_at timestamptz default now()
);

-- Function to create a profile for a new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'role'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;

-- RLS policy for reading profiles
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

-- RLS policy for inserting profiles
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

-- RLS policy for updating profiles
create policy "Users can update their own profile." on profiles
  for update using (auth.uid() = id); 