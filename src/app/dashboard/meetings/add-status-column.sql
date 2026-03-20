-- Add the status column to meetings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE meetings ADD COLUMN status VARCHAR(20) DEFAULT 'scheduled';
    END IF;
END $$; 