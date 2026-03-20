-- This file can be executed directly in the Supabase SQL editor

-- First check if residents table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'residents') THEN
    -- Create residents table if it doesn't exist
    CREATE TABLE residents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      unit_number TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id),
      UNIQUE(email, society_id)
    );

    -- Create RLS policies for residents table
    ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'Table residents already exists';
  END IF;
END
$$;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Society admins can manage their society's residents" ON residents;
DROP POLICY IF EXISTS "Residents can view their own data" ON residents;

-- Society admins can manage residents in their society
CREATE POLICY "Society admins can manage their society's residents" ON residents
  USING (
    society_id IN (
      SELECT society_id FROM society_admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    society_id IN (
      SELECT society_id FROM society_admins
      WHERE user_id = auth.uid()
    )
  );

-- Residents can view their own data
CREATE POLICY "Residents can view their own data" ON residents
  FOR SELECT
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON residents TO authenticated;

-- Create a function to clean up users if resident creation fails
CREATE OR REPLACE FUNCTION delete_orphaned_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  -- If a resident is deleted but the auth.user still exists
  -- Admin must manually delete the auth user via Supabase dashboard
  -- This is just to help with debugging
  RAISE NOTICE 'A resident was deleted. Consider cleaning up associated auth.user with ID: %', OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the function
DROP TRIGGER IF EXISTS on_resident_delete ON residents;
CREATE TRIGGER on_resident_delete
  AFTER DELETE ON residents
  FOR EACH ROW
  EXECUTE FUNCTION delete_orphaned_auth_users(); 