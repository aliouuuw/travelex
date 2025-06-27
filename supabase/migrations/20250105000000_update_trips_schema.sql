-- =============================================
-- UPDATE TRIPS TABLE FOR TRIP SCHEDULING
-- =============================================

-- Add vehicle_id and luggage_policy_id to trips table
ALTER TABLE trips 
ADD COLUMN vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
ADD COLUMN luggage_policy_id UUID REFERENCES luggage_policies(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_luggage_policy_id ON trips(luggage_policy_id);

-- Update RLS policies to include vehicle and luggage policy checks
-- (Current policies already cover driver ownership, so no changes needed)

-- =============================================
-- TRIP MANAGEMENT FUNCTIONS
-- =============================================

-- Function to get driver's trips with related data
CREATE OR REPLACE FUNCTION get_driver_trips(driver_uuid UUID)
RETURNS TABLE (
  id UUID,
  route_template_id UUID,
  route_template_name TEXT,
  vehicle_id UUID,
  vehicle_name TEXT,
  luggage_policy_id UUID,
  luggage_policy_name TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  total_seats INTEGER,
  available_seats INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  route_cities JSON,
  trip_stations JSON,
  reservations_count BIGINT,
  total_earnings DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.route_template_id,
    rt.name as route_template_name,
    t.vehicle_id,
    CASE 
      WHEN v.id IS NOT NULL THEN CONCAT(v.make, ' ', v.model, ' (', v.year, ')')
      ELSE NULL
    END as vehicle_name,
    t.luggage_policy_id,
    lp.name as luggage_policy_name,
    t.departure_time,
    t.arrival_time,
    t.total_seats,
    t.available_seats,
    t.status,
    t.created_at,
    t.updated_at,
    -- Route cities
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'cityName', rtc.city_name,
            'sequenceOrder', rtc.sequence_order
          )
          ORDER BY rtc.sequence_order
        )
        FROM route_template_cities rtc
        WHERE rtc.route_template_id = t.route_template_id
      ), '[]'::JSON
    ) as route_cities,
    -- Trip stations
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ts.id,
            'stationId', rts.id,
            'stationName', rts.station_name,
            'stationAddress', rts.station_address,
            'cityName', ts.city_name,
            'sequenceOrder', ts.sequence_order,
            'isPickupPoint', ts.is_pickup_point,
            'isDropoffPoint', ts.is_dropoff_point
          )
          ORDER BY ts.sequence_order
        )
        FROM trip_stations ts
        JOIN route_template_stations rts ON rts.id = ts.route_template_station_id
        WHERE ts.trip_id = t.id
      ), '[]'::JSON
    ) as trip_stations,
    -- Reservations count
    COALESCE(
      (
        SELECT COUNT(*)
        FROM reservations r
        WHERE r.trip_id = t.id
        AND r.status != 'cancelled'
      ), 0
    ) as reservations_count,
    -- Total earnings
    COALESCE(
      (
        SELECT SUM(r.total_price)
        FROM reservations r
        WHERE r.trip_id = t.id
        AND r.status = 'completed'
      ), 0
    ) as total_earnings
  FROM trips t
  JOIN route_templates rt ON rt.id = t.route_template_id
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  LEFT JOIN luggage_policies lp ON lp.id = t.luggage_policy_id
  WHERE t.driver_id = driver_uuid
  ORDER BY t.departure_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a scheduled trip
CREATE OR REPLACE FUNCTION create_trip(
  p_route_template_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID,
  p_luggage_policy_id UUID,
  p_departure_time TIMESTAMPTZ,
  p_arrival_time TIMESTAMPTZ,
  p_selected_stations JSON
)
RETURNS UUID AS $$
DECLARE
  v_trip_id UUID;
  v_station JSON;
  v_vehicle_capacity INTEGER;
BEGIN
  -- Get vehicle capacity
  SELECT capacity INTO v_vehicle_capacity
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_vehicle_capacity IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found or capacity not set';
  END IF;
  
  -- Insert the trip
  INSERT INTO trips (
    route_template_id,
    driver_id,
    vehicle_id,
    luggage_policy_id,
    departure_time,
    arrival_time,
    total_seats,
    available_seats
  ) VALUES (
    p_route_template_id,
    p_driver_id,
    p_vehicle_id,
    p_luggage_policy_id,
    p_departure_time,
    p_arrival_time,
    v_vehicle_capacity,
    v_vehicle_capacity
  ) RETURNING id INTO v_trip_id;
  
  -- Insert selected stations for the trip
  FOR v_station IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_selected_stations)
  LOOP
    INSERT INTO trip_stations (
      trip_id,
      route_template_station_id,
      city_name,
      sequence_order,
      is_pickup_point,
      is_dropoff_point
    ) VALUES (
      v_trip_id,
      (v_station->>'stationId')::UUID,
      v_station->>'cityName',
      (v_station->>'sequenceOrder')::INTEGER,
      COALESCE((v_station->>'isPickupPoint')::BOOLEAN, true),
      COALESCE((v_station->>'isDropoffPoint')::BOOLEAN, true)
    );
  END LOOP;
  
  RETURN v_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a trip
CREATE OR REPLACE FUNCTION update_trip(
  p_trip_id UUID,
  p_vehicle_id UUID,
  p_luggage_policy_id UUID,
  p_departure_time TIMESTAMPTZ,
  p_arrival_time TIMESTAMPTZ,
  p_selected_stations JSON
)
RETURNS BOOLEAN AS $$
DECLARE
  v_station JSON;
  v_vehicle_capacity INTEGER;
  v_current_reservations INTEGER;
BEGIN
  -- Get vehicle capacity
  SELECT capacity INTO v_vehicle_capacity
  FROM vehicles
  WHERE id = p_vehicle_id;
  
  IF v_vehicle_capacity IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found or capacity not set';
  END IF;
  
  -- Check current reservations
  SELECT COUNT(*)::INTEGER INTO v_current_reservations
  FROM reservations
  WHERE trip_id = p_trip_id
  AND status != 'cancelled';
  
  -- Make sure new vehicle has enough capacity for existing reservations
  IF v_vehicle_capacity < v_current_reservations THEN
    RAISE EXCEPTION 'Vehicle capacity (%) is less than current reservations (%)', v_vehicle_capacity, v_current_reservations;
  END IF;
  
  -- Update the trip
  UPDATE trips SET
    vehicle_id = p_vehicle_id,
    luggage_policy_id = p_luggage_policy_id,
    departure_time = p_departure_time,
    arrival_time = p_arrival_time,
    total_seats = v_vehicle_capacity,
    available_seats = v_vehicle_capacity - v_current_reservations,
    updated_at = NOW()
  WHERE id = p_trip_id;
  
  -- Delete existing trip stations
  DELETE FROM trip_stations WHERE trip_id = p_trip_id;
  
  -- Insert updated selected stations
  FOR v_station IN SELECT * FROM JSON_ARRAY_ELEMENTS(p_selected_stations)
  LOOP
    INSERT INTO trip_stations (
      trip_id,
      route_template_station_id,
      city_name,
      sequence_order,
      is_pickup_point,
      is_dropoff_point
    ) VALUES (
      p_trip_id,
      (v_station->>'stationId')::UUID,
      v_station->>'cityName',
      (v_station->>'sequenceOrder')::INTEGER,
      COALESCE((v_station->>'isPickupPoint')::BOOLEAN, true),
      COALESCE((v_station->>'isDropoffPoint')::BOOLEAN, true)
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a trip
CREATE OR REPLACE FUNCTION delete_trip(p_trip_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any confirmed reservations
  IF EXISTS (
    SELECT 1 FROM reservations 
    WHERE trip_id = p_trip_id 
    AND status IN ('confirmed', 'pending')
  ) THEN
    RAISE EXCEPTION 'Cannot delete trip with confirmed or pending reservations';
  END IF;
  
  -- Delete the trip (cascade will handle related records)
  DELETE FROM trips WHERE id = p_trip_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get single trip by ID
CREATE OR REPLACE FUNCTION get_trip_by_id(p_trip_id UUID)
RETURNS TABLE (
  id UUID,
  route_template_id UUID,
  route_template_name TEXT,
  vehicle_id UUID,
  vehicle_name TEXT,
  luggage_policy_id UUID,
  luggage_policy_name TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  total_seats INTEGER,
  available_seats INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  route_cities JSON,
  trip_stations JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.route_template_id,
    rt.name as route_template_name,
    t.vehicle_id,
    CASE 
      WHEN v.id IS NOT NULL THEN CONCAT(v.make, ' ', v.model, ' (', v.year, ')')
      ELSE NULL
    END as vehicle_name,
    t.luggage_policy_id,
    lp.name as luggage_policy_name,
    t.departure_time,
    t.arrival_time,
    t.total_seats,
    t.available_seats,
    t.status,
    t.created_at,
    t.updated_at,
    -- Route cities
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', rtc.id,
            'cityName', rtc.city_name,
            'sequenceOrder', rtc.sequence_order,
            'stations', COALESCE(
              (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', rts.id,
                    'name', rts.station_name,
                    'address', rts.station_address
                  )
                  ORDER BY rts.station_name
                )
                FROM route_template_stations rts
                WHERE rts.route_template_city_id = rtc.id
              ), '[]'::JSON
            )
          )
          ORDER BY rtc.sequence_order
        )
        FROM route_template_cities rtc
        WHERE rtc.route_template_id = t.route_template_id
      ), '[]'::JSON
    ) as route_cities,
    -- Trip stations
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ts.id,
            'stationId', rts.id,
            'stationName', rts.station_name,
            'stationAddress', rts.station_address,
            'cityName', ts.city_name,
            'sequenceOrder', ts.sequence_order,
            'isPickupPoint', ts.is_pickup_point,
            'isDropoffPoint', ts.is_dropoff_point
          )
          ORDER BY ts.sequence_order
        )
        FROM trip_stations ts
        JOIN route_template_stations rts ON rts.id = ts.route_template_station_id
        WHERE ts.trip_id = t.id
      ), '[]'::JSON
    ) as trip_stations
  FROM trips t
  JOIN route_templates rt ON rt.id = t.route_template_id
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  LEFT JOIN luggage_policies lp ON lp.id = t.luggage_policy_id
  WHERE t.id = p_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 