-- Fix COALESCE type mismatch in search_trips_by_segment function
-- This addresses the text[] vs jsonb type error

-- Drop all possible versions of the search function
DROP FUNCTION IF EXISTS search_trips_by_segment(text, text, date, integer);
DROP FUNCTION IF EXISTS search_trips_by_segment(text, text, date, integer, decimal);
DROP FUNCTION IF EXISTS search_trips_by_segment(text, text, date);

-- Recreate with proper type handling for features column
CREATE OR REPLACE FUNCTION search_trips_by_segment(
  p_from_city text,
  p_to_city text,
  p_departure_date date,
  p_min_seats integer,
  p_max_price decimal
)
RETURNS TABLE (
  trip_id uuid,
  route_template_id uuid,
  route_template_name text,
  driver_id uuid,
  driver_name text,
  driver_rating decimal,
  vehicle_id uuid,
  vehicle_info jsonb,
  departure_time timestamptz,
  arrival_time timestamptz,
  available_seats integer,
  total_seats integer,
  route_cities jsonb,
  trip_stations jsonb,
  segment_price decimal,
  full_route_price decimal,
  pickup_stations jsonb,
  dropoff_stations jsonb,
  luggage_policy jsonb
) as $$
begin
  return query
  select 
    t.id as trip_id,
    rt.id as route_template_id,
    rt.name as route_template_name,
    t.driver_id,
    p.full_name as driver_name,
    coalesce(p.rating, 0) as driver_rating,
    v.id as vehicle_id,
    case 
      when v.id is not null then 
        jsonb_build_object(
          'id', v.id,
          'make', v.make,
          'model', v.model,
          'year', v.year,
          'type', v.vehicle_type,
          'capacity', v.capacity,
          'features', case 
            when v.features is not null then to_jsonb(v.features)
            else '[]'::jsonb
          end
        )
      else null
    end as vehicle_info,
    t.departure_time,
    t.arrival_time,
    t.available_seats,
    coalesce(v.capacity, 0) as total_seats,
    
    -- Route cities
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', rtc.id,
          'cityName', rtc.city_name,
          'sequenceOrder', rtc.sequence_order
        ) order by rtc.sequence_order
      )
      from route_template_cities rtc 
      where rtc.route_template_id = rt.id
    ) as route_cities,
    
    -- Trip stations
    (
      select jsonb_agg(
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
        ) order by ts.sequence_order
      )
      from trip_stations ts
      join route_template_stations rts on rts.id = ts.route_template_station_id
      where ts.trip_id = t.id
    ) as trip_stations,
    
    coalesce(rtp.price, rt.base_price, 0) as segment_price,
    coalesce(rt.base_price, 0) as full_route_price,
    
    -- Pickup stations for the from_city
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ts.id,
          'stationInfo', jsonb_build_object(
            'id', rts.id,
            'name', rts.station_name,
            'address', rts.station_address
          )
        )
      )
      from trip_stations ts
      join route_template_stations rts on rts.id = ts.route_template_station_id
      where ts.trip_id = t.id 
        and ts.city_name = p_from_city
        and ts.is_pickup_point = true
    ) as pickup_stations,
    
    -- Dropoff stations for the to_city
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ts.id,
          'stationInfo', jsonb_build_object(
            'id', rts.id,
            'name', rts.station_name,
            'address', rts.station_address
          )
        )
      )
      from trip_stations ts
      join route_template_stations rts on rts.id = ts.route_template_station_id
      where ts.trip_id = t.id 
        and ts.city_name = p_to_city
        and ts.is_dropoff_point = true
    ) as dropoff_stations,
    
    -- Luggage policy (with correct column names)
    case 
      when lp.id is not null then 
        jsonb_build_object(
          'id', lp.id,
          'name', lp.name,
          'freeWeightKg', lp.free_weight,
          'excessFeePerKg', lp.fee_per_excess_kg,
          'maxBags', lp.max_bags,
          'maxBagWeightKg', lp.max_weight
        )
      else null
    end as luggage_policy
    
  from trips t
  join route_templates rt on rt.id = t.route_template_id
  join profiles p on p.id = t.driver_id
  left join vehicles v on v.id = t.vehicle_id
  left join luggage_policies lp on lp.id = t.luggage_policy_id
  left join route_template_pricing rtp on rtp.route_template_id = rt.id 
    and rtp.from_city = p_from_city 
    and rtp.to_city = p_to_city
  where rt.status = 'active'
    and t.status = 'scheduled'
    and (p_departure_date is null or date(t.departure_time) = p_departure_date)
    and t.available_seats >= coalesce(p_min_seats, 1)
    and (p_max_price is null or coalesce(rtp.price, rt.base_price, 0) <= p_max_price)
    -- Check that both cities exist in the route
    and exists (
      select 1 from route_template_cities rtc1 
      where rtc1.route_template_id = rt.id and rtc1.city_name = p_from_city
    )
    and exists (
      select 1 from route_template_cities rtc2 
      where rtc2.route_template_id = rt.id and rtc2.city_name = p_to_city
    )
    -- Ensure from_city comes before to_city in the route sequence
    and (
      select min(rtc1.sequence_order) 
      from route_template_cities rtc1 
      where rtc1.route_template_id = rt.id and rtc1.city_name = p_from_city
    ) < (
      select min(rtc2.sequence_order) 
      from route_template_cities rtc2 
      where rtc2.route_template_id = rt.id and rtc2.city_name = p_to_city
    )
  order by t.departure_time;
end;
$$ language plpgsql security definer;

-- Grant permissions
grant execute on function search_trips_by_segment(text, text, date, integer, decimal) to anon, authenticated; 