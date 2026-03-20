-- Undo script for fix-insert-policy.sql
-- Operations are reversed in order

-- First, revoke the permissions that were granted
REVOKE ALL ON auth.users FROM service_role;
REVOKE ALL ON societies FROM service_role;
REVOKE ALL ON society_admins FROM service_role;

-- Drop the policy that was created
DROP POLICY IF EXISTS "Enable insert for superadmins and service role" ON society_admins;

-- Recreate the original policy if it existed
CREATE POLICY "Enable insert for superadmins"
ON society_admins
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM superadmins
        WHERE user_id = auth.uid()
    )
); 