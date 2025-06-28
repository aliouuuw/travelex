-- =============================================
-- FIX PROFILES INFINITE RECURSION
-- =============================================
-- This migration fixes infinite recursion issues by cleaning up
-- conflicting RLS policies on the profiles table

-- First, drop ALL existing policies on profiles table to start clean
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
DROP POLICY IF EXISTS "Public can view driver profiles for trips" ON profiles;
DROP POLICY IF EXISTS "Drivers can view their profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view driver profiles" ON profiles;

-- Also drop any public policies that might be causing circular references (only if tables exist)
DO $$
BEGIN
    -- Drop trips policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trips') THEN
        DROP POLICY IF EXISTS "Public can view scheduled trips" ON trips;
    END IF;
    
    -- Drop route_templates policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'route_templates') THEN
        DROP POLICY IF EXISTS "Public can view active route templates" ON route_templates;
        DROP POLICY IF EXISTS "Public can view route templates" ON route_templates;
    END IF;
    
    -- Drop reusable_cities_stations policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reusable_cities_stations') THEN
        DROP POLICY IF EXISTS "Public can view cities and stations" ON reusable_cities_stations;
    END IF;
    
    -- Drop vehicles policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles') THEN
        DROP POLICY IF EXISTS "Public can view trip vehicles" ON vehicles;
        DROP POLICY IF EXISTS "Public can view vehicles" ON vehicles;
    END IF;
    
    -- Drop luggage_policies policies if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'luggage_policies') THEN
        DROP POLICY IF EXISTS "Public can view trip luggage policies" ON luggage_policies;
        DROP POLICY IF EXISTS "Public can view luggage policies" ON luggage_policies;
    END IF;
END $$;

-- Now recreate the profiles policies (clean, simple, no circular references)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Recreate the public trip search policies (simple, no circular references) only if tables exist
DO $$
BEGIN
    -- Create trips policy if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trips') THEN
        CREATE POLICY "Public can view scheduled trips" ON trips
            FOR SELECT USING (status = 'scheduled');
    END IF;
    
    -- Create route_templates policy if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'route_templates') THEN
        CREATE POLICY "Public can view route templates" ON route_templates
            FOR SELECT USING (true);
    END IF;
    
    -- Create reusable_cities_stations policy if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reusable_cities_stations') THEN
        CREATE POLICY "Public can view cities and stations" ON reusable_cities_stations
            FOR SELECT USING (true);
    END IF;
    
    -- Create vehicles policy if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles') THEN
        CREATE POLICY "Public can view vehicles" ON vehicles
            FOR SELECT USING (true);
    END IF;
    
    -- Create luggage_policies policy if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'luggage_policies') THEN
        CREATE POLICY "Public can view luggage policies" ON luggage_policies
            FOR SELECT USING (true);
    END IF;
END $$; 