-- First, disable RLS temporarily to clean up policies
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all authenticated users to access the table
CREATE POLICY "Allow all access to authenticated users"
ON society_admins
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create a simple policy for anonymous access (needed for login)
CREATE POLICY "Allow anonymous select for login"
ON society_admins
FOR SELECT
TO anon
USING (true);

-- Grant necessary permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;

-- Verify the policies
SELECT * FROM pg_policies WHERE tablename = 'society_admins'; 