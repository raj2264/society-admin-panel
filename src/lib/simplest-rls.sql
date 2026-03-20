-- First, completely disable RLS
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'society_admins'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON society_admins', policy_record.policyname);
    END LOOP;
END $$;

-- Revoke all permissions first
REVOKE ALL ON society_admins FROM authenticated;
REVOKE ALL ON society_admins FROM anon;
REVOKE ALL ON society_admins FROM service_role;

-- Grant basic permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Verify the admin record
SELECT * FROM society_admins WHERE email = 'prathamsharma8124@gmail.com';

-- Update the admin record if needed
UPDATE society_admins
SET user_id = '40864111-21d7-4b53-a536-181155c932b1',
    name = 'Pratham Sharma'
WHERE email = 'prathamsharma8124@gmail.com';

-- For now, keep RLS disabled
-- We'll enable it later with a very simple policy once login works

-- Verify final state
SELECT * FROM society_admins WHERE user_id = '40864111-21d7-4b53-a536-181155c932b1';
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'society_admins'; 