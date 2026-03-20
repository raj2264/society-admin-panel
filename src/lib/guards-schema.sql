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

-- Create a function to safely delete a guard and their auth user
CREATE OR REPLACE FUNCTION delete_guard(guard_id UUID, guard_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_society_id UUID;
BEGIN
  -- Get the society_id for the guard
  SELECT society_id INTO v_society_id
  FROM guards
  WHERE id = guard_id;

  -- Start transaction
  BEGIN
    -- Delete any terms acceptance records
    DELETE FROM terms_acceptance
    WHERE user_id = guard_user_id
    AND user_type = 'guard';

    -- Delete any visitor records created by this guard
    DELETE FROM visitors
    WHERE guard_id = guard_id;

    -- Delete the guard record
    DELETE FROM guards
    WHERE id = guard_id;

    -- Delete the auth user
    -- Note: This will cascade delete any related records due to ON DELETE CASCADE
    DELETE FROM auth.users
    WHERE id = guard_user_id;

    -- If we get here, commit the transaction
    RETURN;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      RAISE EXCEPTION 'Failed to delete guard: %', SQLERRM;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_guard(UUID, UUID) TO authenticated; 