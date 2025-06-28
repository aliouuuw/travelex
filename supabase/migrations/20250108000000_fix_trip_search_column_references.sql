-- =============================================
-- FIX TRIP SEARCH COLUMN REFERENCES
-- =============================================
-- This migration fixes the column reference issues in the existing
-- search_trips_by_segment and get_trip_for_booking functions

-- Drop and recreate the search_trips_by_segment function with correct column references
DROP FUNCTION IF EXISTS search_trips_by_segment(TEXT, TEXT, DATE, INTEGER, DECIMAL);

CREATE OR REPLACE FUNCTION search_trips_by_segment(
    p_from_city TEXT,
    p_to_city TEXT,
    p_departure_date DATE DEFAULT NULL,
    p_min_seats INTEGER DEFAULT 1,
    p_max_price DECIMAL DEFAULT NULL
)
RETURNS TABLE (
    trip_id UUID,
    route_template_id UUID,
    route_template_name TEXT,
    driver_id UUID,
    driver_name TEXT,
    driver_rating DECIMAL,
    vehicle_id UUID,
    vehicle_info JSONB,
    departure_time TIMESTAMP WITH TIME ZONE,
    arrival_time TIMESTAMP WITH TIME ZONE,
    available_seats INTEGER,
    total_seats INTEGER,
    route_cities JSONB,
    trip_stations JSONB,
    segment_price DECIMAL,
    full_route_price DECIMAL,
    pickup_stations JSONB,
    dropoff_stations JSONB,
    luggage_policy JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as trip_id,
        rt.id as route_template_id,
        rt.name as route_template_name,
        p.id as driver_id,
        p.full_name as driver_name,
        COALESCE(p.rating, 0) as driver_rating,
        v.id as vehicle_id,
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
        END as vehicle_info,
        t.departure_time,
        t.arrival_time,
        t.available_seats,
        COALESCE(v.capacity, 0) as total_seats,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', rcs.id,
                    'cityName', rcs.city_name,
                    'sequenceOrder', rcs.sequence_order
                ) ORDER BY rcs.sequence_order
            )
            FROM reusable_cities_stations rcs 
            WHERE rcs.route_template_id = rt.id
        ) as route_cities,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ts.id,
                    'cityName', ts.city_name,
                    'sequenceOrder', ts.sequence_order,
                    'stationInfo', jsonb_build_object(
                        'id', ts.station_id,
                        'name', ts.station_name,
                        'address', ts.station_address
                    ),
                    'isPickupPoint', ts.is_pickup_point,
                    'isDropoffPoint', ts.is_dropoff_point
                ) ORDER BY ts.sequence_order
            )
            FROM trip_stations ts 
            WHERE ts.trip_id = t.id
        ) as trip_stations,
        -- Calculate segment price (simplified for now)
        COALESCE(rt.base_price, 0) as segment_price,
        COALESCE(rt.base_price, 0) as full_route_price,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ts.id,
                    'stationInfo', jsonb_build_object(
                        'id', ts.station_id,
                        'name', ts.station_name,
                        'address', ts.station_address
                    )
                )
            )
            FROM trip_stations ts 
            WHERE ts.trip_id = t.id AND ts.is_pickup_point = true
        ) as pickup_stations,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ts.id,
                    'stationInfo', jsonb_build_object(
                        'id', ts.station_id,
                        'name', ts.station_name,
                        'address', ts.station_address
                    )
                )
            )
            FROM trip_stations ts 
            WHERE ts.trip_id = t.id AND ts.is_dropoff_point = true
        ) as dropoff_stations,
        CASE 
            WHEN lp.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', lp.id,
                    'name', lp.name,
                    'freeWeightKg', lp.free_weight_kg,
                    'excessFeePerKg', lp.excess_fee_per_kg,
                    'maxBags', lp.max_bags,
                    'maxBagWeightKg', lp.max_bag_weight_kg
                )
            ELSE NULL
        END as luggage_policy
    FROM trips t
    INNER JOIN route_templates rt ON t.route_template_id = rt.id
    INNER JOIN profiles p ON t.driver_id = p.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN luggage_policies lp ON t.luggage_policy_id = lp.id
    WHERE 
        t.status = 'scheduled'
        AND t.available_seats >= p_min_seats
        -- If no date is provided, only search for future trips.
        -- If a date is provided, search for trips on that specific date.
        AND (
            (p_departure_date IS NULL AND t.departure_time >= NOW()) OR 
            (p_departure_date IS NOT NULL AND DATE(t.departure_time) = p_departure_date)
        )
        AND (p_max_price IS NULL OR rt.base_price <= p_max_price)
        -- Check that both cities exist in the route sequence
        AND EXISTS (
            SELECT 1 FROM reusable_cities_stations rcs1 
            WHERE rcs1.route_template_id = rt.id 
            AND rcs1.city_name = p_from_city
        )
        AND EXISTS (
            SELECT 1 FROM reusable_cities_stations rcs2 
            WHERE rcs2.route_template_id = rt.id 
            AND rcs2.city_name = p_to_city
        )
        -- Ensure from_city comes before to_city in sequence
        AND (
            SELECT rcs1.sequence_order FROM reusable_cities_stations rcs1 
            WHERE rcs1.route_template_id = rt.id AND rcs1.city_name = p_from_city
        ) < (
            SELECT rcs2.sequence_order FROM reusable_cities_stations rcs2 
            WHERE rcs2.route_template_id = rt.id AND rcs2.city_name = p_to_city
        )
    ORDER BY t.departure_time;
END;
$$;

-- Drop and recreate the get_trip_for_booking function with correct column references
DROP FUNCTION IF EXISTS get_trip_for_booking(UUID);

CREATE OR REPLACE FUNCTION get_trip_for_booking(p_trip_id UUID)
RETURNS TABLE (
    trip_id UUID,
    route_template_id UUID,
    route_template_name TEXT,
    driver_id UUID,
    driver_name TEXT,
    driver_rating DECIMAL,
    vehicle_info JSONB,
    departure_time TIMESTAMP WITH TIME ZONE,
    arrival_time TIMESTAMP WITH TIME ZONE,
    available_seats INTEGER,
    total_seats INTEGER,
    route_cities JSONB,
    trip_stations JSONB,
    pricing JSONB,
    luggage_policy JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as trip_id,
        rt.id as route_template_id,
        rt.name as route_template_name,
        p.id as driver_id,
        p.full_name as driver_name,
        COALESCE(p.rating, 0) as driver_rating,
        CASE 
            WHEN v.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', v.id,
                    'make', v.make,
                    'model', v.model,
                    'year', v.year,
                    'type', v.vehicle_type,
                    'capacity', v.capacity,
                    'features', COALESCE(v.features, '[]'::jsonb),
                    'seatMap', COALESCE(v.seat_map, '{}'::jsonb)
                )
            ELSE NULL
        END as vehicle_info,
        t.departure_time,
        t.arrival_time,
        t.available_seats,
        COALESCE(v.capacity, 0) as total_seats,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', rcs.id,
                    'cityName', rcs.city_name,
                    'sequenceOrder', rcs.sequence_order,
                    'stations', COALESCE(rcs.stations, '[]'::jsonb)
                ) ORDER BY rcs.sequence_order
            )
            FROM reusable_cities_stations rcs 
            WHERE rcs.route_template_id = rt.id
        ) as route_cities,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ts.id,
                    'cityName', ts.city_name,
                    'sequenceOrder', ts.sequence_order,
                    'stationInfo', jsonb_build_object(
                        'id', ts.station_id,
                        'name', ts.station_name,
                        'address', ts.station_address
                    ),
                    'isPickupPoint', ts.is_pickup_point,
                    'isDropoffPoint', ts.is_dropoff_point
                ) ORDER BY ts.sequence_order
            )
            FROM trip_stations ts 
            WHERE ts.trip_id = t.id
        ) as trip_stations,
        -- Simplified pricing structure
        jsonb_build_array(
            jsonb_build_object(
                'fromCity', 'base',
                'toCity', 'price',
                'price', rt.base_price
            )
        ) as pricing,
        CASE 
            WHEN lp.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', lp.id,
                    'name', lp.name,
                    'freeWeightKg', lp.free_weight_kg,
                    'excessFeePerKg', lp.excess_fee_per_kg,
                    'maxBags', lp.max_bags,
                    'maxBagWeightKg', lp.max_bag_weight_kg
                )
            ELSE NULL
        END as luggage_policy
    FROM trips t
    INNER JOIN route_templates rt ON t.route_template_id = rt.id
    INNER JOIN profiles p ON t.driver_id = p.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN luggage_policies lp ON t.luggage_policy_id = lp.id
    WHERE t.id = p_trip_id
        AND t.status = 'scheduled';
END;
$$;

-- Ensure permissions are granted for the recreated functions
GRANT EXECUTE ON FUNCTION search_trips_by_segment TO anon;
GRANT EXECUTE ON FUNCTION get_trip_for_booking TO anon;
GRANT EXECUTE ON FUNCTION search_trips_by_segment TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_for_booking TO authenticated; 