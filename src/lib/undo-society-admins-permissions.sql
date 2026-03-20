-- Undo script for undo-society-admins-permissions.sql
-- Operations are reversed in order

-- First, drop the policies that were recreated
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON society_admins;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON society_admins;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON society_admins;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON society_admins;

-- Revoke the permissions that were revoked
GRANT ALL ON society_admins TO authenticated;

-- Recreate the original policies that were dropped
CREATE POLICY "Superadmins can manage all society admins"
ON society_admins
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM superadmins
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Society admins can read their own record"
ON society_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Society admins can update their own record"
ON society_admins
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can read society admin records"
ON society_admins
FOR SELECT
TO authenticated
USING (true); 