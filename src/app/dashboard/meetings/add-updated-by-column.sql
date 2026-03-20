-- Add the updated_by column to meetings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE meetings ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$; 