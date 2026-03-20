-- Create monthly_balances table to track opening and closing balances
CREATE TABLE IF NOT EXISTS monthly_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    opening_balance DECIMAL(12,2) NOT NULL,
    closing_balance DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(society_id, month)
);

-- Create expense_vouchers table
CREATE TABLE IF NOT EXISTS expense_vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    monthly_balance_id UUID REFERENCES monthly_balances(id) ON DELETE CASCADE,
    voucher_number TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    payment_details JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE monthly_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_vouchers ENABLE ROW LEVEL SECURITY;

-- Create policy for society admins to manage monthly balances
CREATE POLICY "Society admins can manage their society's monthly balances"
ON monthly_balances
FOR ALL
TO authenticated
USING (
    society_id IN (
        SELECT society_id 
        FROM society_admins 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    society_id IN (
        SELECT society_id 
        FROM society_admins 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for society admins to manage expense vouchers
CREATE POLICY "Society admins can manage their society's expense vouchers"
ON expense_vouchers
FOR ALL
TO authenticated
USING (
    society_id IN (
        SELECT society_id 
        FROM society_admins 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    society_id IN (
        SELECT society_id 
        FROM society_admins 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for residents to view expense vouchers
CREATE POLICY "Residents can view their society's expense vouchers"
ON expense_vouchers
FOR SELECT
TO authenticated
USING (
    society_id IN (
        SELECT society_id 
        FROM residents 
        WHERE user_id = auth.uid()
    )
);

-- Create triggers to update updated_at timestamp
CREATE TRIGGER update_monthly_balances_updated_at
    BEFORE UPDATE ON monthly_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_vouchers_updated_at
    BEFORE UPDATE ON expense_vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update closing balance
CREATE OR REPLACE FUNCTION update_monthly_balance_closing()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE monthly_balances
    SET closing_balance = (
        SELECT opening_balance - COALESCE(SUM(amount), 0)
        FROM expense_vouchers
        WHERE monthly_balance_id = NEW.monthly_balance_id
    )
    WHERE id = NEW.monthly_balance_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update closing balance when expense voucher is added/updated/deleted
CREATE TRIGGER update_closing_balance_on_expense
    AFTER INSERT OR UPDATE OR DELETE ON expense_vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_balance_closing(); 