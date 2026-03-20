-- First, let's clean up any existing policies that might be causing issues
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow authenticated users to view society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous users to view society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous admin check" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view own record" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view society members" ON society_admins;

-- Disable RLS temporarily to clean up
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Revoke all existing permissions
REVOKE ALL ON society_admins FROM authenticated;
REVOKE ALL ON society_admins FROM anon;
REVOKE ALL ON society_admins FROM service_role;

-- Grant basic permissions
GRANT SELECT ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Create a function to check if a user is an admin (simplified)
CREATE OR REPLACE FUNCTION is_society_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM society_admins 
    WHERE society_admins.user_id = is_society_admin.user_id
  );
END;
$$;

-- Create a function to get admin's society_id (simplified)
CREATE OR REPLACE FUNCTION get_admin_society_id(admin_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_society_id uuid;
BEGIN
  SELECT society_id INTO v_society_id
  FROM society_admins
  WHERE user_id = admin_user_id
  LIMIT 1;
  
  RETURN v_society_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_society_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_society_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_admin_society_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_society_id(uuid) TO anon;

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies that avoid recursion
-- 1. Allow anonymous users to check admin status (needed for login)
CREATE POLICY "Allow anonymous admin check"
ON society_admins
FOR SELECT
TO anon
USING (true);

-- 2. Allow authenticated users to view their own record (simplified)
CREATE POLICY "Allow admins to view own record"
ON society_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Allow authenticated users to view other admins (simplified)
CREATE POLICY "Allow admins to view other admins"
ON society_admins
FOR SELECT
TO authenticated
USING (true);

-- Create a view for admin verification that's easier to query
CREATE OR REPLACE VIEW admin_verification AS
SELECT 
  sa.user_id,
  sa.society_id,
  sa.email,
  sa.name,
  au.email as auth_email,
  au.id as auth_id
FROM society_admins sa
JOIN auth.users au ON sa.email = au.email;

-- Grant access to the view
GRANT SELECT ON admin_verification TO authenticated;
GRANT SELECT ON admin_verification TO anon;

-- Verify the setup
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'society_admins';

-- Check if any admin records need to be synced
SELECT 
  av.user_id as society_admin_user_id,
  av.auth_id as auth_user_id,
  av.email,
  CASE 
    WHEN av.user_id = av.auth_id THEN 'Synced'
    ELSE 'Needs Update'
  END as sync_status
FROM admin_verification av;

-- Update any mismatched user_ids
UPDATE society_admins sa
SET user_id = au.id
FROM auth.users au
WHERE sa.email = au.email
AND sa.user_id != au.id;

-- Final verification
SELECT * FROM admin_verification; 