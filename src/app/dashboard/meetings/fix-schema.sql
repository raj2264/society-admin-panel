-- Add the content column to meeting_minutes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meeting_minutes' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE meeting_minutes ADD COLUMN content TEXT;
    END IF;
END $$;

-- Add the minutes column to meeting_minutes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meeting_minutes' 
        AND column_name = 'minutes'
    ) THEN
        ALTER TABLE meeting_minutes ADD COLUMN minutes TEXT;
    END IF;
END $$;

-- Add the text column to meeting_minutes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meeting_minutes' 
        AND column_name = 'text'
    ) THEN
        ALTER TABLE meeting_minutes ADD COLUMN text TEXT;
    END IF;
END $$;

-- Add the note column to meeting_minutes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meeting_minutes' 
        AND column_name = 'note'
    ) THEN
        ALTER TABLE meeting_minutes ADD COLUMN note TEXT;
    END IF;
END $$; 