/// TravelEx Database Model for dbdiagram.io - v4 (Implemented Route Templates & Reusable Cities)

// Note: This schema is designed for Supabase.
// The 'profiles' table is intended to link to Supabase's built-in 'auth.users' table.

Table profiles {
  id           uuid      [pk, ref: > auth.users.id]
  full_name    varchar   [not null]
  email        varchar   [not null] // Added for better data management
  phone        varchar             // Added for passenger contact management
  role         varchar   [not null, default: 'passenger']
  rating       float     [default: 0]
  avatar_url   varchar
  created_at   timestamptz [default: `now()`]
  updated_at   timestamptz [default: `now()`]
}

// Main Route Templates - Define intercity connections 
Table route_templates {
  id                 uuid       [pk, default: `gen_random_uuid()`]
  driver_id          uuid       [ref: > profiles.id]
  name               varchar    [not null]
  estimated_duration varchar    [not null] // e.g., "4 hours"
  base_price         decimal(10,2) [not null, default: 0]
  status             varchar    [not null, default: 'draft'] // draft, active, inactive
  created_at         timestamptz  [default: `now()`]
  updated_at         timestamptz  [default: `now()`]
}

// Cities in route templates with their sequence (Tamale → Kumasi → Accra)
Table route_template_cities {
  id                uuid     [pk, default: `gen_random_uuid()`]
  route_template_id uuid     [ref: > route_templates.id]
  city_name         varchar  [not null] // Storing city name directly
  sequence_order    int      [not null]  // 0, 1, 2... for city order
  created_at        timestamptz [default: `now()`]
}

// Available stations per city in route templates
Table route_template_stations {
  id                      uuid     [pk, default: `gen_random_uuid()`]
  route_template_city_id  uuid     [ref: > route_template_cities.id]
  station_name            varchar  [not null]
  station_address         varchar  [not null]
  created_at              timestamptz [default: `now()`]
}

// Intercity segment pricing (between adjacent cities)
Table route_template_pricing {
  id                uuid        [pk, default: `gen_random_uuid()`]
  route_template_id uuid        [ref: > route_templates.id]
  from_city         varchar     [not null]
  to_city           varchar     [not null]
  price             decimal(10,2) [not null]
  created_at        timestamptz [default: `now()`]
}

// Reusable Cities - For efficiency across route templates
Table reusable_cities {
  id         uuid       [pk, default: `gen_random_uuid()`]
  driver_id  uuid       [ref: > profiles.id]
  city_name  varchar    [not null]
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
}

// Reusable Stations - Linked to reusable cities
Table reusable_stations {
  id                uuid       [pk, default: `gen_random_uuid()`]
  reusable_city_id  uuid       [ref: > reusable_cities.id]
  station_name      varchar    [not null]
  station_address   varchar    [not null]
  created_at        timestamptz [default: `now()`]
  updated_at        timestamptz [default: `now()`]
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

// Key Changes in v4 (Implemented):
// 1. Completed route template system with comprehensive UI and backend
// 2. Added reusable_cities and reusable_stations for efficiency
// 3. Route templates now store city names directly for simplicity
// 4. Added route_template_pricing for intercity segment pricing
// 5. Enhanced profiles table with email field for better data management
// 6. Implemented full CRUD operations for route template management
// 7. Added status field to route templates (draft, active, inactive)
// 8. Pricing system supports both segment and total route fare calculation

// Features Implemented (as of Session 11):
// - Complete route template creation and editing with drag-and-drop UI
// - Reusable cities and stations system with tabbed interface
// - Visual pricing configuration with auto-calculation
// - Route template deletion with safety confirmations
// - Real-time route visualization with flowchart display
// - Integration with TanStack Query for caching and state management
// - Complete vehicle management system with seat maps and maintenance tracking
// - Comprehensive luggage policy management with real-time fee calculation
// - Full trip scheduling and management system using route templates
// - Multi-step trip creation with station pre-selection workflow
// - Trip CRUD operations with editing, status management, and statistics
// - Professional trip management dashboard with search and filtering
// - Interactive Trip Calendar/Timeline View with Microsoft Teams-like interface
// - Multi-step quick schedule modal with proper station selection
// - Enhanced datetime picker with brand colors and smart constraints
// - Visual trip management with counters, status indicators, and mobile design
// - Complete reservation management system with passenger booking oversight
// - Advanced search and filtering for reservations by multiple criteria
// - Status workflow management for reservation lifecycle (pending → confirmed → completed)
// - Comprehensive passenger information display with contact details
// - Real-time reservation analytics with revenue and passenger tracking
// - Professional design consistency with standardized spacing across all driver pages
// - Personalized dashboard with driver welcome message and unified layout

// Current Implementation Status (2024):
// ✅ Phase 1: Foundation & Project Setup - COMPLETE
// ✅ Phase 2: Admin Dashboard & Core Management - COMPLETE  
// ✅ Phase 3: Route Template & Trip Management - COMPLETE
//   - Route Template Management - COMPLETE
//   - Vehicle Management - COMPLETE  
//   - Luggage Policy Management - COMPLETE
//   - Trip Scheduling from Templates - COMPLETE
//   - Trip Calendar/Timeline View - COMPLETE
//   - Reservation Management (Driver View) - COMPLETE ✅
// 🔄 Next: Passenger-Facing Platform for public trip search and booking

