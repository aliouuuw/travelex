-- Simple fix for get_available_cities function
-- This ensures the function exists and works correctly

-- Drop the existing function
DROP FUNCTION IF EXISTS get_available_cities();

-- Recreate the function with correct return structure
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_cities() TO anon, authenticated; 