-- First, disable RLS temporarily to allow for fixes
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all authenticated users to access society_admins
-- This is similar to how it was before and should allow login to work
CREATE POLICY "Allow authenticated users to access society_admins"
ON society_admins
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon; 