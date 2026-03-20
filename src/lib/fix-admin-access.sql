-- First, enable RLS
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

-- Verify the admin record exists and is correct
SELECT * FROM society_admins WHERE user_id = '40864111-21d7-4b53-a536-181155c932b1';

-- If the admin record doesn't exist, create it
INSERT INTO society_admins (user_id, society_id, email, name)
SELECT 
    '40864111-21d7-4b53-a536-181155c932b1' as user_id,
    (SELECT id FROM societies LIMIT 1) as society_id,
    'prathamsharma8124@gmail.com' as email,
    'Pratham Sharma' as name
WHERE NOT EXISTS (
    SELECT 1 FROM society_admins 
    WHERE user_id = '40864111-21d7-4b53-a536-181155c932b1'
);

-- Verify final state
SELECT * FROM pg_policies WHERE tablename = 'society_admins';
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'society_admins'; 