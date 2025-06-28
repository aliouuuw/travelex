-- This migration fixes the get_available_cities function to show cities
-- even when trips might be scheduled for today or have restrictive criteria

-- Drop and recreate the get_available_cities function with correct table references
DROP FUNCTION IF EXISTS get_available_cities();

CREATE OR REPLACE FUNCTION get_available_cities()
RETURNS TABLE (
    city_name TEXT,
    trip_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rtc.city_name,
        COUNT(DISTINCT t.id) as trip_count
    FROM route_template_cities rtc
    JOIN route_templates rt ON rtc.route_template_id = rt.id
    JOIN trips t ON rt.id = t.route_template_id
    WHERE t.status = 'scheduled'
        AND DATE(t.departure_time) >= CURRENT_DATE
    GROUP BY rtc.city_name
    HAVING COUNT(DISTINCT t.id) > 0
    ORDER BY rtc.city_name;
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION get_available_cities() TO anon;
GRANT EXECUTE ON FUNCTION get_available_cities() TO authenticated;

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
    )
  order by t.departure_time;
end;
$$ language plpgsql security definer;

-- Grant public access to the function
grant execute on function search_trips_by_segment(text, text, date, integer) to anon, authenticated;

-- =============================================
-- GET TRIP FOR BOOKING FUNCTION
-- =============================================

-- Get detailed trip information for booking
create or replace function get_trip_for_booking(p_trip_id uuid)
returns table (
  trip_id uuid,
  route_template_id uuid,
  driver_id uuid,
  driver_name text,
  driver_email text,
  driver_phone text,
  departure_time timestamptz,
  arrival_time timestamptz,
  available_seats integer,
  total_seats integer,
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_license_plate text,
  route_cities json,
  all_stations json
) as $$
begin
  return query
  select 
    t.id as trip_id,
    t.route_template_id,
    t.driver_id,
    p.full_name as driver_name,
    p.email as driver_email,
    p.phone as driver_phone,
    t.departure_time,
    t.arrival_time,
    t.available_seats,
    t.total_seats,
    v.vehicle_type,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.year as vehicle_year,
    v.license_plate as vehicle_license_plate,
    
    -- Get all cities in route order
    (
      select json_agg(
        json_build_object(
          'cityName', ts.city_name,
          'sequenceOrder', ts.sequence_order
        )
        order by ts.sequence_order
      )
      from (
        select distinct ts.city_name, ts.sequence_order
        from trip_stations ts
        where ts.trip_id = t.id
      ) ts
    ) as route_cities,
    
    -- Get all stations for this trip
    (
      select json_agg(
        json_build_object(
          'id', ts.id,
          'cityName', ts.city_name,
          'stationName', rts.station_name,
          'stationAddress', rts.station_address,
          'sequenceOrder', ts.sequence_order,
          'isPickupPoint', ts.is_pickup_point,
          'isDropoffPoint', ts.is_dropoff_point
        )
        order by ts.sequence_order, rts.station_name
      )
      from trip_stations ts
      join route_template_stations rts on rts.id = ts.route_template_station_id
      where ts.trip_id = t.id
    ) as all_stations
    
  from trips t
  join route_templates rt on rt.id = t.route_template_id
  join profiles p on p.id = t.driver_id
  left join vehicles v on v.driver_id = t.driver_id and v.is_primary = true
  where t.id = p_trip_id
    and rt.status = 'active'
    and t.status = 'scheduled';
end;
$$ language plpgsql security definer;

-- Grant public access to the function
grant execute on function get_trip_for_booking(uuid) to anon, authenticated;

-- =============================================
-- DEBUG FUNCTION TO CHECK SCHEMA
-- =============================================

-- Debug function to check what data exists
create or replace function debug_search_schema()
returns table (
  table_name text,
  row_count bigint
) as $$
begin
  return query
  select 'route_templates'::text, count(*) from route_templates
  union all
  select 'route_template_cities'::text, count(*) from route_template_cities
  union all
  select 'route_template_stations'::text, count(*) from route_template_stations
  union all
  select 'trips'::text, count(*) from trips
  union all
  select 'trip_stations'::text, count(*) from trip_stations
  union all
  select 'reusable_cities'::text, count(*) from reusable_cities
  union all
  select 'reusable_stations'::text, count(*) from reusable_stations
  union all
  select 'vehicles'::text, count(*) from vehicles;
end;
$$ language plpgsql security definer;

-- Grant public access to debug function
grant execute on function debug_search_schema() to anon, authenticated; 