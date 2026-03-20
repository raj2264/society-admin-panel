-- Undo script for fix-societies-and-admins-policies.sql
-- Operations are reversed in order

-- First, revoke the permissions that were granted
REVOKE ALL ON society_admins FROM authenticated;
REVOKE ALL ON societies FROM authenticated;

-- Drop all policies that were created
DROP POLICY IF EXISTS "Enable delete for superadmins" ON society_admins;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON society_admins;
DROP POLICY IF EXISTS "Enable insert for superadmins" ON society_admins;
DROP POLICY IF EXISTS "Enable read access for society_admins" ON society_admins;
DROP POLICY IF EXISTS "Enable read access for societies" ON societies;

-- Recreate the original policies that were dropped
CREATE POLICY "Enable read access for authenticated users"
ON society_admins FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON society_admins FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
ON society_admins FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable delete for users based on user_id"
ON society_admins FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Enable read access for authenticated users"
ON societies FOR SELECT
TO authenticated
USING (true);

-- Finally, disable RLS if it was enabled by the original script
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE societies DISABLE ROW LEVEL SECURITY; 