/// TravelEx Database Model for dbdiagram.io - v3 (Route Templates & Segment Booking)

// Note: This schema is designed for Supabase.
// The 'profiles' table is intended to link to Supabase's built-in 'auth.users' table.

Table profiles {
  id           uuid      [pk, ref: > auth.users.id]
  full_name    varchar   [not null]
  role         varchar   [not null, default: 'passenger']
  rating       float     [default: 0]
  avatar_url   varchar
  created_at   timestamptz [default: `now()`]
  updated_at   timestamptz [default: `now()`]
}

Table cities {
  id    uuid     [pk, default: `gen_random_uuid()`]
  name  varchar  [not null, unique]
}

Table stations {
  id       uuid     [pk, default: `gen_random_uuid()`]
  city_id  uuid     [ref: > cities.id]
  name     varchar  [not null]
  address  varchar
}

// Route Templates - Define intercity connections and available stations per city
Table route_templates {
  id          uuid       [pk, default: `gen_random_uuid()`]
  driver_id   uuid       [ref: > profiles.id]
  name        varchar    [not null]
  description varchar    // e.g., "Express service between Tamale and Accra"
  created_at  timestamptz  [default: `now()`]
}

// Cities in route templates with their sequence (Tamale → Kumasi → Accra)
Table route_template_cities {
  id                uuid     [pk, default: `gen_random_uuid()`]
  route_template_id uuid     [ref: > route_templates.id]
  city_id           uuid     [ref: > cities.id]
  sequence          int      [not null]  // 1, 2, 3... for city order
}

// Available stations per city in route templates
Table route_template_stations {
  id                      uuid     [pk, default: `gen_random_uuid()`]
  route_template_city_id  uuid     [ref: > route_template_cities.id]
  station_id              uuid     [ref: > stations.id]
}

// Scheduled trips using route templates
Table trips {
  id                 uuid        [pk, default: `gen_random_uuid()`]
  route_template_id  uuid        [ref: > route_templates.id]
  driver_id          uuid        [ref: > profiles.id]
  vehicle_id         uuid        [ref: > vehicles.id]
  luggage_policy_id  uuid        [ref: > luggage_policies.id]
  departure_time     timestamptz [not null]
  arrival_time       timestamptz
  status             varchar     [default: 'scheduled']
  created_at         timestamptz [default: `now()`]
}

// Selected stations for each scheduled trip (driver pre-selects which stations they'll serve)
Table trip_stations {
  id                      uuid     [pk, default: `gen_random_uuid()`]
  trip_id                 uuid     [ref: > trips.id]
  route_template_city_id  uuid     [ref: > route_template_cities.id]
  station_id              uuid     [ref: > stations.id]
  estimated_time          timestamptz  // When the trip will reach this station
}

// Pricing for intercity segments (fixed rates between cities)
Table segment_pricing {
  id                uuid        [pk, default: `gen_random_uuid()`]
  route_template_id uuid        [ref: > route_templates.id]
  from_city_id      uuid        [ref: > cities.id]
  to_city_id        uuid        [ref: > cities.id]
  price             decimal(10,2) [not null]
}

Table vehicles {
  id             uuid       [pk, default: `gen_random_uuid()`]
  driver_id      uuid       [ref: > profiles.id]
  make           varchar    [not null]
  model          varchar    [not null]
  type           varchar
  capacity       int        [not null]
  seat_map       jsonb      // For interactive seat selection UI
  created_at     timestamptz  [default: `now()`]
}

Table luggage_policies {
  id          uuid        [pk, default: `gen_random_uuid()`]
  driver_id   uuid        [ref: > profiles.id]
  name        varchar     [not null]
  max_weight  decimal(6,2)  // kg
  fee_per_kg  decimal(8,2)
  created_at  timestamptz [default: `now()`]
}

// Reservations support segment booking (passengers can book any valid segment)
Table reservations {
  id               uuid       [pk, default: `gen_random_uuid()`]
  trip_id          uuid       [ref: > trips.id]
  passenger_id     uuid       [ref: > profiles.id]
  pickup_station_id   uuid    [ref: > stations.id]
  dropoff_station_id  uuid    [ref: > stations.id]
  luggage_weight   decimal(6,2) [default: 0]
  total_price      decimal(10,2)
  status           varchar [default: 'pending']
  created_at       timestamptz  [default: `now()`]
  updated_at       timestamptz  [default: `now()`]
}

Table booked_seats {
    id              uuid        [pk, default: `gen_random_uuid()`]
    reservation_id  uuid        [ref: > reservations.id]
    seat_number     varchar(10) [not null] // e.g., 'A1', 'B2'
}

Table payments {
  id                uuid      [pk, default: `gen_random_uuid()`]
  reservation_id    uuid      [ref: > reservations.id]
  stripe_payment_id varchar   [unique]
  amount            decimal(10,2)
  currency          varchar(3) [default: 'USD']
  status            varchar [default: 'pending']
  paid_at           timestamptz
}

Table ratings {
  id         uuid       [pk, default: `gen_random_uuid()`]
  trip_id    uuid       [not null, ref: > trips.id]
  rater_id   uuid       [not null, ref: > profiles.id]
  ratee_id   uuid       [not null, ref: > profiles.id]
  score      int        [not null]  // Expected to be 1–5
  comment    varchar
  created_at timestamptz  [default: `now()`]
}

// Key Changes in v3:
// 1. Routes are now "route_templates" - reusable intercity connection patterns
// 2. Added route_template_cities for defining city sequences
// 3. Added route_template_stations for available stations per city
// 4. Added trip_stations for driver's selected stations per scheduled trip
// 5. Added segment_pricing for fixed intercity rates
// 6. Reservations now support pickup/dropoff stations for segment booking
// 7. This enables passengers to book any valid segment (e.g., Kumasi-Accra from Tamale-Kumasi-Accra trip)

