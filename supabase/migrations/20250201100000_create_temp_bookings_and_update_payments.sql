-- Create payments table (was missing from original schema)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  stripe_payment_id varchar UNIQUE,
  payment_intent_id varchar UNIQUE,
  client_secret varchar,
  payment_method_id varchar,
  amount decimal(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'USD',
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'canceled')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create booked_seats table (was missing from original schema)
CREATE TABLE IF NOT EXISTS booked_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seat_number varchar(10) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create temp_bookings table for pre-payment booking data
CREATE TABLE temp_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_name varchar NOT NULL,
  passenger_email varchar NOT NULL,
  passenger_phone varchar,
  pickup_station_id uuid NOT NULL REFERENCES trip_stations(id) ON DELETE RESTRICT,
  dropoff_station_id uuid NOT NULL REFERENCES trip_stations(id) ON DELETE RESTRICT,
  selected_seats jsonb NOT NULL DEFAULT '[]'::jsonb,
  number_of_bags integer DEFAULT 1,
  total_price decimal(10,2) NOT NULL,
  payment_intent_id varchar UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz DEFAULT now()
);

-- Update reservations table to support anonymous bookings
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS passenger_name varchar;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS passenger_email varchar;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS passenger_phone varchar;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS number_of_bags integer DEFAULT 1;

-- Make passenger_id nullable for anonymous reservations
ALTER TABLE reservations ALTER COLUMN passenger_id DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX idx_temp_bookings_payment_intent ON temp_bookings(payment_intent_id);
CREATE INDEX idx_temp_bookings_expires_at ON temp_bookings(expires_at);
CREATE INDEX idx_payments_payment_intent ON payments(payment_intent_id);
CREATE INDEX idx_payments_stripe_payment_id ON payments(stripe_payment_id);
CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_booked_seats_reservation_id ON booked_seats(reservation_id);

-- Function to clean up expired temp bookings
CREATE OR REPLACE FUNCTION cleanup_expired_temp_bookings()
RETURNS void AS $$
BEGIN
  DELETE FROM temp_bookings WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled cleanup job (will need to be set up in Supabase dashboard)
-- This function can be called periodically to clean up expired bookings

-- Grant permissions for Edge Functions
GRANT ALL ON temp_bookings TO service_role;
GRANT ALL ON payments TO service_role;
GRANT ALL ON reservations TO service_role;
GRANT ALL ON booked_seats TO service_role; 