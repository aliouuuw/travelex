create or replace function public.get_drivers()
returns table (
    id uuid,
    full_name text,
    email text,
    role text,
    last_sign_in_at timestamptz
) as $$
begin
    return query
    select
        p.id,
        p.full_name,
        u.email,
        p.role,
        u.last_sign_in_at
    from
        public.profiles p
    join
        auth.users u on p.id = u.id
    where
        p.role = 'driver';
end;
$$ language plpgsql security definer; 