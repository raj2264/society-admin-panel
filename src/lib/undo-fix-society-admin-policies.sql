-- Undo script for fix-society-admin-policies.sql
-- Operations are reversed in order

-- First, revoke the permissions that were granted
REVOKE ALL ON society_admins FROM authenticated;
REVOKE SELECT ON society_admins FROM anon, authenticated;

-- Drop all policies that were created
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;

-- Finally, disable RLS if it was enabled by the original script
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY; 