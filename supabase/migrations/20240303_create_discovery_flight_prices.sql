-- Create discovery flight prices table
CREATE TABLE IF NOT EXISTS discovery_flight_prices (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    price decimal NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT discovery_flight_prices_price_check CHECK (price >= 0)
);

-- Add unique constraint to ensure only one price per club
ALTER TABLE discovery_flight_prices
ADD CONSTRAINT discovery_flight_prices_club_id_unique UNIQUE (club_id);

-- Add RLS policies
ALTER TABLE discovery_flight_prices ENABLE ROW LEVEL SECURITY;

-- Allow public to read prices
CREATE POLICY "Enable read access for all users"
ON discovery_flight_prices
FOR SELECT
TO public
USING (true);

-- Allow service role to manage prices
CREATE POLICY "Enable service role to manage prices"
ON discovery_flight_prices
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discovery_flight_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_discovery_flight_prices_updated_at
    BEFORE UPDATE ON discovery_flight_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_discovery_flight_prices_updated_at();
