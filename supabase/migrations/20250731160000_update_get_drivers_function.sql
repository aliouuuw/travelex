-- Drop the existing function first since we're changing the return type
drop function if exists public.get_drivers();

-- Recreate get_drivers function to use email from profiles table
create or replace function public.get_drivers()
returns table (
    id uuid,
    full_name text,
    email text,
    role text,
    created_at timestamptz
) as $$
begin
    return query
    select
        p.id,
        p.full_name,
        p.email,
        p.role,
        p.created_at
    from
        public.profiles p
    where
        p.role = 'driver';
end;
$$ language plpgsql security definer;

-- Re-grant execute permission to authenticated users
grant execute on function public.get_drivers() to authenticated; 