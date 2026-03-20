-- First, disable RLS temporarily on all affected tables
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE societies DISABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies from society_admins
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Allow authenticated users to view society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous users to view society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous admin check" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view own record" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view society members" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view other admins" ON society_admins;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON society_admins;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON society_admins;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON society_admins;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage all society admins" ON society_admins;
DROP POLICY IF EXISTS "Society admins can read their own record" ON society_admins;
DROP POLICY IF EXISTS "Society admins can update their own record" ON society_admins;
DROP POLICY IF EXISTS "Authenticated users can read society admin records" ON society_admins;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous select for login" ON society_admins;
DROP POLICY IF EXISTS "Allow authenticated users to access society_admins" ON society_admins;

-- Drop all existing policies from societies
DROP POLICY IF EXISTS "Enable read access for societies" ON societies;
DROP POLICY IF EXISTS "Superadmins have full access to societies" ON societies;
DROP POLICY IF EXISTS "Superadmins can view all societies" ON societies;
DROP POLICY IF EXISTS "Society admins can see their own society" ON societies;
DROP POLICY IF EXISTS "Society admins can manage their own society" ON societies;

-- Drop all existing policies from superadmins
DROP POLICY IF EXISTS "Superadmins table is public" ON superadmins;
DROP POLICY IF EXISTS "Superadmins have full access" ON superadmins;
DROP POLICY IF EXISTS "Allow authenticated users to access superadmins" ON superadmins;
DROP POLICY IF EXISTS "Superadmins can do anything" ON superadmins;
DROP POLICY IF EXISTS "Superadmins can manage superadmins" ON superadmins;
DROP POLICY IF EXISTS "Allow users to read their own superadmin record" ON superadmins;
DROP POLICY IF EXISTS "Allow all authenticated users to check superadmins" ON superadmins;
DROP POLICY IF EXISTS "Allow all authenticated users to check superadmins table" ON superadmins;

-- Drop any existing functions
DROP FUNCTION IF EXISTS is_society_admin(uuid);
DROP FUNCTION IF EXISTS get_admin_society_id(uuid);
DROP FUNCTION IF EXISTS is_superadmin();

-- Drop any existing views
DROP VIEW IF EXISTS admin_verification;

-- Revoke all permissions
REVOKE ALL ON society_admins FROM authenticated;
REVOKE ALL ON society_admins FROM anon;
REVOKE ALL ON society_admins FROM service_role;
REVOKE ALL ON societies FROM authenticated;
REVOKE ALL ON societies FROM anon;
REVOKE ALL ON societies FROM service_role;
REVOKE ALL ON superadmins FROM authenticated;
REVOKE ALL ON superadmins FROM anon;
REVOKE ALL ON superadmins FROM service_role;

-- Grant basic permissions
GRANT SELECT ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;
GRANT SELECT ON societies TO authenticated;
GRANT SELECT ON societies TO anon;
GRANT ALL ON societies TO service_role;
GRANT SELECT ON superadmins TO authenticated;
GRANT SELECT ON superadmins TO anon;
GRANT ALL ON superadmins TO service_role;

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

-- Create minimal policies for login to work
-- 1. Allow anonymous access to society_admins for login
CREATE POLICY "Allow anonymous access for login"
ON society_admins
FOR SELECT
TO anon
USING (true);

-- 2. Allow authenticated users to access their own records
CREATE POLICY "Allow authenticated access to own records"
ON society_admins
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Allow superadmins to access everything
CREATE POLICY "Allow superadmin access"
ON society_admins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM superadmins
    WHERE superadmins.id = auth.uid()
  )
);

-- 4. Allow authenticated users to view societies
CREATE POLICY "Allow authenticated access to societies"
ON societies
FOR SELECT
TO authenticated
USING (true);

-- 5. Allow superadmins to manage societies
CREATE POLICY "Allow superadmin management of societies"
ON societies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM superadmins
    WHERE superadmins.id = auth.uid()
  )
);

-- 6. Allow authenticated users to check superadmin status
CREATE POLICY "Allow superadmin status check"
ON superadmins
FOR SELECT
TO authenticated
USING (true);

-- Verify the cleanup
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('society_admins', 'societies', 'superadmins')
ORDER BY tablename, policyname; 