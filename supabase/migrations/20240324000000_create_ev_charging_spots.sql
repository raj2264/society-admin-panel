-- Create EV charging spots table
CREATE TABLE IF NOT EXISTS ev_charging_spots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    charger_type TEXT NOT NULL,
    capacity_kw DECIMAL NOT NULL,
    number_of_ports INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
    hourly_rate DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE ev_charging_spots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow society admins to manage their society's charging spots
CREATE POLICY "Society admins can manage their society's charging spots"
ON ev_charging_spots
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

-- Create policy to allow residents to view charging spots
CREATE POLICY "Residents can view charging spots"
ON ev_charging_spots
FOR SELECT
TO authenticated
USING (
    society_id IN (
        SELECT society_id 
        FROM residents 
        WHERE user_id = auth.uid()
    )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ev_charging_spots_updated_at
    BEFORE UPDATE ON ev_charging_spots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 