-- First, check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'vendor_bookings';

-- Then, check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'vendor_bookings';

-- Update the policies to ensure both USING and WITH CHECK clauses exist for UPDATE operations
-- Drop existing update policy if it exists (adjust name as needed)
DROP POLICY IF EXISTS "Update vendor bookings" ON vendor_bookings;

-- Create a more permissive policy for updates
CREATE POLICY "Update vendor bookings" 
ON vendor_bookings
FOR UPDATE 
USING (true)  -- Allow reading any row for update considerations
WITH CHECK (true);  -- Allow updating any row

-- If you need more specific control, use something like this instead:
-- WITH CHECK (auth.uid() IN (SELECT user_id FROM society_admins));

-- Ensure there's also a select policy
DROP POLICY IF EXISTS "Select vendor bookings" ON vendor_bookings;
CREATE POLICY "Select vendor bookings"
ON vendor_bookings
FOR SELECT
USING (true);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'vendor_bookings'; 