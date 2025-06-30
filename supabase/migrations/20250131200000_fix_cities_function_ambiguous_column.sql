-- Fix ambiguous column reference in get_available_cities_by_country function
-- This resolves the "column reference 'country_code' is ambiguous" error

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
      ac.country_code,
      c.name as country_name,
      c.flag_emoji,
      ac.city_name,
      COALESCE(ts.trip_count, 0) as trip_count
  FROM (
    -- Get all cities from route templates and reusable cities
    SELECT DISTINCT rtc.country_code, rtc.city_name
    FROM route_template_cities rtc
    WHERE rtc.country_code IS NOT NULL
    UNION
    SELECT DISTINCT rc.country_code, rc.city_name
    FROM reusable_cities rc
    WHERE rc.country_code IS NOT NULL
  ) ac
  JOIN countries c ON c.code = ac.country_code
  LEFT JOIN (
    -- Get trip counts for cities that have active trips
    SELECT
        rtc.country_code,
        rtc.city_name,
        count(distinct t.id) as trip_count
    FROM route_template_cities rtc
    JOIN route_templates rt ON rt.id = rtc.route_template_id
    JOIN trips t ON t.route_template_id = rt.id
    WHERE rt.status = 'active'
        AND t.status = 'scheduled'
        AND t.departure_time >= current_date
        AND rtc.country_code IS NOT NULL
    GROUP BY rtc.country_code, rtc.city_name
  ) ts ON ts.country_code = ac.country_code 
        AND ts.city_name = ac.city_name
  ORDER BY c.name, ac.city_name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_cities_by_country() TO anon, authenticated; 