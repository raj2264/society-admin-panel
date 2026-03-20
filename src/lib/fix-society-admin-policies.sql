-- Fix society_admins table policies
-- First, enable RLS if not already enabled
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;
DROP POLICY IF EXISTS "Allow society admin lookup" ON society_admins;

-- Create a completely unrestricted policy for email lookup during login
-- This is necessary because the login process needs to verify credentials
CREATE POLICY "Allow email lookup for login"
ON society_admins
FOR SELECT
TO anon, authenticated
USING (true);  -- Allow unrestricted access for login lookup

-- Create policy for society admin access to their own records
CREATE POLICY "Society admins can view their own records"
ON society_admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for superadmin access
CREATE POLICY "Superadmins can manage society admins"
ON society_admins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM superadmins
    WHERE superadmins.id = auth.uid()
  )
);

-- Create policy for viewing other admins in the same society
-- This policy uses a direct join to avoid recursion
CREATE POLICY "Society admins can view other admins in their society"
ON society_admins
FOR SELECT
TO authenticated
USING (
  society_id IN (
    SELECT society_id 
    FROM society_admins sa2 
    WHERE sa2.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON society_admins TO anon, authenticated;
GRANT ALL ON society_admins TO authenticated; 