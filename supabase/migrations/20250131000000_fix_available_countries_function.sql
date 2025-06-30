-- Fix get_available_countries function to include all countries
-- This solves the issue where newly approved countries don't show up in route creation 

-- Update the function to return all countries, with stats where available
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
      COALESCE(stats.city_count, 0) as city_count,
      COALESCE(stats.trip_count, 0) as trip_count
  FROM countries c
  LEFT JOIN (
    SELECT
        rtc.country_code,
        count(distinct rtc.city_name) as city_count,
        count(distinct t.id) as trip_count
    FROM route_template_cities rtc
    JOIN route_templates rt ON rtc.route_template_id = rt.id
    LEFT JOIN trips t ON rt.id = t.route_template_id 
        AND t.status = 'scheduled'
        AND t.departure_time >= current_date
    WHERE rt.status = 'active'
    GROUP BY rtc.country_code
  ) stats ON c.code = stats.country_code
  ORDER BY c.name;
END;
$$;

-- Also create a function specifically for route creation that includes countries without any restrictions
CREATE OR REPLACE FUNCTION get_all_countries_for_route_creation()
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
      COALESCE(city_stats.city_count, 0) as city_count,
      COALESCE(trip_stats.trip_count, 0) as trip_count
  FROM countries c
  -- Count cities from both route templates and reusable cities
  LEFT JOIN (
    SELECT
        country_code,
        count(distinct city_name) as city_count
    FROM (
        SELECT country_code, city_name FROM route_template_cities
        UNION
        SELECT country_code, city_name FROM reusable_cities
    ) all_cities
    GROUP BY country_code
  ) city_stats ON c.code = city_stats.country_code
  -- Count active trips
  LEFT JOIN (
    SELECT
        rtc.country_code,
        count(distinct t.id) as trip_count
    FROM route_template_cities rtc
    JOIN route_templates rt ON rtc.route_template_id = rt.id
    JOIN trips t ON rt.id = t.route_template_id
    WHERE rt.status = 'active'
        AND t.status = 'scheduled'
        AND t.departure_time >= current_date
    GROUP BY rtc.country_code
  ) trip_stats ON c.code = trip_stats.country_code
  ORDER BY c.name;
END;
$$;

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
GRANT EXECUTE ON FUNCTION get_available_countries() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_countries_for_route_creation() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_cities_by_country() TO anon, authenticated; 