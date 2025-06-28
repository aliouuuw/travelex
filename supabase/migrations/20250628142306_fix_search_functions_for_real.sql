-- =============================================
-- FIX DATABASE SEARCH FUNCTIONS
-- =============================================
-- This migration drops and recreates the database functions for trip search
-- to ensure they use the correct table names and schemas.

-- Drop the old, potentially incorrect versions of the functions
drop function if exists get_available_cities();
drop function if exists search_trips_by_segment(text, text, date, integer);
drop function if exists get_trip_for_booking(uuid);

-- =============================================
-- GET AVAILABLE CITIES FUNCTION
-- =============================================

-- Get all unique cities that have upcoming trips
create or replace function get_available_cities()
returns table (
  city_name text
) as $$
begin
  return query
  select distinct rtc.city_name
  from route_template_cities rtc
  join route_templates rt on rt.id = rtc.route_template_id
  join trips t on t.route_template_id = rt.id
  where rt.status = 'active'
    and t.status = 'scheduled'
    and t.departure_time >= current_date
  order by rtc.city_name;
end;
$$ language plpgsql security definer;

-- Grant public access to the function
grant execute on function get_available_cities() to anon, authenticated;

-- =============================================
-- SEARCH TRIPS BY SEGMENT FUNCTION
-- =============================================

-- Search for trips between two cities on a specific date
create or replace function search_trips_by_segment(
  p_from_city text,
  p_to_city text,
  p_travel_date date,
  p_passengers integer default 1
)
returns table (
  trip_id uuid,
  route_template_id uuid,
  driver_id uuid,
  driver_name text,
  driver_email text,
  departure_time timestamptz,
  arrival_time timestamptz,
  available_seats integer,
  total_seats integer,
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  from_city text,
  to_city text,
  price decimal(10,2),
  pickup_stations json,
  dropoff_stations json
) as $$
begin
  return query
  select 
    t.id as trip_id,
    t.route_template_id,
    t.driver_id,
    p.full_name as driver_name,
    p.email as driver_email,
    t.departure_time,
    t.arrival_time,
    t.available_seats,
    t.total_seats,
    v.vehicle_type,
    v.make as vehicle_make,
    v.model as vehicle_model,
    p_from_city as from_city,
    p_to_city as to_city,
    coalesce(rtp.price, 0) as price,
    
    -- Get pickup stations for the from_city
    (
      select json_agg(
        json_build_object(
          'id', ts.id,
          'name', rts.station_name,
          'address', rts.station_address
        )
      )
      from trip_stations ts
      join route_template_stations rts on rts.id = ts.route_template_station_id
      where ts.trip_id = t.id 
        and ts.city_name = p_from_city
        and ts.is_pickup_point = true
    ) as pickup_stations,
    
    -- Get dropoff stations for the to_city
    (
      select json_agg(
        json_build_object(
          'id', ts.id,
          'name', rts.station_name,
          'address', rts.station_address
        )
      )
      from trip_stations ts
      join route_template_stations rts on rts.id = ts.route_template_station_id
      where ts.trip_id = t.id 
        and ts.city_name = p_to_city
        and ts.is_dropoff_point = true
    ) as dropoff_stations
    
  from trips t
  join route_templates rt on rt.id = t.route_template_id
  join profiles p on p.id = t.driver_id
  left join vehicles v on v.driver_id = t.driver_id and v.is_primary = true
  left join route_template_pricing rtp on rtp.route_template_id = rt.id 
    and rtp.from_city = p_from_city 
    and rtp.to_city = p_to_city
  where rt.status = 'active'
    and t.status = 'scheduled'
    and date(t.departure_time) = p_travel_date
    and t.available_seats >= p_passengers
    -- Check that both cities exist in the route
    and exists (
      select 1 from trip_stations ts1 
      where ts1.trip_id = t.id and ts1.city_name = p_from_city
    )
    and exists (
      select 1 from trip_stations ts2 
      where ts2.trip_id = t.id and ts2.city_name = p_to_city
    )
    -- Ensure from_city comes before to_city in the route sequence
    and (
      select min(ts1.sequence_order) 
      from trip_stations ts1 
      where ts1.trip_id = t.id and ts1.city_name = p_from_city
    ) < (
      select min(ts2.sequence_order) 
      from trip_stations ts2 
      where ts2.trip_id = t.id and ts2.city_name = p_to_city
    );
end;
$$ language plpgsql security definer;

-- Grant public access to the function
grant execute on function search_trips_by_segment(text, text, date, integer) to anon, authenticated;
