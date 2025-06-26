-- Create Route Templates System
-- This migration creates the complete schema for route template management

-- =============================================
-- ROUTE TEMPLATES
-- =============================================

-- Main route templates table
create table route_templates (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  estimated_duration text not null,
  base_price decimal(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Route template cities (ordered sequence of cities in the route)
create table route_template_cities (
  id uuid primary key default gen_random_uuid(),
  route_template_id uuid not null references route_templates(id) on delete cascade,
  city_name text not null,
  sequence_order integer not null,
  created_at timestamptz default now(),
  unique(route_template_id, sequence_order)
);

-- Available stations per city in route templates
create table route_template_stations (
  id uuid primary key default gen_random_uuid(),
  route_template_city_id uuid not null references route_template_cities(id) on delete cascade,
  station_name text not null,
  station_address text not null,
  created_at timestamptz default now()
);

-- Intercity segment pricing
create table route_template_pricing (
  id uuid primary key default gen_random_uuid(),
  route_template_id uuid not null references route_templates(id) on delete cascade,
  from_city text not null,
  to_city text not null,
  price decimal(10,2) not null,
  created_at timestamptz default now(),
  unique(route_template_id, from_city, to_city)
);

-- =============================================
-- SCHEDULED TRIPS (From Templates)
-- =============================================

-- Specific scheduled trips using route templates
create table trips (
  id uuid primary key default gen_random_uuid(),
  route_template_id uuid not null references route_templates(id) on delete restrict,
  driver_id uuid not null references profiles(id) on delete cascade,
  departure_time timestamptz not null,
  arrival_time timestamptz not null,
  total_seats integer not null default 4,
  available_seats integer not null default 4,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Driver's selected stations for specific trips (subset of available stations)
create table trip_stations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  route_template_station_id uuid not null references route_template_stations(id) on delete restrict,
  city_name text not null,
  sequence_order integer not null,
  is_pickup_point boolean not null default true,
  is_dropoff_point boolean not null default true,
  created_at timestamptz default now(),
  unique(trip_id, route_template_station_id)
);

-- =============================================
-- RESERVATIONS & BOOKINGS
-- =============================================

-- Passenger reservations for trip segments
create table reservations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  passenger_id uuid not null references profiles(id) on delete cascade,
  pickup_station_id uuid not null references trip_stations(id) on delete restrict,
  dropoff_station_id uuid not null references trip_stations(id) on delete restrict,
  seats_reserved integer not null default 1,
  total_price decimal(10,2) not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_reference text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Route templates indexes
create index idx_route_templates_driver_id on route_templates(driver_id);
create index idx_route_templates_status on route_templates(status);

-- Route template cities indexes
create index idx_route_template_cities_template_id on route_template_cities(route_template_id);
create index idx_route_template_cities_sequence on route_template_cities(route_template_id, sequence_order);

-- Route template stations indexes
create index idx_route_template_stations_city_id on route_template_stations(route_template_city_id);

-- Trip indexes
create index idx_trips_route_template_id on trips(route_template_id);
create index idx_trips_driver_id on trips(driver_id);
create index idx_trips_departure_time on trips(departure_time);
create index idx_trips_status on trips(status);

-- Trip stations indexes
create index idx_trip_stations_trip_id on trip_stations(trip_id);
create index idx_trip_stations_sequence on trip_stations(trip_id, sequence_order);

-- Reservations indexes
create index idx_reservations_trip_id on reservations(trip_id);
create index idx_reservations_passenger_id on reservations(passenger_id);
create index idx_reservations_status on reservations(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
alter table route_templates enable row level security;
alter table route_template_cities enable row level security;
alter table route_template_stations enable row level security;
alter table route_template_pricing enable row level security;
alter table trips enable row level security;
alter table trip_stations enable row level security;
alter table reservations enable row level security;

-- Route Templates RLS Policies
create policy "Drivers can view their own route templates" on route_templates
  for select using (driver_id = auth.uid() or auth.uid() in (
    select id from profiles where role = 'admin'
  ));

create policy "Drivers can insert their own route templates" on route_templates
  for insert with check (driver_id = auth.uid() and auth.uid() in (
    select id from profiles where role in ('driver', 'admin')
  ));

create policy "Drivers can update their own route templates" on route_templates
  for update using (driver_id = auth.uid() and auth.uid() in (
    select id from profiles where role in ('driver', 'admin')
  ));

create policy "Drivers can delete their own route templates" on route_templates
  for delete using (driver_id = auth.uid() and auth.uid() in (
    select id from profiles where role in ('driver', 'admin')
  ));

-- Route Template Cities RLS Policies
create policy "Access route template cities through template ownership" on route_template_cities
  for all using (
    route_template_id in (
      select id from route_templates where driver_id = auth.uid()
    ) or auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- Route Template Stations RLS Policies  
create policy "Access route template stations through city ownership" on route_template_stations
  for all using (
    route_template_city_id in (
      select rtc.id from route_template_cities rtc
      join route_templates rt on rt.id = rtc.route_template_id
      where rt.driver_id = auth.uid()
    ) or auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- Route Template Pricing RLS Policies
create policy "Access route template pricing through template ownership" on route_template_pricing
  for all using (
    route_template_id in (
      select id from route_templates where driver_id = auth.uid()
    ) or auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- Trips RLS Policies
create policy "Drivers can manage their own trips" on trips
  for all using (driver_id = auth.uid() or auth.uid() in (
    select id from profiles where role = 'admin'
  ));

-- Trip Stations RLS Policies
create policy "Access trip stations through trip ownership" on trip_stations
  for all using (
    trip_id in (
      select id from trips where driver_id = auth.uid()
    ) or auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- Reservations RLS Policies
create policy "Passengers can view their own reservations" on reservations
  for select using (passenger_id = auth.uid() or auth.uid() in (
    select id from profiles where role = 'admin'
  ));

create policy "Drivers can view reservations for their trips" on reservations
  for select using (
    trip_id in (
      select id from trips where driver_id = auth.uid()
    ) or auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate unique booking reference
create or replace function generate_booking_reference()
returns text as $$
begin
  return 'TRX' || upper(substring(gen_random_uuid()::text from 1 for 8));
end;
$$ language plpgsql;

-- Function to automatically set booking reference
create or replace function set_booking_reference()
returns trigger as $$
begin
  if new.booking_reference is null then
    new.booking_reference := generate_booking_reference();
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to set booking reference on reservations
create trigger set_booking_reference_trigger
  before insert on reservations
  for each row
  execute function set_booking_reference();

-- Function to update available seats when reservation is made
create or replace function update_available_seats()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    -- Decrease available seats
    update trips 
    set available_seats = available_seats - new.seats_reserved
    where id = new.trip_id;
    return new;
  elsif TG_OP = 'DELETE' then
    -- Increase available seats
    update trips 
    set available_seats = available_seats + old.seats_reserved
    where id = old.trip_id;
    return old;
  elsif TG_OP = 'UPDATE' then
    -- Adjust seat count
    update trips 
    set available_seats = available_seats - new.seats_reserved + old.seats_reserved
    where id = new.trip_id;
    return new;
  end if;
  return null;
end;
$$ language plpgsql;

-- Trigger to automatically update available seats
create trigger update_available_seats_trigger
  after insert or update or delete on reservations
  for each row
  execute function update_available_seats();

-- Function to update timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at timestamps
create trigger update_route_templates_updated_at
  before update on route_templates
  for each row
  execute function update_updated_at_column();

create trigger update_trips_updated_at
  before update on trips
  for each row
  execute function update_updated_at_column();

create trigger update_reservations_updated_at
  before update on reservations
  for each row
  execute function update_updated_at_column(); 