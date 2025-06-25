-- Add email column to profiles table
alter table public.profiles add column email text;

-- Update the handle_new_user function to also populate the email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'passenger'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Update existing profiles to have email addresses
update public.profiles 
set email = (
  select email 
  from auth.users 
  where auth.users.id = profiles.id
)
where email is null; 