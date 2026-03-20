-- Create society_staff table
CREATE TABLE IF NOT EXISTS society_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('maintenance', 'security', 'housekeeping', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, society_id)
);

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('visitor', 'vendor', 'event', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE society_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for society_staff

-- Society admins can manage staff for their society
CREATE POLICY "Society admins can manage their society staff"
ON society_staff
FOR ALL
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

-- Staff members can view their own records
CREATE POLICY "Staff can view their own records"
ON society_staff
FOR SELECT
USING (user_id = auth.uid());

-- Create RLS policies for approval_requests

-- Society admins can manage all approval requests in their society
CREATE POLICY "Society admins can manage approval requests"
ON approval_requests
FOR ALL
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

-- Residents can view their own approval requests
CREATE POLICY "Residents can view their approval requests"
ON approval_requests
FOR SELECT
USING (resident_id IN (
  SELECT id FROM residents
  WHERE user_id = auth.uid()
));

-- Grant necessary permissions
GRANT ALL ON society_staff TO authenticated;
GRANT ALL ON approval_requests TO authenticated; 