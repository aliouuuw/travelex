-- Fix get_available_cities_by_country function to include all cities
-- This solves the issue where previously created cities don't show up in route creation

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
      all_cities.country_code,
      c.name as country_name,
      c.flag_emoji,
      all_cities.city_name,
      COALESCE(trip_stats.trip_count, 0) as trip_count
  FROM (
    -- Get all cities from route templates and reusable cities
    SELECT DISTINCT country_code, city_name
    FROM (
        SELECT country_code, city_name FROM route_template_cities WHERE country_code IS NOT NULL
        UNION
        SELECT country_code, city_name FROM reusable_cities WHERE country_code IS NOT NULL
    ) combined_cities
  ) all_cities
  JOIN countries c ON c.code = all_cities.country_code
  LEFT JOIN (
    -- Get trip counts for cities that have active trips
    SELECT
        rtc.country_code,
        rtc.city_name,
        count(distinct t.id) as trip_count
    FROM route_template_cities rtc
    JOIN route_templates rt ON rtc.route_template_id = rt.id
    JOIN trips t ON rt.id = t.route_template_id
    WHERE rt.status = 'active'
        AND t.status = 'scheduled'
        AND t.departure_time >= current_date
        AND rtc.country_code IS NOT NULL
    GROUP BY rtc.country_code, rtc.city_name
  ) trip_stats ON all_cities.country_code = trip_stats.country_code 
                AND all_cities.city_name = trip_stats.city_name
  ORDER BY c.name, all_cities.city_name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_cities_by_country() TO anon, authenticated; 