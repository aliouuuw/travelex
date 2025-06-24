/// TravelEx Database Model for dbdiagram.io - v2 (UUIDs & Supabase Auth)

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

Table routes {
  id          uuid       [pk, default: `gen_random_uuid()`]
  driver_id   uuid       [ref: > profiles.id]
  name        varchar    [not null]
  created_at  timestamptz  [default: `now()`]
}

Table route_stations {
  id           uuid     [pk, default: `gen_random_uuid()`]
  route_id     uuid     [ref: > routes.id]
  station_id   uuid     [ref: > stations.id]
  stop_type    varchar  [note: 'pickup' or 'dropoff']
  sequence     int      [not null]  // order in route
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

Table trips {
  id                 uuid      [pk, default: `gen_random_uuid()`]
  route_id           uuid      [ref: > routes.id]
  vehicle_id         uuid      [ref: > vehicles.id]
  luggage_policy_id  uuid      [ref: > luggage_policies.id]
  departure_time     timestamptz [not null]
  arrival_time       timestamptz
  base_price         decimal(10,2) [not null]
  status             varchar [default: 'scheduled']
  created_at         timestamptz  [default: `now()`]
}

Table reservations {
  id              uuid       [pk, default: `gen_random_uuid()`]
  trip_id         uuid       [ref: > trips.id]
  passenger_id    uuid       [ref: > profiles.id]
  luggage_weight  decimal(6,2) [default: 0]
  total_price     decimal(10,2)
  status          varchar [default: 'pending']
  created_at      timestamptz  [default: `now()`]
  updated_at      timestamptz  [default: `now()`]
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

