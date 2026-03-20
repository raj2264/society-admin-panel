-- Undo script for fix-admin-login.sql
-- Operations are reversed in order

-- First, drop the policies that were created
DROP POLICY IF EXISTS "Allow admins to view other admins" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view own record" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous admin check" ON society_admins;

-- Disable RLS temporarily
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Revoke function permissions
REVOKE EXECUTE ON FUNCTION get_admin_society_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_admin_society_id(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION is_society_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION is_society_admin(uuid) FROM authenticated;

-- Drop the functions
DROP FUNCTION IF EXISTS get_admin_society_id(uuid);
DROP FUNCTION IF EXISTS is_society_admin(uuid);

-- Revoke view permissions
REVOKE SELECT ON admin_verification FROM anon;
REVOKE SELECT ON admin_verification FROM authenticated;

-- Drop the view
DROP VIEW IF EXISTS admin_verification;

-- Revoke table permissions
REVOKE ALL ON society_admins FROM service_role;
REVOKE SELECT ON society_admins FROM anon;
REVOKE SELECT ON society_admins FROM authenticated;

-- Note: We don't undo the UPDATE statement that fixed mismatched user_ids
-- as that was a data correction that should be kept

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY; 