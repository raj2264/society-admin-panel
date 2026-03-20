-- Undo script for fix-society-admins-select-policy.sql
-- Operations are reversed in order

-- First, revoke the permissions that were granted
REVOKE SELECT ON societies FROM authenticated;
REVOKE SELECT ON society_admins FROM authenticated;

-- Drop the policy that was created
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON society_admins;

-- Recreate the original policy
CREATE POLICY "Enable read access for authenticated users"
ON society_admins
FOR SELECT
TO authenticated
USING (true); 