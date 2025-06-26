-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(year FROM CURRENT_DATE) + 1),
  license_plate VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'car', -- car, van, bus, suv
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'gasoline', -- gasoline, diesel, electric, hybrid
  color VARCHAR(50),
  capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 50),
  seat_map JSONB, -- For interactive seat selection UI
  features TEXT[], -- air_conditioning, wifi, usb_charging, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, maintenance, inactive
  insurance_expiry DATE,
  registration_expiry DATE,
  last_maintenance DATE,
  mileage INTEGER DEFAULT 0 CHECK (mileage >= 0),
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_default ON vehicles(driver_id, is_default) WHERE is_default = true;

-- Add unique constraint for license plates
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_license_plate_unique ON vehicles(license_plate);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drivers can only see and manage their own vehicles
CREATE POLICY "Drivers can view their own vehicles" ON vehicles
  FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert their own vehicles" ON vehicles
  FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own vehicles" ON vehicles
  FOR UPDATE USING (driver_id = auth.uid());

CREATE POLICY "Drivers can delete their own vehicles" ON vehicles
  FOR DELETE USING (driver_id = auth.uid());

-- Admins can see all vehicles
CREATE POLICY "Admins can view all vehicles" ON vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicles_updated_at();

-- Function to ensure only one default vehicle per driver
CREATE OR REPLACE FUNCTION ensure_single_default_vehicle()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this vehicle as default, unset others for this driver
  IF NEW.is_default = true THEN
    UPDATE vehicles 
    SET is_default = false 
    WHERE driver_id = NEW.driver_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  
  -- If this is the only vehicle for this driver, make it default
  IF (SELECT COUNT(*) FROM vehicles WHERE driver_id = NEW.driver_id) = 0 THEN
    NEW.is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single default vehicle
CREATE TRIGGER trigger_ensure_single_default_vehicle
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_vehicle();

-- API Functions

-- Get all vehicles for a driver
CREATE OR REPLACE FUNCTION get_driver_vehicles(driver_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  driver_id UUID,
  make VARCHAR,
  model VARCHAR,
  year INTEGER,
  license_plate VARCHAR,
  vehicle_type VARCHAR,
  fuel_type VARCHAR,
  color VARCHAR,
  capacity INTEGER,
  seat_map JSONB,
  features TEXT[],
  status VARCHAR,
  insurance_expiry DATE,
  registration_expiry DATE,
  last_maintenance DATE,
  mileage INTEGER,
  description TEXT,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- If no driver_uuid provided, use current user
  IF driver_uuid IS NULL THEN
    driver_uuid := auth.uid();
  END IF;
  
  -- Check if user can access these vehicles
  IF NOT (
    driver_uuid = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT v.id, v.driver_id, v.make, v.model, v.year, v.license_plate,
         v.vehicle_type, v.fuel_type, v.color, v.capacity, v.seat_map,
         v.features, v.status, v.insurance_expiry, v.registration_expiry,
         v.last_maintenance, v.mileage, v.description, v.is_default,
         v.created_at, v.updated_at
  FROM vehicles v
  WHERE v.driver_id = driver_uuid
  ORDER BY v.is_default DESC, v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new vehicle
CREATE OR REPLACE FUNCTION create_vehicle(
  p_make VARCHAR,
  p_model VARCHAR,
  p_year INTEGER,
  p_license_plate VARCHAR,
  p_vehicle_type VARCHAR DEFAULT 'car',
  p_fuel_type VARCHAR DEFAULT 'gasoline',
  p_color VARCHAR DEFAULT NULL,
  p_capacity INTEGER DEFAULT 4,
  p_seat_map JSONB DEFAULT NULL,
  p_features TEXT[] DEFAULT NULL,
  p_insurance_expiry DATE DEFAULT NULL,
  p_registration_expiry DATE DEFAULT NULL,
  p_last_maintenance DATE DEFAULT NULL,
  p_mileage INTEGER DEFAULT 0,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_vehicle_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user is a driver
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = current_user_id 
    AND role IN ('driver', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only drivers can create vehicles';
  END IF;
  
  -- Insert the new vehicle
  INSERT INTO vehicles (
    driver_id, make, model, year, license_plate, vehicle_type,
    fuel_type, color, capacity, seat_map, features,
    insurance_expiry, registration_expiry, last_maintenance,
    mileage, description, status
  ) VALUES (
    current_user_id, p_make, p_model, p_year, p_license_plate, p_vehicle_type,
    p_fuel_type, p_color, p_capacity, p_seat_map, p_features,
    p_insurance_expiry, p_registration_expiry, p_last_maintenance,
    p_mileage, p_description, 'active'
  ) RETURNING id INTO new_vehicle_id;
  
  RETURN new_vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update a vehicle
CREATE OR REPLACE FUNCTION update_vehicle(
  p_vehicle_id UUID,
  p_make VARCHAR DEFAULT NULL,
  p_model VARCHAR DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_license_plate VARCHAR DEFAULT NULL,
  p_vehicle_type VARCHAR DEFAULT NULL,
  p_fuel_type VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL,
  p_capacity INTEGER DEFAULT NULL,
  p_seat_map JSONB DEFAULT NULL,
  p_features TEXT[] DEFAULT NULL,
  p_status VARCHAR DEFAULT NULL,
  p_insurance_expiry DATE DEFAULT NULL,
  p_registration_expiry DATE DEFAULT NULL,
  p_last_maintenance DATE DEFAULT NULL,
  p_mileage INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user owns this vehicle or is admin
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE id = p_vehicle_id 
    AND (
      driver_id = current_user_id OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = current_user_id 
        AND profiles.role = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Vehicle not found or access denied';
  END IF;
  
  -- Update the vehicle with only provided values
  UPDATE vehicles SET
    make = COALESCE(p_make, make),
    model = COALESCE(p_model, model),
    year = COALESCE(p_year, year),
    license_plate = COALESCE(p_license_plate, license_plate),
    vehicle_type = COALESCE(p_vehicle_type, vehicle_type),
    fuel_type = COALESCE(p_fuel_type, fuel_type),
    color = COALESCE(p_color, color),
    capacity = COALESCE(p_capacity, capacity),
    seat_map = COALESCE(p_seat_map, seat_map),
    features = COALESCE(p_features, features),
    status = COALESCE(p_status, status),
    insurance_expiry = COALESCE(p_insurance_expiry, insurance_expiry),
    registration_expiry = COALESCE(p_registration_expiry, registration_expiry),
    last_maintenance = COALESCE(p_last_maintenance, last_maintenance),
    mileage = COALESCE(p_mileage, mileage),
    description = COALESCE(p_description, description),
    is_default = COALESCE(p_is_default, is_default)
  WHERE id = p_vehicle_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a vehicle
CREATE OR REPLACE FUNCTION delete_vehicle(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  vehicle_driver_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get vehicle driver_id and check ownership
  SELECT driver_id INTO vehicle_driver_id
  FROM vehicles 
  WHERE id = p_vehicle_id;
  
  IF vehicle_driver_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;
  
  -- Check if user owns this vehicle or is admin
  IF NOT (
    vehicle_driver_id = current_user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = current_user_id 
      AND profiles.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Check if vehicle is used in any trips
  IF EXISTS (
    SELECT 1 FROM trips 
    WHERE vehicle_id = p_vehicle_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete vehicle: it is used in existing trips';
  END IF;
  
  -- Delete the vehicle
  DELETE FROM vehicles WHERE id = p_vehicle_id;
  
  -- If deleted vehicle was default, make another vehicle default
  IF NOT EXISTS (
    SELECT 1 FROM vehicles 
    WHERE driver_id = vehicle_driver_id 
    AND is_default = true
  ) THEN
    UPDATE vehicles 
    SET is_default = true 
    WHERE driver_id = vehicle_driver_id 
    AND id = (
      SELECT id FROM vehicles 
      WHERE driver_id = vehicle_driver_id 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set default vehicle
CREATE OR REPLACE FUNCTION set_default_vehicle(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  vehicle_driver_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get vehicle driver_id and check ownership
  SELECT driver_id INTO vehicle_driver_id
  FROM vehicles 
  WHERE id = p_vehicle_id;
  
  IF vehicle_driver_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;
  
  -- Check if user owns this vehicle
  IF vehicle_driver_id != current_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Update default status (trigger will handle unsetting others)
  UPDATE vehicles 
  SET is_default = true 
  WHERE id = p_vehicle_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON vehicles TO authenticated;
GRANT EXECUTE ON FUNCTION get_driver_vehicles TO authenticated;
GRANT EXECUTE ON FUNCTION create_vehicle TO authenticated;
GRANT EXECUTE ON FUNCTION update_vehicle TO authenticated;
GRANT EXECUTE ON FUNCTION delete_vehicle TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_vehicle TO authenticated; 