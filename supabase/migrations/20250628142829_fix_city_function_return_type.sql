-- This migration fixes the return type of the get_available_cities function
-- to include the trip_count, which is required by the frontend.

-- Drop the existing function
drop function if exists get_available_cities();

-- Recreate the function with the correct return columns
create or replace function get_available_cities()
returns table (
  city_name text,
  trip_count bigint
) as $$
begin
  return query
  select
      rtc.city_name,
      count(distinct t.id) as trip_count
  from route_template_cities rtc
  join route_templates rt on rtc.route_template_id = rt.id
  join trips t on rt.id = t.route_template_id
  where rt.status = 'active'
    and t.status = 'scheduled'
    and t.departure_time >= current_date
  group by rtc.city_name
  order by rtc.city_name;
end;
$$ language plpgsql security definer;

-- Grant public access to the function
grant execute on function get_available_cities() to anon, authenticated;
