-- First, let's check both user IDs
SELECT * FROM auth.users WHERE email = 'prathamsharma8124@gmail.com';
SELECT * FROM society_admins WHERE email = 'prathamsharma8124@gmail.com';

-- Update the admin record with the correct user ID from auth
UPDATE society_admins
SET user_id = 'cd398096-2d49-40cf-8e0e-f0f49232172b',  -- This is the actual user ID from auth
    name = 'Pratham Sharma'
WHERE email = 'prathamsharma8124@gmail.com';

-- Keep RLS disabled for now
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

-- Grant basic permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Verify the final state
SELECT * FROM society_admins WHERE user_id = 'cd398096-2d49-40cf-8e0e-f0f49232172b';
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'society_admins'; 