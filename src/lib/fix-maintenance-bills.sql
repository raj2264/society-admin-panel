-- Add missing columns to maintenance_bills table
DO LANGUAGE plpgsql $$
BEGIN 
    -- Add issue_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'issue_date'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN issue_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Add month_year if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'month_year'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN month_year DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Add template_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN template_id UUID REFERENCES bill_templates(id);
    END IF;

    -- Add bill_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'bill_date'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN bill_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

    -- Add due_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'due_date'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days');
    END IF;

    -- Add total_amount if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    -- Add status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'status'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid'));
    END IF;

    -- Add payment_history if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'payment_history'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN payment_history JSONB[] DEFAULT ARRAY[]::JSONB[];
    END IF;

    -- Add bill_components if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'bill_components'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN bill_components JSONB NOT NULL DEFAULT '{}'::JSONB;
    END IF;

    -- Add late_fee_percentage if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'late_fee_percentage'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN late_fee_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;

    -- Add pdf_url if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'pdf_url'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN pdf_url TEXT;
    END IF;

    -- Add sent_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance_bills' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE maintenance_bills ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

END $$; 