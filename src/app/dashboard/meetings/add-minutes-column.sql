-- Add the minutes_text column to meetings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'minutes_text'
    ) THEN
        ALTER TABLE meetings ADD COLUMN minutes_text TEXT;
    END IF;
END $$; 