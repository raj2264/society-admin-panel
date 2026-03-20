-- Guards Schema for Society Admin Panel

-- Create guards table if it doesn't exist
CREATE TABLE IF NOT EXISTS guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email, society_id)
);

-- Enable Row Level Security
ALTER TABLE guards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Society admins can manage their society's guards" ON guards;
DROP POLICY IF EXISTS "Guards can view their own data" ON guards;

-- Create RLS policies for guards table
-- Society admins can manage guards in their society
CREATE POLICY "Society admins can manage their society's guards" ON guards
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

-- Guards can view their own data
CREATE POLICY "Guards can view their own data" ON guards
  FOR SELECT
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON guards TO authenticated; 