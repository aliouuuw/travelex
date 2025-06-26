-- Create Reusable Cities and Stations System
-- This migration adds tables for reusable cities and stations that drivers can use across multiple route templates

-- =============================================
-- REUSABLE CITIES
-- =============================================

-- Master cities table for reusable city definitions
create table reusable_cities (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references profiles(id) on delete cascade,
  city_name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(driver_id, city_name) -- Each driver can only have one city with the same name
);

-- =============================================
-- REUSABLE STATIONS
-- =============================================

-- Master stations table for reusable station definitions
create table reusable_stations (
  id uuid primary key default gen_random_uuid(),
  reusable_city_id uuid not null references reusable_cities(id) on delete cascade,
  station_name text not null,
  station_address text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(reusable_city_id, station_name) -- Each city can only have one station with the same name
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Reusable cities indexes
create index idx_reusable_cities_driver_id on reusable_cities(driver_id);
create index idx_reusable_cities_name on reusable_cities(driver_id, city_name);

-- Reusable stations indexes
create index idx_reusable_stations_city_id on reusable_stations(reusable_city_id);
create index idx_reusable_stations_name on reusable_stations(reusable_city_id, station_name);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on reusable tables
alter table reusable_cities enable row level security;
alter table reusable_stations enable row level security;

-- Reusable Cities RLS Policies
create policy "Drivers can manage their own reusable cities" on reusable_cities
  for all using (driver_id = auth.uid() or auth.uid() in (
    select id from profiles where role = 'admin'
  ));

-- Reusable Stations RLS Policies
create policy "Drivers can manage stations in their cities" on reusable_stations
  for all using (
    reusable_city_id in (
      select id from reusable_cities where driver_id = auth.uid()
    ) or auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- =============================================
-- FUNCTIONS FOR REUSABLE CITIES/STATIONS
-- =============================================

-- Get all cities and their stations for a driver
create or replace function get_driver_cities_and_stations(driver_uuid uuid)
returns json as $$
begin
  return (
    select json_agg(
      json_build_object(
        'id', rc.id,
        'cityName', rc.city_name,
        'stations', coalesce(
          (
            select json_agg(
              json_build_object(
                'id', rs.id,
                'name', rs.station_name,
                'address', rs.station_address
              )
              order by rs.station_name
            )
            from reusable_stations rs
            where rs.reusable_city_id = rc.id
          ), '[]'::json
        )
      )
      order by rc.city_name
    )
    from reusable_cities rc
    where rc.driver_id = driver_uuid
  );
end;
$$ language plpgsql security definer;

-- Save cities and stations (upsert operation)
create or replace function save_cities_and_stations(
  p_driver_id uuid,
  p_cities json
)
returns boolean as $$
declare
  v_city json;
  v_station json;
  v_city_id uuid;
begin
  -- Process each city
  for v_city in select * from json_array_elements(p_cities)
  loop
    -- Insert or update city
    insert into reusable_cities (driver_id, city_name)
    values (p_driver_id, v_city->>'cityName')
    on conflict (driver_id, city_name) 
    do update set updated_at = now()
    returning id into v_city_id;
    
    -- Process stations for this city
    for v_station in select * from json_array_elements(v_city->'stations')
    loop
      -- Insert or update station
      insert into reusable_stations (reusable_city_id, station_name, station_address)
      values (v_city_id, v_station->>'name', v_station->>'address')
      on conflict (reusable_city_id, station_name)
      do update set 
        station_address = excluded.station_address,
        updated_at = now();
    end loop;
  end loop;
  
  return true;
end;
$$ language plpgsql security definer;

-- Auto-populate reusable cities/stations from existing route templates
create or replace function populate_reusable_from_templates()
returns void as $$
declare
  v_driver_id uuid;
  v_cities json;
begin
  -- For each driver, extract cities and stations from their route templates
  for v_driver_id in 
    select distinct driver_id from route_templates
  loop
    -- Get cities and stations from this driver's route templates
    select json_agg(
      json_build_object(
        'cityName', city_data.city_name,
        'stations', city_data.stations
      )
    ) into v_cities
    from (
      select 
        rtc.city_name,
        json_agg(
          json_build_object(
            'name', rts.station_name,
            'address', rts.station_address
          )
        ) as stations
      from route_template_cities rtc
      join route_templates rt on rt.id = rtc.route_template_id
      left join route_template_stations rts on rts.route_template_city_id = rtc.id
      where rt.driver_id = v_driver_id
      group by rtc.city_name
    ) city_data;
    
    -- Save the extracted cities and stations
    if v_cities is not null then
      perform save_cities_and_stations(v_driver_id, v_cities);
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- =============================================
-- TRIGGERS FOR AUTO-UPDATE
-- =============================================

-- Update timestamp trigger for reusable cities
create trigger update_reusable_cities_updated_at
  before update on reusable_cities
  for each row
  execute function update_updated_at_column();

-- Update timestamp trigger for reusable stations  
create trigger update_reusable_stations_updated_at
  before update on reusable_stations
  for each row
  execute function update_updated_at_column();

-- =============================================
-- INITIAL DATA POPULATION
-- =============================================

-- Populate reusable cities/stations from existing route templates
select populate_reusable_from_templates(); 