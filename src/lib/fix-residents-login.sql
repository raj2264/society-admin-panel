-- Add a policy that allows anonymous users to read residents emails for login verification

-- Check if the policy already exists to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'residents' 
    AND policyname = 'Allow reading resident emails for login'
  ) THEN
    -- Create policy for anon role to verify residents during login
    CREATE POLICY "Allow reading resident emails for login" ON residents
      FOR SELECT
      USING (true);
      
    -- Grant permissions to anonymous users to select from the residents table
    GRANT SELECT ON residents TO anon;
    
    RAISE NOTICE 'Created new policy for resident login verification';
  ELSE
    RAISE NOTICE 'Policy "Allow reading resident emails for login" already exists';
  END IF;
END
$$; 