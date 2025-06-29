-- Create Country Requests System
-- This migration creates the infrastructure for drivers to request new countries

-- =============================================
-- COUNTRY REQUESTS TABLE
-- =============================================

CREATE TABLE country_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name text NOT NULL,
  country_code text NOT NULL CHECK (length(country_code) = 2),
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_code, status) -- Prevent multiple pending requests for same country
);

-- Create index for efficient queries
CREATE INDEX idx_country_requests_status ON country_requests(status);
CREATE INDEX idx_country_requests_requested_by ON country_requests(requested_by);
CREATE INDEX idx_country_requests_created_at ON country_requests(created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE country_requests ENABLE ROW LEVEL SECURITY;

-- Drivers can insert their own requests
CREATE POLICY "Drivers can create country requests"
  ON country_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requested_by AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('driver', 'admin')
    )
  );

-- Drivers can view their own requests
CREATE POLICY "Drivers can view their own requests"
  ON country_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requested_by OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can update requests (approve/reject)
CREATE POLICY "Admins can update country requests"
  ON country_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =============================================
-- FUNCTIONS FOR COUNTRY REQUEST MANAGEMENT
-- =============================================

-- Function to submit a country request
CREATE OR REPLACE FUNCTION submit_country_request(
  p_country_name text,
  p_country_code text,
  p_reason text
)
RETURNS uuid AS $$
DECLARE
  v_request_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is authenticated and is a driver
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_user_id 
    AND role IN ('driver', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only drivers can submit country requests';
  END IF;
  
  -- Check if country already exists
  IF EXISTS (SELECT 1 FROM countries WHERE code = UPPER(p_country_code)) THEN
    RAISE EXCEPTION 'Country % already exists', p_country_code;
  END IF;
  
  -- Check if there's already a pending request for this country
  IF EXISTS (
    SELECT 1 FROM country_requests 
    WHERE country_code = UPPER(p_country_code) 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A request for country % is already pending review', p_country_code;
  END IF;
  
  -- Insert the request
  INSERT INTO country_requests (
    country_name,
    country_code,
    requested_by,
    reason
  ) VALUES (
    p_country_name,
    UPPER(p_country_code),
    v_user_id,
    p_reason
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get country requests (for admin dashboard)
CREATE OR REPLACE FUNCTION get_country_requests(p_status text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  country_name text,
  country_code text,
  requested_by uuid,
  requester_name text,
  requester_email text,
  reason text,
  status text,
  admin_notes text,
  reviewed_by uuid,
  reviewer_name text,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.country_name,
    cr.country_code,
    cr.requested_by,
    rp.full_name as requester_name,
    rp.email as requester_email,
    cr.reason,
    cr.status,
    cr.admin_notes,
    cr.reviewed_by,
    ap.full_name as reviewer_name,
    cr.reviewed_at,
    cr.created_at,
    cr.updated_at
  FROM country_requests cr
  JOIN profiles rp ON rp.id = cr.requested_by
  LEFT JOIN profiles ap ON ap.id = cr.reviewed_by
  WHERE (p_status IS NULL OR cr.status = p_status)
  ORDER BY 
    CASE cr.status 
      WHEN 'pending' THEN 1 
      WHEN 'approved' THEN 2 
      WHEN 'rejected' THEN 3 
    END,
    cr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve a country request
CREATE OR REPLACE FUNCTION approve_country_request(
  p_request_id uuid,
  p_flag_emoji text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_request record;
  v_admin_id uuid;
BEGIN
  -- Get current user and verify admin role
  v_admin_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_admin_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve country requests';
  END IF;
  
  -- Get request details
  SELECT * INTO v_request 
  FROM country_requests 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Create the country
  INSERT INTO countries (name, code, flag_emoji)
  VALUES (v_request.country_name, v_request.country_code, p_flag_emoji);
  
  -- Update request status
  UPDATE country_requests
  SET 
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a country request
CREATE OR REPLACE FUNCTION reject_country_request(
  p_request_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get current user and verify admin role
  v_admin_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_admin_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reject country requests';
  END IF;
  
  -- Update request status
  UPDATE country_requests
  SET 
    status = 'rejected',
    admin_notes = p_admin_notes,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's country requests
CREATE OR REPLACE FUNCTION get_my_country_requests()
RETURNS TABLE (
  id uuid,
  country_name text,
  country_code text,
  reason text,
  status text,
  admin_notes text,
  created_at timestamptz,
  reviewed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.country_name,
    cr.country_code,
    cr.reason,
    cr.status,
    cr.admin_notes,
    cr.created_at,
    cr.reviewed_at
  FROM country_requests cr
  WHERE cr.requested_by = auth.uid()
  ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATED TRIGGERS
-- =============================================

-- Update timestamp trigger
CREATE TRIGGER update_country_requests_updated_at
  BEFORE UPDATE ON country_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION submit_country_request(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_country_requests(text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_country_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_country_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_country_requests() TO authenticated; 