-- =============================================
-- ADD PHONE FIELD TO PROFILES TABLE
-- =============================================

-- Add phone field to profiles table for better passenger contact information
ALTER TABLE profiles 
ADD COLUMN phone VARCHAR(20);

-- Add index for phone field for better lookup performance
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- Update RLS policies to include phone field access
-- (Current policies already cover profile access, so no additional policies needed) 