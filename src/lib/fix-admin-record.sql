-- First, let's check the current state
SELECT * FROM society_admins WHERE email = 'prathamsharma8124@gmail.com';
SELECT * FROM society_admins WHERE user_id = '40864111-21d7-4b53-a536-181155c932b1';

-- Update the existing record to use the correct user_id
UPDATE society_admins
SET user_id = '40864111-21d7-4b53-a536-181155c932b1',
    name = 'Pratham Sharma'
WHERE email = 'prathamsharma8124@gmail.com';

-- Enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
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

-- Create policy for anonymous access (login)
CREATE POLICY "Allow anonymous select for login"
ON society_admins
FOR SELECT
TO anon
USING (true);

-- Create policy for authenticated users to view their own record
CREATE POLICY "Allow users to view their own admin record"
ON society_admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy for authenticated users to view other admins in their society
CREATE POLICY "Allow users to view other admins in their society"
ON society_admins
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM society_admins sa2
        WHERE sa2.user_id = auth.uid()
        AND sa2.society_id = society_admins.society_id
    )
);

-- Create policy for authenticated users to update their own record
CREATE POLICY "Allow users to update their own admin record"
ON society_admins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Verify final state
SELECT * FROM society_admins WHERE user_id = '40864111-21d7-4b53-a536-181155c932b1';
SELECT * FROM pg_policies WHERE tablename = 'society_admins';
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'society_admins'; 