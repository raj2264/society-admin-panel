-- First, fix society_admins table
ALTER TABLE society_admins DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

-- Create simple policies for society_admins
CREATE POLICY "Allow anonymous select for login"
ON society_admins
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated users to view their own record"
ON society_admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;
GRANT ALL ON society_admins TO service_role;

-- Now fix complaints table
ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'complaints'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON complaints', policy_record.policyname);
    END LOOP;
END $$;

-- Create simple policies for complaints
CREATE POLICY "Allow society admins to view all complaints"
ON complaints
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM society_admins
        WHERE society_admins.user_id = auth.uid()
        AND society_admins.society_id = complaints.society_id
    )
);

CREATE POLICY "Allow society admins to update complaints"
ON complaints
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM society_admins
        WHERE society_admins.user_id = auth.uid()
        AND society_admins.society_id = complaints.society_id
    )
);

-- Grant permissions
GRANT ALL ON complaints TO authenticated;
GRANT SELECT ON complaints TO anon;
GRANT ALL ON complaints TO service_role;

-- Verify the admin record
SELECT * FROM society_admins WHERE user_id = 'cd398096-2d49-40cf-8e0e-f0f49232172b';

-- Update the admin record if needed
UPDATE society_admins
SET user_id = 'cd398096-2d49-40cf-8e0e-f0f49232172b',
    name = 'Pratham Sharma'
WHERE email = 'prathamsharma8124@gmail.com';

-- Re-enable RLS
ALTER TABLE society_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Verify final state
SELECT * FROM pg_policies WHERE tablename IN ('society_admins', 'complaints');
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('society_admins', 'complaints'); 