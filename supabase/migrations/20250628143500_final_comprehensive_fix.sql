-- Comprehensive fix for all luggage policy column name errors.
-- This migration drops all relevant functions and recreates them with correct schema.

-- Step 1: Drop all potentially conflicting functions to ensure a clean slate.
DROP FUNCTION IF EXISTS search_trips_by_segment(text, text, date, integer, decimal);
DROP FUNCTION IF EXISTS search_trips_by_segment(text, text, date, integer);
DROP FUNCTION IF EXISTS search_trips_by_segment(text, text, date);
DROP FUNCTION IF EXISTS get_trip_for_booking(UUID);

-- Step 2: Recreate search_trips_by_segment with correct column names.
CREATE OR REPLACE FUNCTION search_trips_by_segment(
  p_from_city text,
  p_to_city text,
  p_departure_date date,
  p_min_seats integer,
  p_max_price decimal
)
RETURNS TABLE (
  trip_id uuid, route_template_id uuid, route_template_name text, driver_id uuid,
  driver_name text, driver_rating double precision, vehicle_id uuid, vehicle_info jsonb,
  departure_time timestamptz, arrival_time timestamptz, available_seats integer,
  total_seats integer, route_cities jsonb, trip_stations jsonb, segment_price decimal,
  full_route_price decimal, pickup_stations jsonb, dropoff_stations jsonb, luggage_policy jsonb
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trip_id, rt.id as route_template_id, rt.name as route_template_name, t.driver_id,
    p.full_name as driver_name, coalesce(p.rating, 0.0) as driver_rating, v.id as vehicle_id,
    CASE WHEN v.id IS NOT NULL THEN jsonb_build_object(
      'id', v.id, 'make', v.make, 'model', v.model, 'year', v.year, 'type', v.vehicle_type,
      'capacity', v.capacity, 'features', CASE WHEN v.features IS NOT NULL THEN to_jsonb(v.features) ELSE '[]'::jsonb END
    ) ELSE NULL END as vehicle_info,
    t.departure_time, t.arrival_time, t.available_seats, coalesce(v.capacity, 0) as total_seats,
    (SELECT jsonb_agg(jsonb_build_object('id', rtc.id, 'cityName', rtc.city_name, 'sequenceOrder', rtc.sequence_order) ORDER BY rtc.sequence_order) FROM route_template_cities rtc WHERE rtc.route_template_id = rt.id) as route_cities,
    (SELECT jsonb_agg(jsonb_build_object('id', ts.id, 'cityName', ts.city_name, 'sequenceOrder', ts.sequence_order, 'stationInfo', jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address), 'isPickupPoint', ts.is_pickup_point, 'isDropoffPoint', ts.is_dropoff_point) ORDER BY ts.sequence_order) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id) as trip_stations,
    coalesce(rtp.price, rt.base_price, 0) as segment_price,
    coalesce(rt.base_price, 0) as full_route_price,
    (SELECT jsonb_agg(jsonb_build_object('id', ts.id, 'stationInfo', jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address))) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id AND ts.city_name = p_from_city AND ts.is_pickup_point = true) as pickup_stations,
    (SELECT jsonb_agg(jsonb_build_object('id', ts.id, 'stationInfo', jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address))) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id AND ts.city_name = p_to_city AND ts.is_dropoff_point = true) as dropoff_stations,
    CASE WHEN lp.id IS NOT NULL THEN jsonb_build_object(
      'id', lp.id, 'name', lp.name, 'freeWeightKg', lp.free_weight, 'excessFeePerKg', lp.fee_per_excess_kg,
      'maxBags', lp.max_bags, 'maxBagWeightKg', lp.max_weight
    ) ELSE NULL END as luggage_policy
  FROM trips t
  JOIN route_templates rt ON rt.id = t.route_template_id
  JOIN profiles p ON p.id = t.driver_id
  LEFT JOIN vehicles v ON v.id = t.vehicle_id
  LEFT JOIN luggage_policies lp ON lp.id = t.luggage_policy_id
  LEFT JOIN route_template_pricing rtp ON rtp.route_template_id = rt.id AND rtp.from_city = p_from_city AND rtp.to_city = p_to_city
  WHERE rt.status = 'active'
    AND t.status = 'scheduled'
    AND (p_departure_date IS NULL OR date(t.departure_time) = p_departure_date)
    AND t.available_seats >= coalesce(p_min_seats, 1)
    AND (p_max_price IS NULL OR coalesce(rtp.price, rt.base_price, 0) <= p_max_price)
    AND EXISTS (SELECT 1 FROM route_template_cities rtc1 WHERE rtc1.route_template_id = rt.id AND rtc1.city_name = p_from_city)
    AND EXISTS (SELECT 1 FROM route_template_cities rtc2 WHERE rtc2.route_template_id = rt.id AND rtc2.city_name = p_to_city)
    AND (SELECT min(rtc1.sequence_order) FROM route_template_cities rtc1 WHERE rtc1.route_template_id = rt.id AND rtc1.city_name = p_from_city) < (SELECT min(rtc2.sequence_order) FROM route_template_cities rtc2 WHERE rtc2.route_template_id = rt.id AND rtc2.city_name = p_to_city)
  ORDER BY t.departure_time;
END;
$$;

-- Step 3: Recreate get_trip_for_booking with correct column names.
CREATE OR REPLACE FUNCTION get_trip_for_booking(p_trip_id UUID)
RETURNS TABLE (
    trip_id UUID, route_template_id UUID, route_template_name TEXT, driver_id UUID, driver_name TEXT,
    driver_rating double precision, vehicle_info JSONB, departure_time TIMESTAMP WITH TIME ZONE,
    arrival_time TIMESTAMP WITH TIME ZONE, available_seats INTEGER, total_seats INTEGER,
    route_cities JSONB, trip_stations JSONB, pricing JSONB, luggage_policy JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as trip_id, rt.id as route_template_id, rt.name as route_template_name, p.id as driver_id,
        p.full_name as driver_name, COALESCE(p.rating, 0.0) as driver_rating,
        CASE WHEN v.id IS NOT NULL THEN jsonb_build_object(
            'id', v.id, 'make', v.make, 'model', v.model, 'year', v.year, 'type', v.vehicle_type,
            'capacity', v.capacity, 'features', CASE WHEN v.features IS NOT NULL THEN to_jsonb(v.features) ELSE '[]'::jsonb END,
            'seatMap', COALESCE(v.seat_map, '{}'::jsonb)
        ) ELSE NULL END as vehicle_info,
        t.departure_time, t.arrival_time, t.available_seats, COALESCE(v.capacity, 0) as total_seats,
        (SELECT jsonb_agg(jsonb_build_object('id', rtc.id, 'cityName', rtc.city_name, 'sequenceOrder', rtc.sequence_order, 'stations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address)) FROM route_template_stations rts WHERE rts.route_template_id = rt.id AND rts.city_name = rtc.city_name), '[]'::jsonb)) ORDER BY rtc.sequence_order) FROM route_template_cities rtc WHERE rtc.route_template_id = rt.id) as route_cities,
        (SELECT jsonb_agg(jsonb_build_object('id', ts.id, 'cityName', ts.city_name, 'sequenceOrder', ts.sequence_order, 'stationInfo', jsonb_build_object('id', rts.id, 'name', rts.station_name, 'address', rts.station_address), 'isPickupPoint', ts.is_pickup_point, 'isDropoffPoint', ts.is_dropoff_point) ORDER BY ts.sequence_order) FROM trip_stations ts JOIN route_template_stations rts ON rts.id = ts.route_template_station_id WHERE ts.trip_id = t.id) as trip_stations,
        (SELECT jsonb_agg(jsonb_build_object('fromCity', rtp.from_city, 'toCity', rtp.to_city, 'price', rtp.price)) FROM route_template_pricing rtp WHERE rtp.route_template_id = rt.id) as pricing,
        CASE WHEN lp.id IS NOT NULL THEN jsonb_build_object(
            'id', lp.id, 'name', lp.name, 'freeWeightKg', lp.free_weight, 'excessFeePerKg', lp.fee_per_excess_kg,
            'maxBags', lp.max_bags, 'maxBagWeightKg', lp.max_weight
        ) ELSE NULL END as luggage_policy
    FROM trips t
    JOIN route_templates rt ON rt.id = t.route_template_id
    JOIN profiles p ON p.id = t.driver_id
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN luggage_policies lp ON lp.id = t.luggage_policy_id
    WHERE t.id = p_trip_id AND rt.status = 'active' AND t.status = 'scheduled';
END;
$$;

-- Step 4: Grant permissions for the recreated functions.
GRANT EXECUTE ON FUNCTION search_trips_by_segment(text, text, date, integer, decimal) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trip_for_booking(UUID) TO anon, authenticated; 