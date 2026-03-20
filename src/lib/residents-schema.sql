-- Create residents table if it doesn't exist
CREATE TABLE IF NOT EXISTS residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email, society_id)
);

-- Create RLS policies for residents table
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplicate policy errors
DROP POLICY IF EXISTS "Society admins can manage their society's residents" ON residents;
DROP POLICY IF EXISTS "Residents can view their own data" ON residents;

-- Society admins can manage residents in their society
CREATE POLICY "Society admins can manage their society's residents" ON residents
  USING (
    society_id IN (
      SELECT society_id FROM society_admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    society_id IN (
      SELECT society_id FROM society_admins
      WHERE user_id = auth.uid()
    )
  );

-- Residents can view their own data
CREATE POLICY "Residents can view their own data" ON residents
  FOR SELECT
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON residents TO authenticated; 