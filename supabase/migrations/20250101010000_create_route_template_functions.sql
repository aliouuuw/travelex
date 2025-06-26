-- Route Template Management Functions
-- This migration creates RPC functions for route template CRUD operations

-- =============================================
-- GET DRIVER'S ROUTE TEMPLATES WITH STATS
-- =============================================

create or replace function get_driver_route_templates(driver_uuid uuid)
returns table (
  id uuid,
  name text,
  estimated_duration text,
  base_price decimal(10,2),
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  cities json,
  intercity_fares json,
  scheduled_trips bigint,
  completed_trips bigint,
  total_earnings decimal(10,2)
) as $$
begin
  return query
  select 
    rt.id,
    rt.name,
    rt.estimated_duration,
    rt.base_price,
    rt.status,
    rt.created_at,
    rt.updated_at,
    -- Aggregate cities with their stations
    coalesce(
      (
        select json_agg(
          json_build_object(
            'cityName', rtc.city_name,
            'sequenceOrder', rtc.sequence_order,
            'stations', coalesce(
              (
                select json_agg(
                  json_build_object(
                    'id', rts.id,
                    'name', rts.station_name,
                    'address', rts.station_address
                  )
                  order by rts.station_name
                )
                from route_template_stations rts
                where rts.route_template_city_id = rtc.id
              ), '[]'::json
            )
          )
          order by rtc.sequence_order
        )
        from route_template_cities rtc
        where rtc.route_template_id = rt.id
      ), '[]'::json
    ) as cities,
    -- Aggregate intercity fares
    coalesce(
      (
        select json_agg(
          json_build_object(
            'fromCity', rtp.from_city,
            'toCity', rtp.to_city,
            'fare', rtp.price
          )
        )
        from route_template_pricing rtp
        where rtp.route_template_id = rt.id
      ), '[]'::json
    ) as intercity_fares,
    -- Count scheduled trips
    coalesce(
      (
        select count(*)
        from trips t
        where t.route_template_id = rt.id 
        and t.status = 'scheduled'
        and t.departure_time > now()
      ), 0
    ) as scheduled_trips,
    -- Count completed trips
    coalesce(
      (
        select count(*)
        from trips t
        where t.route_template_id = rt.id 
        and t.status = 'completed'
      ), 0
    ) as completed_trips,
    -- Calculate total earnings
    coalesce(
      (
        select sum(r.total_price)
        from trips t
        join reservations r on r.trip_id = t.id
        where t.route_template_id = rt.id 
        and r.status = 'completed'
      ), 0
    ) as total_earnings
  from route_templates rt
  where rt.driver_id = driver_uuid
  order by rt.updated_at desc;
end;
$$ language plpgsql security definer;

-- =============================================
-- CREATE ROUTE TEMPLATE WITH CITIES AND STATIONS
-- =============================================

create or replace function create_route_template(
  p_driver_id uuid,
  p_name text,
  p_estimated_duration text,
  p_base_price decimal(10,2),
  p_status text,
  p_cities json,
  p_intercity_fares json
)
returns uuid as $$
declare
  v_route_template_id uuid;
  v_city json;
  v_city_id uuid;
  v_station json;
  v_fare json;
begin
  -- Insert route template
  insert into route_templates (
    driver_id, name, estimated_duration, base_price, status
  ) values (
    p_driver_id, p_name, p_estimated_duration, p_base_price, p_status
  ) returning id into v_route_template_id;
  
  -- Insert cities and stations
  for v_city in select * from json_array_elements(p_cities)
  loop
    insert into route_template_cities (
      route_template_id, city_name, sequence_order
    ) values (
      v_route_template_id,
      v_city->>'cityName',
      (v_city->>'sequenceOrder')::integer
    ) returning id into v_city_id;
    
    -- Insert stations for this city
    for v_station in select * from json_array_elements(v_city->'stations')
    loop
      insert into route_template_stations (
        route_template_city_id, station_name, station_address
      ) values (
        v_city_id,
        v_station->>'name',
        v_station->>'address'
      );
    end loop;
  end loop;
  
  -- Insert intercity fares
  for v_fare in select * from json_array_elements(p_intercity_fares)
  loop
    insert into route_template_pricing (
      route_template_id, from_city, to_city, price
    ) values (
      v_route_template_id,
      v_fare->>'fromCity',
      v_fare->>'toCity',
      (v_fare->>'fare')::decimal(10,2)
    );
  end loop;
  
  return v_route_template_id;
end;
$$ language plpgsql security definer;

-- =============================================
-- UPDATE ROUTE TEMPLATE WITH CITIES AND STATIONS
-- =============================================

create or replace function update_route_template(
  p_route_template_id uuid,
  p_name text,
  p_estimated_duration text,
  p_base_price decimal(10,2),
  p_status text,
  p_cities json,
  p_intercity_fares json
)
returns boolean as $$
declare
  v_city json;
  v_city_id uuid;
  v_station json;
  v_fare json;
begin
  -- Update route template basic info
  update route_templates set
    name = p_name,
    estimated_duration = p_estimated_duration,
    base_price = p_base_price,
    status = p_status,
    updated_at = now()
  where id = p_route_template_id;
  
  -- Delete existing cities, stations, and pricing (cascade will handle related records)
  delete from route_template_cities where route_template_id = p_route_template_id;
  delete from route_template_pricing where route_template_id = p_route_template_id;
  
  -- Insert updated cities and stations
  for v_city in select * from json_array_elements(p_cities)
  loop
    insert into route_template_cities (
      route_template_id, city_name, sequence_order
    ) values (
      p_route_template_id,
      v_city->>'cityName',
      (v_city->>'sequenceOrder')::integer
    ) returning id into v_city_id;
    
    -- Insert stations for this city
    for v_station in select * from json_array_elements(v_city->'stations')
    loop
      insert into route_template_stations (
        route_template_city_id, station_name, station_address
      ) values (
        v_city_id,
        v_station->>'name',
        v_station->>'address'
      );
    end loop;
  end loop;
  
  -- Insert updated intercity fares
  for v_fare in select * from json_array_elements(p_intercity_fares)
  loop
    insert into route_template_pricing (
      route_template_id, from_city, to_city, price
    ) values (
      p_route_template_id,
      v_fare->>'fromCity',
      v_fare->>'toCity',
      (v_fare->>'fare')::decimal(10,2)
    );
  end loop;
  
  return true;
end;
$$ language plpgsql security definer;

-- =============================================
-- DELETE ROUTE TEMPLATE
-- =============================================

create or replace function delete_route_template(p_route_template_id uuid)
returns boolean as $$
begin
  -- Check if there are any scheduled trips using this template
  if exists (
    select 1 from trips 
    where route_template_id = p_route_template_id 
    and status in ('scheduled', 'in_progress')
  ) then
    raise exception 'Cannot delete route template with scheduled or in-progress trips';
  end if;
  
  -- Delete the route template (cascade will handle related records)
  delete from route_templates where id = p_route_template_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- =============================================
-- GET SINGLE ROUTE TEMPLATE BY ID
-- =============================================

create or replace function get_route_template_by_id(p_route_template_id uuid)
returns table (
  id uuid,
  driver_id uuid,
  name text,
  estimated_duration text,
  base_price decimal(10,2),
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  cities json,
  intercity_fares json
) as $$
begin
  return query
  select 
    rt.id,
    rt.driver_id,
    rt.name,
    rt.estimated_duration,
    rt.base_price,
    rt.status,
    rt.created_at,
    rt.updated_at,
    -- Aggregate cities with their stations
    coalesce(
      (
        select json_agg(
          json_build_object(
            'cityName', rtc.city_name,
            'sequenceOrder', rtc.sequence_order,
            'stations', coalesce(
              (
                select json_agg(
                  json_build_object(
                    'id', rts.id,
                    'name', rts.station_name,
                    'address', rts.station_address
                  )
                  order by rts.station_name
                )
                from route_template_stations rts
                where rts.route_template_city_id = rtc.id
              ), '[]'::json
            )
          )
          order by rtc.sequence_order
        )
        from route_template_cities rtc
        where rtc.route_template_id = rt.id
      ), '[]'::json
    ) as cities,
    -- Aggregate intercity fares
    coalesce(
      (
        select json_agg(
          json_build_object(
            'fromCity', rtp.from_city,
            'toCity', rtp.to_city,
            'fare', rtp.price
          )
        )
        from route_template_pricing rtp
        where rtp.route_template_id = rt.id
      ), '[]'::json
    ) as intercity_fares
  from route_templates rt
  where rt.id = p_route_template_id;
end;
$$ language plpgsql security definer; 