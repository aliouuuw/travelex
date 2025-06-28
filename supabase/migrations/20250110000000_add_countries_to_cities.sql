-- Add Countries Support for Senegalese and Canadian Cities
-- This migration adds country dimension to support better UX for city search

-- =============================================
-- COUNTRIES REFERENCE TABLE
-- =============================================

-- Master countries table
CREATE TABLE countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 code
  flag_emoji text, -- Optional flag emoji for UI
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert the two countries we currently support
INSERT INTO countries (name, code, flag_emoji) VALUES
  ('Senegal', 'SN', '🇸🇳'),
  ('Canada', 'CA', '🇨🇦');

-- =============================================
-- ADD COUNTRY FIELDS TO EXISTING TABLES
-- =============================================

-- Add country to route_template_cities
ALTER TABLE route_template_cities 
ADD COLUMN country_id uuid REFERENCES countries(id),
ADD COLUMN country_code text; -- Denormalized for performance

-- Add country to reusable_cities
ALTER TABLE reusable_cities 
ADD COLUMN country_id uuid REFERENCES countries(id),
ADD COLUMN country_code text; -- Denormalized for performance

-- Add country to trip_stations (for consistency)
ALTER TABLE trip_stations 
ADD COLUMN country_id uuid REFERENCES countries(id),
ADD COLUMN country_code text; -- Denormalized for performance

-- =============================================
-- CITY-COUNTRY MAPPING FUNCTION
-- =============================================

-- Function to auto-detect country from city name (Senegal/Canada only)
CREATE OR REPLACE FUNCTION detect_country_for_city(city_name text)
RETURNS text AS $$
DECLARE
  detected_country text;
BEGIN
  -- Senegalese cities
  IF city_name ILIKE ANY(ARRAY['dakar', 'thiès', 'thies']) THEN
    RETURN 'SN';
  END IF;
  
  -- Canadian cities  
  IF city_name ILIKE ANY(ARRAY['ottawa', 'kingston', 'toronto']) THEN
    RETURN 'CA';
  END IF;
  
  -- Default to NULL if no match found (for manual assignment)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATA MIGRATION FOR EXISTING CITIES
-- =============================================

-- Auto-populate countries for existing route template cities
UPDATE route_template_cities 
SET 
  country_code = detect_country_for_city(city_name),
  country_id = (
    SELECT id FROM countries 
    WHERE code = detect_country_for_city(city_name)
  )
WHERE country_code IS NULL AND detect_country_for_city(city_name) IS NOT NULL;

-- Auto-populate countries for existing reusable cities
UPDATE reusable_cities 
SET 
  country_code = detect_country_for_city(city_name),
  country_id = (
    SELECT id FROM countries 
    WHERE code = detect_country_for_city(city_name)
  )
WHERE country_code IS NULL AND detect_country_for_city(city_name) IS NOT NULL;

-- Auto-populate countries for existing trip stations
UPDATE trip_stations 
SET 
  country_code = detect_country_for_city(city_name),
  country_id = (
    SELECT id FROM countries 
    WHERE code = detect_country_for_city(city_name)
  )
WHERE country_code IS NULL AND detect_country_for_city(city_name) IS NOT NULL;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Basic indexes
CREATE INDEX idx_route_template_cities_country ON route_template_cities(country_id);
CREATE INDEX idx_route_template_cities_country_code ON route_template_cities(country_code);
CREATE INDEX idx_reusable_cities_country ON reusable_cities(country_id);
CREATE INDEX idx_reusable_cities_country_code ON reusable_cities(country_code);
CREATE INDEX idx_trip_stations_country ON trip_stations(country_id);

-- Composite indexes for efficient country + city queries
CREATE INDEX idx_route_template_cities_country_city ON route_template_cities(country_code, city_name);
CREATE INDEX idx_reusable_cities_country_city ON reusable_cities(country_code, city_name);

-- =============================================
-- UPDATED FUNCTIONS WITH COUNTRY SUPPORT
-- =============================================

-- Updated get_available_cities function to include countries
CREATE OR REPLACE FUNCTION get_available_cities_by_country()
RETURNS TABLE (
  country_code text,
  country_name text,
  flag_emoji text,
  city_name text,
  trip_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
      rtc.country_code,
      c.name as country_name,
      c.flag_emoji,
      rtc.city_name,
      count(distinct t.id) as trip_count
  FROM route_template_cities rtc
  JOIN countries c ON c.code = rtc.country_code
  JOIN route_templates rt ON rtc.route_template_id = rt.id
  JOIN trips t ON rt.id = t.route_template_id
  WHERE rt.status = 'active'
    AND t.status = 'scheduled'
    AND t.departure_time >= current_date
    AND rtc.country_code IS NOT NULL
  GROUP BY rtc.country_code, c.name, c.flag_emoji, rtc.city_name
  ORDER BY c.name, rtc.city_name;
END;
$$;

-- Function to get available countries with stats
CREATE OR REPLACE FUNCTION get_available_countries()
RETURNS TABLE (
  country_code text,
  country_name text,
  flag_emoji text,
  city_count bigint,
  trip_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
      c.code,
      c.name,
      c.flag_emoji,
      count(distinct rtc.city_name) as city_count,
      count(distinct t.id) as trip_count
  FROM countries c
  JOIN route_template_cities rtc ON c.code = rtc.country_code
  JOIN route_templates rt ON rtc.route_template_id = rt.id
  JOIN trips t ON rt.id = t.route_template_id
  WHERE rt.status = 'active'
    AND t.status = 'scheduled'
    AND t.departure_time >= current_date
  GROUP BY c.code, c.name, c.flag_emoji
  ORDER BY c.name;
END;
$$;

-- Keep the original function for backward compatibility
CREATE OR REPLACE FUNCTION get_available_cities()
RETURNS TABLE (
  city_name text,
  trip_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
      rtc.city_name,
      count(distinct t.id) as trip_count
  FROM route_template_cities rtc
  JOIN route_templates rt ON rtc.route_template_id = rt.id
  JOIN trips t ON rt.id = t.route_template_id
  WHERE rt.status = 'active'
    AND t.status = 'scheduled'
    AND t.departure_time >= current_date
  GROUP BY rtc.city_name
  ORDER BY rtc.city_name;
END;
$$;

-- Enhanced search function with optional country filtering
CREATE OR REPLACE FUNCTION search_trips_by_segment_with_country(
    p_from_country text DEFAULT NULL,
    p_to_country text DEFAULT NULL,
    p_from_city text DEFAULT NULL,
    p_to_city text DEFAULT NULL,
    p_departure_date date DEFAULT NULL,
    p_min_seats integer DEFAULT 1,
    p_max_price decimal DEFAULT NULL
)
RETURNS TABLE (
    trip_id uuid,
    route_template_id uuid,
    route_template_name text,
    driver_id uuid,
    driver_name text,
    driver_rating numeric,
    vehicle_info jsonb,
    departure_time timestamptz,
    arrival_time timestamptz,
    available_seats integer,
    total_seats integer,
    route_cities jsonb,
    trip_stations jsonb,
    pickup_stations jsonb,
    dropoff_stations jsonb,
    estimated_price decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        rt.id,
        rt.name,
        p.id,
        p.full_name,
        COALESCE(p.rating, 0),
        CASE 
            WHEN v.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', v.id,
                    'make', v.make,
                    'model', v.model,
                    'year', v.year,
                    'type', v.vehicle_type,
                    'capacity', v.capacity,
                    'features', COALESCE(v.features, '[]'::jsonb)
                )
            ELSE NULL
        END,
        t.departure_time,
        t.arrival_time,
        t.available_seats,
        COALESCE(v.capacity, 0),
        -- Route cities with country info
        (SELECT jsonb_agg(jsonb_build_object(
            'id', rtc.id, 
            'cityName', rtc.city_name, 
            'countryCode', rtc.country_code,
            'sequenceOrder', rtc.sequence_order
        ) ORDER BY rtc.sequence_order) FROM route_template_cities rtc WHERE rtc.route_template_id = rt.id)::jsonb,
        -- Trip stations with country info
        (SELECT jsonb_agg(jsonb_build_object(
            'id', ts.id, 
            'cityName', ts.city_name, 
            'countryCode', ts.country_code,
            'sequenceOrder', ts.sequence_order, 
            'stationInfo', jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address), 
            'isPickupPoint', ts.is_pickup_point, 
            'isDropoffPoint', ts.is_dropoff_point
        ) ORDER BY ts.sequence_order) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id)::jsonb,
        -- Pickup stations
        (SELECT jsonb_agg(jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address)) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id AND ts.city_name = p_from_city AND ts.is_pickup_point = true)::jsonb,
        -- Dropoff stations
        (SELECT jsonb_agg(jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address)) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id AND ts.city_name = p_to_city AND ts.is_dropoff_point = true)::jsonb,
        rt.base_price
    FROM trips t
    JOIN route_templates rt ON rt.id = t.route_template_id
    JOIN profiles p ON p.id = t.driver_id
    LEFT JOIN vehicles v ON v.driver_id = t.driver_id AND v.is_primary = true
    WHERE t.status = 'scheduled'
        AND t.available_seats >= p_min_seats
        AND (p_departure_date IS NULL OR DATE(t.departure_time) = p_departure_date)
        AND (p_max_price IS NULL OR rt.base_price <= p_max_price)
        -- Country filtering (optional)
        AND (p_from_country IS NULL OR EXISTS (
            SELECT 1 FROM route_template_cities rtc1 
            WHERE rtc1.route_template_id = rt.id 
            AND rtc1.city_name = p_from_city 
            AND rtc1.country_code = p_from_country
        ))
        AND (p_to_country IS NULL OR EXISTS (
            SELECT 1 FROM route_template_cities rtc2 
            WHERE rtc2.route_template_id = rt.id 
            AND rtc2.city_name = p_to_city 
            AND rtc2.country_code = p_to_country
        ))
        -- City filtering (existing logic)
        AND (p_from_city IS NULL OR EXISTS (
            SELECT 1 FROM route_template_cities rtc1 
            WHERE rtc1.route_template_id = rt.id 
            AND rtc1.city_name = p_from_city
        ))
        AND (p_to_city IS NULL OR EXISTS (
            SELECT 1 FROM route_template_cities rtc2 
            WHERE rtc2.route_template_id = rt.id 
            AND rtc2.city_name = p_to_city
        ))
        -- Ensure from_city comes before to_city in sequence
        AND (p_from_city IS NULL OR p_to_city IS NULL OR (
            SELECT min(rtc1.sequence_order) FROM route_template_cities rtc1 
            WHERE rtc1.route_template_id = rt.id AND rtc1.city_name = p_from_city
        ) < (
            SELECT min(rtc2.sequence_order) FROM route_template_cities rtc2 
            WHERE rtc2.route_template_id = rt.id AND rtc2.city_name = p_to_city
        ))
    ORDER BY t.departure_time;
END;
$$;

-- =============================================
-- TRIGGERS FOR AUTO-COUNTRY DETECTION
-- =============================================

-- Trigger function to auto-detect country for new cities
CREATE OR REPLACE FUNCTION auto_detect_country_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-detect country if not provided
  IF NEW.country_code IS NULL THEN
    NEW.country_code := detect_country_for_city(NEW.city_name);
    IF NEW.country_code IS NOT NULL THEN
      NEW.country_id := (SELECT id FROM countries WHERE code = NEW.country_code);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER auto_detect_country_route_template_cities
  BEFORE INSERT OR UPDATE ON route_template_cities
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_country_trigger();

CREATE TRIGGER auto_detect_country_reusable_cities  
  BEFORE INSERT OR UPDATE ON reusable_cities
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_country_trigger();

CREATE TRIGGER auto_detect_country_trip_stations
  BEFORE INSERT OR UPDATE ON trip_stations
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_country_trigger();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant public access to new functions
GRANT EXECUTE ON FUNCTION get_available_cities_by_country() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_countries() TO anon, authenticated; 
GRANT EXECUTE ON FUNCTION search_trips_by_segment_with_country(text, text, text, text, date, integer, decimal) TO anon, authenticated;

-- Grant access to countries table
GRANT SELECT ON countries TO anon, authenticated;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify country assignment worked
-- SELECT 
--   rtc.city_name, 
--   rtc.country_code, 
--   c.name as country_name 
-- FROM route_template_cities rtc 
-- LEFT JOIN countries c ON c.code = rtc.country_code 
-- ORDER BY rtc.city_name; 