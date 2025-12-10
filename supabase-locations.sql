-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, adjust based on auth later)
DROP POLICY IF EXISTS "Allow all operations on locations" ON locations;
CREATE POLICY "Allow all operations on locations" ON locations FOR ALL USING (true);

-- Also need WITH CHECK for insert/update
DROP POLICY IF EXISTS "Allow insert on locations" ON locations;
CREATE POLICY "Allow insert on locations" ON locations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on locations" ON locations;
CREATE POLICY "Allow update on locations" ON locations FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete on locations" ON locations;
CREATE POLICY "Allow delete on locations" ON locations FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow select on locations" ON locations;
CREATE POLICY "Allow select on locations" ON locations FOR SELECT USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS locations_updated_at ON locations;
CREATE TRIGGER locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default locations (only if table is empty)
INSERT INTO locations (name, address) 
SELECT 'Consultório 1', 'Sala principal'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Consultório 1');

INSERT INTO locations (name, address) 
SELECT 'Consultório 2', 'Sala secundária'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Consultório 2');
