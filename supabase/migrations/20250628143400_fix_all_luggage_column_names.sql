-- Fix all functions that use incorrect luggage policy column names
-- The actual columns are: free_weight, fee_per_excess_kg, max_bags, max_weight

-- Drop and recreate get_trip_for_booking function with correct column names
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
                    'features', CASE 
                        WHEN v.features IS NOT NULL THEN to_jsonb(v.features)
                        ELSE '[]'::jsonb
                    END,
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
                    'id', rtc.id,
                    'cityName', rtc.city_name,
                    'sequenceOrder', rtc.sequence_order,
                    'stations', COALESCE(
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'id', rts.id,
                                    'name', rts.station_name,
                                    'address', rts.station_address
                                )
                            )
                            FROM route_template_stations rts 
                            WHERE rts.route_template_id = rt.id 
                            AND rts.city_name = rtc.city_name
                        ), '[]'::jsonb
                    )
                ) ORDER BY rtc.sequence_order
            )
            FROM route_template_cities rtc 
            WHERE rtc.route_template_id = rt.id
        ) as route_cities,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ts.id,
                    'cityName', ts.city_name,
                    'sequenceOrder', ts.sequence_order,
                    'stationInfo', jsonb_build_object(
                        'id', rts.id,
                        'name', rts.station_name,
                        'address', rts.station_address
                    ),
                    'isPickupPoint', ts.is_pickup_point,
                    'isDropoffPoint', ts.is_dropoff_point
                ) ORDER BY ts.sequence_order
            )
            FROM trip_stations ts
            JOIN route_template_stations rts ON rts.id = ts.route_template_station_id
            WHERE ts.trip_id = t.id
        ) as trip_stations,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'fromCity', rtp.from_city,
                    'toCity', rtp.to_city,
                    'price', rtp.price
                )
            )
            FROM route_template_pricing rtp
            WHERE rtp.route_template_id = rt.id
        ) as pricing,
        CASE 
            WHEN lp.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', lp.id,
                    'name', lp.name,
                    'freeWeightKg', lp.free_weight,
                    'excessFeePerKg', lp.fee_per_excess_kg,
                    'maxBags', lp.max_bags,
                    'maxBagWeightKg', lp.max_weight
                )
            ELSE NULL
        END as luggage_policy
    FROM trips t
    JOIN route_templates rt ON rt.id = t.route_template_id
    JOIN profiles p ON p.id = t.driver_id
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN luggage_policies lp ON lp.id = t.luggage_policy_id
    WHERE t.id = p_trip_id
        AND rt.status = 'active'
        AND t.status = 'scheduled';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_trip_for_booking(UUID) TO anon, authenticated; 