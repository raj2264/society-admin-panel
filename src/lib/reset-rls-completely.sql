-- Completely disable RLS
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (using a more thorough approach)
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

-- Revoke all existing permissions
REVOKE ALL ON society_admins FROM authenticated;
REVOKE ALL ON society_admins FROM anon;
REVOKE ALL ON society_admins FROM service_role;

-- Grant basic permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Verify no policies exist
SELECT * FROM pg_policies WHERE tablename = 'society_admins';

-- Verify permissions
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'society_admins';

-- Check if the admin record exists
SELECT * FROM society_admins WHERE email = 'prathamsharma8124@gmail.com';

-- If no admin record exists, create it
INSERT INTO society_admins (user_id, society_id, email, name)
SELECT 
    id as user_id,
    (SELECT id FROM societies LIMIT 1) as society_id,
    'prathamsharma8124@gmail.com' as email,
    'Pratham Sharma' as name
FROM auth.users
WHERE email = 'prathamsharma8124@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM society_admins 
    WHERE email = 'prathamsharma8124@gmail.com'
); 