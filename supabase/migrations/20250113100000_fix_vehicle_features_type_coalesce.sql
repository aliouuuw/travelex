-- Fix COALESCE type mismatch in search function - convert TEXT[] to JSONB
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
        COALESCE(p.rating, 0)::numeric,
        CASE 
            WHEN v.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', v.id,
                    'make', v.make,
                    'model', v.model,
                    'year', v.year,
                    'type', v.vehicle_type,
                    'capacity', v.capacity,
                    'features', COALESCE(to_jsonb(v.features), '[]'::jsonb)
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
    LEFT JOIN vehicles v ON v.driver_id = t.driver_id AND v.is_default = true
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