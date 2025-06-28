-- Update Route Template Functions to Include Country Information
-- This migration updates the route template management functions to return country data

-- =============================================
-- UPDATED GET DRIVER'S ROUTE TEMPLATES WITH COUNTRIES
-- =============================================

CREATE OR REPLACE FUNCTION get_driver_route_templates(driver_uuid uuid)
RETURNS TABLE (
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.name,
    rt.estimated_duration,
    rt.base_price,
    rt.status,
    rt.created_at,
    rt.updated_at,
    -- Aggregate cities with their stations and country info
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'cityName', rtc.city_name,
            'countryCode', rtc.country_code,
            'countryName', c.name,
            'flagEmoji', c.flag_emoji,
            'sequenceOrder', rtc.sequence_order,
            'stations', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', rts.id,
                    'name', rts.station_name,
                    'address', rts.station_address
                  )
                  ORDER BY rts.station_name
                )
                FROM route_template_stations rts
                WHERE rts.route_template_city_id = rtc.id
              ), '[]'::json
            )
          )
          ORDER BY rtc.sequence_order
        )
        FROM route_template_cities rtc
        LEFT JOIN countries c ON c.code = rtc.country_code
        WHERE rtc.route_template_id = rt.id
      ), '[]'::json
    ) as cities,
    -- Aggregate intercity fares
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'fromCity', rtp.from_city,
            'toCity', rtp.to_city,
            'fare', rtp.price
          )
        )
        FROM route_template_pricing rtp
        WHERE rtp.route_template_id = rt.id
      ), '[]'::json
    ) as intercity_fares,
    -- Count scheduled trips
    COALESCE(
      (
        SELECT count(*)
        FROM trips t
        WHERE t.route_template_id = rt.id 
        AND t.status = 'scheduled'
        AND t.departure_time > now()
      ), 0
    ) as scheduled_trips,
    -- Count completed trips
    COALESCE(
      (
        SELECT count(*)
        FROM trips t
        WHERE t.route_template_id = rt.id 
        AND t.status = 'completed'
      ), 0
    ) as completed_trips,
    -- Calculate total earnings
    COALESCE(
      (
        SELECT sum(r.total_price)
        FROM trips t
        JOIN reservations r ON r.trip_id = t.id
        WHERE t.route_template_id = rt.id 
        AND r.status = 'completed'
      ), 0
    ) as total_earnings
  FROM route_templates rt
  WHERE rt.driver_id = driver_uuid
  ORDER BY rt.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATED GET SINGLE ROUTE TEMPLATE BY ID WITH COUNTRIES
-- =============================================

CREATE OR REPLACE FUNCTION get_route_template_by_id(p_route_template_id uuid)
RETURNS TABLE (
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.driver_id,
    rt.name,
    rt.estimated_duration,
    rt.base_price,
    rt.status,
    rt.created_at,
    rt.updated_at,
    -- Aggregate cities with their stations and country info
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'cityName', rtc.city_name,
            'countryCode', rtc.country_code,
            'countryName', c.name,
            'flagEmoji', c.flag_emoji,
            'sequenceOrder', rtc.sequence_order,
            'stations', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', rts.id,
                    'name', rts.station_name,
                    'address', rts.station_address
                  )
                  ORDER BY rts.station_name
                )
                FROM route_template_stations rts
                WHERE rts.route_template_city_id = rtc.id
              ), '[]'::json
            )
          )
          ORDER BY rtc.sequence_order
        )
        FROM route_template_cities rtc
        LEFT JOIN countries c ON c.code = rtc.country_code
        WHERE rtc.route_template_id = rt.id
      ), '[]'::json
    ) as cities,
    -- Aggregate intercity fares
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'fromCity', rtp.from_city,
            'toCity', rtp.to_city,
            'fare', rtp.price
          )
        )
        FROM route_template_pricing rtp
        WHERE rtp.route_template_id = rt.id
      ), '[]'::json
    ) as intercity_fares
  FROM route_templates rt
  WHERE rt.id = p_route_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ENHANCED ROUTE TEMPLATE CREATION WITH COUNTRY VALIDATION
-- =============================================

-- Optional: Enhanced create function that can accept country codes
CREATE OR REPLACE FUNCTION create_route_template_with_countries(
  p_driver_id uuid,
  p_name text,
  p_estimated_duration text,
  p_base_price decimal(10,2),
  p_status text,
  p_cities json,
  p_intercity_fares json
)
RETURNS uuid AS $$
DECLARE
  v_route_template_id uuid;
  v_city json;
  v_city_id uuid;
  v_station json;
  v_fare json;
  v_country_code text;
  v_country_id uuid;
BEGIN
  -- Insert route template
  INSERT INTO route_templates (
    driver_id, name, estimated_duration, base_price, status
  ) VALUES (
    p_driver_id, p_name, p_estimated_duration, p_base_price, p_status
  ) RETURNING id INTO v_route_template_id;
  
  -- Insert cities and stations
  FOR v_city IN SELECT * FROM json_array_elements(p_cities)
  LOOP
    -- Get country info if provided, otherwise rely on auto-detection
    v_country_code := v_city->>'countryCode';
    v_country_id := NULL;
    
    IF v_country_code IS NOT NULL THEN
      SELECT id INTO v_country_id FROM countries WHERE code = v_country_code;
    END IF;
    
    INSERT INTO route_template_cities (
      route_template_id, city_name, sequence_order, country_code, country_id
    ) VALUES (
      v_route_template_id,
      v_city->>'cityName',
      (v_city->>'sequenceOrder')::integer,
      v_country_code,
      v_country_id
    ) RETURNING id INTO v_city_id;
    
    -- Insert stations for this city
    FOR v_station IN SELECT * FROM json_array_elements(v_city->'stations')
    LOOP
      INSERT INTO route_template_stations (
        route_template_city_id, station_name, station_address
      ) VALUES (
        v_city_id,
        v_station->>'name',
        v_station->>'address'
      );
    END LOOP;
  END LOOP;
  
  -- Insert intercity fares
  FOR v_fare IN SELECT * FROM json_array_elements(p_intercity_fares)
  LOOP
    INSERT INTO route_template_pricing (
      route_template_id, from_city, to_city, price
    ) VALUES (
      v_route_template_id,
      v_fare->>'fromCity',
      v_fare->>'toCity',
      (v_fare->>'fare')::decimal(10,2)
    );
  END LOOP;
  
  RETURN v_route_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COUNTRY VALIDATION FUNCTION FOR ROUTES
-- =============================================

-- Function to validate that a route's cities belong to reasonable countries
CREATE OR REPLACE FUNCTION validate_route_countries(p_route_template_id uuid)
RETURNS TABLE (
  city_name text,
  country_code text,
  country_name text,
  is_valid boolean,
  validation_message text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rtc.city_name,
    rtc.country_code,
    c.name as country_name,
    CASE 
      WHEN rtc.country_code IS NULL THEN false
      WHEN c.id IS NULL THEN false
      ELSE true
    END as is_valid,
    CASE 
      WHEN rtc.country_code IS NULL THEN 'City has no country assigned'
      WHEN c.id IS NULL THEN 'Invalid country code'
      ELSE 'Valid'
    END as validation_message
  FROM route_template_cities rtc
  LEFT JOIN countries c ON c.code = rtc.country_code
  WHERE rtc.route_template_id = p_route_template_id
  ORDER BY rtc.sequence_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- BULK COUNTRY ASSIGNMENT FOR ROUTES
-- =============================================

-- Function to auto-assign countries to routes that don't have them
CREATE OR REPLACE FUNCTION auto_assign_countries_to_routes()
RETURNS integer AS $$
DECLARE
  update_count integer := 0;
BEGIN
  -- Update route_template_cities that don't have countries
  UPDATE route_template_cities 
  SET 
    country_code = detect_country_for_city(city_name),
    country_id = (
      SELECT id FROM countries 
      WHERE code = detect_country_for_city(city_name)
    )
  WHERE country_code IS NULL 
    AND detect_country_for_city(city_name) IS NOT NULL;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  -- Also update reusable_cities that don't have countries
  UPDATE reusable_cities 
  SET 
    country_code = detect_country_for_city(city_name),
    country_id = (
      SELECT id FROM countries 
      WHERE code = detect_country_for_city(city_name)
    )
  WHERE country_code IS NULL 
    AND detect_country_for_city(city_name) IS NOT NULL;
  
  RETURN update_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to new functions
GRANT EXECUTE ON FUNCTION create_route_template_with_countries(uuid, text, text, decimal, text, json, json) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_route_countries(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_assign_countries_to_routes() TO authenticated;

-- =============================================
-- RUN AUTO-ASSIGNMENT FOR EXISTING DATA
-- =============================================

-- Auto-assign countries to any existing routes that don't have them
SELECT auto_assign_countries_to_routes(); 