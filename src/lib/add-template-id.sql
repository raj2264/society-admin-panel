-- Add template_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE maintenance_bills 
        ADD COLUMN template_id UUID REFERENCES bill_templates(id);
    END IF;
END $$; 