-- Add email and name fields to society_admins table
ALTER TABLE society_admins 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS name TEXT;

-- Drop existing constraint if it exists before adding new one
ALTER TABLE society_admins
DROP CONSTRAINT IF EXISTS society_admins_email_key;

-- Add unique constraint on email
ALTER TABLE society_admins
ADD CONSTRAINT society_admins_email_key UNIQUE (email);

-- Update existing records to set email based on user_id if email is null
UPDATE society_admins
SET email = (
    SELECT email 
    FROM auth.users 
    WHERE auth.users.id = society_admins.user_id
)
WHERE email IS NULL;

-- Make email required for new records
ALTER TABLE society_admins
ALTER COLUMN email SET NOT NULL;

-- Grant necessary permissions
GRANT ALL ON society_admins TO authenticated;
GRANT SELECT ON society_admins TO anon;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow email lookup for login" ON society_admins;

-- Allow anonymous access for login lookup
CREATE POLICY "Allow email lookup for login"
ON society_admins
FOR SELECT
TO anon, authenticated
USING (true); 