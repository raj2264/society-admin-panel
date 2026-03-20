-- Begin transaction
BEGIN;

-- First, let's check the current state of admin records
SELECT 
    'Initial Admin Records Check' as check_type,
    sa.user_id,
    sa.society_id,
    sa.email,
    sa.name,
    au.id as auth_user_id,
    au.email as auth_email,
    CASE 
        WHEN sa.user_id = au.id THEN 'Synced'
        ELSE 'Needs Update'
    END as sync_status
FROM society_admins sa
LEFT JOIN auth.users au ON sa.email = au.email;

-- Clean up existing policies
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view their own records" ON society_admins;
DROP POLICY IF EXISTS "Society admins can view other admins in their society" ON society_admins;
DROP POLICY IF EXISTS "Superadmins can manage society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow authenticated users to view society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous users to view society admins" ON society_admins;
DROP POLICY IF EXISTS "Allow anonymous admin check" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view own record" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view society members" ON society_admins;
DROP POLICY IF EXISTS "Allow admins to view other admins" ON society_admins;

-- Disable RLS temporarily
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Revoke all existing permissions
REVOKE ALL ON society_admins FROM authenticated;
REVOKE ALL ON society_admins FROM anon;
REVOKE ALL ON society_admins FROM service_role;

-- Grant basic permissions
GRANT SELECT ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Drop existing functions and views
DROP FUNCTION IF EXISTS is_society_admin(uuid);
DROP FUNCTION IF EXISTS get_admin_society_id(uuid);
DROP VIEW IF EXISTS admin_verification;

-- Create verification view
CREATE VIEW admin_verification AS
SELECT 
    sa.user_id as society_admin_user_id,
    sa.society_id,
    sa.email,
    sa.name,
    au.id as auth_user_id,
    au.email as auth_email,
    CASE 
        WHEN sa.user_id = au.id THEN 'Synced'
        ELSE 'Needs Update'
    END as sync_status
FROM society_admins sa
LEFT JOIN auth.users au ON sa.email = au.email;

-- Grant access to the view
GRANT SELECT ON admin_verification TO authenticated;
GRANT SELECT ON admin_verification TO anon;

-- Update any mismatched user_ids
UPDATE society_admins sa
SET user_id = au.id
FROM auth.users au
WHERE sa.email = au.email
AND sa.user_id != au.id;

-- Create admin verification functions
CREATE FUNCTION is_society_admin(user_id uuid)
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

CREATE FUNCTION get_admin_society_id(admin_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_society_id uuid;
    v_email text;
BEGIN
    -- First try to get the society_id from existing record
    SELECT society_id INTO v_society_id
    FROM society_admins
    WHERE user_id = admin_user_id
    LIMIT 1;
    
    -- If no record found, try to get email from auth.users
    IF v_society_id IS NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE id = admin_user_id;
        
        -- If we found an email, check if there's a record with that email
        IF v_email IS NOT NULL THEN
            SELECT society_id INTO v_society_id
            FROM society_admins
            WHERE email = v_email
            LIMIT 1;
            
            -- If found by email, update the user_id
            IF v_society_id IS NOT NULL THEN
                UPDATE society_admins
                SET user_id = admin_user_id
                WHERE email = v_email;
            END IF;
        END IF;
    END IF;
    
    RETURN v_society_id;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION is_society_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_society_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_admin_society_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_society_id(uuid) TO anon;

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;

-- Create universal RLS policies
-- 1. Allow anonymous access for login (universal)
CREATE POLICY "society_admins_login_check"
ON society_admins
FOR SELECT
TO anon
USING (true);

-- 2. Allow authenticated users to view their own record
CREATE POLICY "society_admins_own_record"
ON society_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Allow authenticated users to view other admins in their society
CREATE POLICY "society_admins_society_view"
ON society_admins
FOR SELECT
TO authenticated
USING (
    society_id IN (
        SELECT society_id FROM society_admins
        WHERE user_id = auth.uid()
    )
);

-- Verify the setup
SELECT 
    'Policy Verification' as check_type,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'society_admins'
ORDER BY policyname;

-- Verify permissions
SELECT 
    'Permissions Check' as check_type,
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'society_admins'
ORDER BY grantee, privilege_type;

-- Verify admin records after sync
SELECT 
    'Final Admin Records Check' as check_type,
    sa.user_id,
    sa.society_id,
    sa.email,
    sa.name,
    au.id as auth_user_id,
    au.email as auth_email,
    CASE 
        WHEN sa.user_id = au.id THEN 'Synced'
        ELSE 'Needs Update'
    END as sync_status
FROM society_admins sa
LEFT JOIN auth.users au ON sa.email = au.email;

-- Test login verification for a sample admin
SELECT 
    'Login Verification Test' as check_type,
    sa.email,
    sa.user_id,
    au.id as auth_user_id,
    CASE 
        WHEN sa.user_id = au.id THEN 'Login Ready'
        ELSE 'Needs Fix'
    END as login_status
FROM society_admins sa
JOIN auth.users au ON sa.email = au.email
LIMIT 1;

COMMIT;

-- Final verification
SELECT 
    'Final State Verification' as check_type,
    COUNT(*) as total_admins,
    COUNT(CASE WHEN user_id = auth_user_id THEN 1 END) as synced_admins,
    COUNT(CASE WHEN user_id != auth_user_id THEN 1 END) as unsynced_admins
FROM admin_verification; 