-- Drop existing tables if they exist
DROP TABLE IF EXISTS bill_generation_logs CASCADE;
DROP TABLE IF EXISTS maintenance_bills CASCADE;
DROP TABLE IF EXISTS bill_components CASCADE;
DROP TABLE IF EXISTS bill_templates CASCADE;

-- Create bill_templates table for storing society-specific bill templates
CREATE TABLE IF NOT EXISTS bill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  header_text TEXT,
  footer_text TEXT,
  logo_url TEXT,
  bank_details JSONB,
  terms_and_conditions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(society_id, name)
);

-- Create bill_components table for different charges that can be part of a bill
CREATE TABLE IF NOT EXISTS bill_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_percentage BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT TRUE,
  default_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(society_id, name)
);

-- Create maintenance_bills table for actual bills
CREATE TABLE IF NOT EXISTS maintenance_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  template_id UUID REFERENCES bill_templates(id),
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid')),
  payment_history JSONB[] DEFAULT ARRAY[]::JSONB[],
  bill_components JSONB NOT NULL,
  late_fee_percentage DECIMAL(5,2) DEFAULT 0,
  pdf_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(society_id, bill_number)
);

-- Create bill_generation_logs table for tracking bulk generation
CREATE TABLE IF NOT EXISTS bill_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES society_admins(id),
  generation_date DATE NOT NULL,
  total_bills INTEGER NOT NULL,
  successful_bills INTEGER NOT NULL,
  failed_bills INTEGER NOT NULL,
  error_logs JSONB[],
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_generation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Society admins can manage bill templates for their society
CREATE POLICY "Society admins can manage bill templates"
ON bill_templates
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

-- Society admins can manage bill components
CREATE POLICY "Society admins can manage bill components"
ON bill_components
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

-- Society admins can manage maintenance bills
CREATE POLICY "Society admins can manage maintenance bills"
ON maintenance_bills
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

-- Residents can view their own bills
CREATE POLICY "Residents can view their bills"
ON maintenance_bills
FOR SELECT
USING (resident_id IN (
  SELECT id FROM residents
  WHERE user_id = auth.uid()
));

-- Society admins can manage bill generation logs
CREATE POLICY "Society admins can manage bill generation logs"
ON bill_generation_logs
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

-- Grant necessary permissions
GRANT ALL ON bill_templates TO authenticated;
GRANT ALL ON bill_components TO authenticated;
GRANT ALL ON maintenance_bills TO authenticated;
GRANT ALL ON bill_generation_logs TO authenticated;

-- Drop existing function first
DROP FUNCTION IF EXISTS generate_bill_number(UUID, DATE);

-- Create function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number(p_society_id UUID, p_bill_date DATE)
RETURNS TEXT AS $$
DECLARE
  society_code TEXT;
  year_month TEXT;
  next_number INTEGER;
BEGIN
  -- Get society code (first 3 letters of society name)
  SELECT UPPER(LEFT(name, 3)) INTO society_code
  FROM societies s
  WHERE s.id = p_society_id;

  -- Format year and month (YYMM)
  year_month := TO_CHAR(p_bill_date, 'YYMM');

  -- Get next bill number for this society and month
  -- Note: We don't need to check bill_date here since we're just getting the next number
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 12) AS INTEGER)), 0) + 1
  INTO next_number
  FROM maintenance_bills mb
  WHERE mb.society_id = p_society_id
  AND bill_number LIKE society_code || '-' || year_month || '-%';

  -- Return formatted bill number (e.g., ABC-2304-0001)
  RETURN society_code || '-' || year_month || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql; 