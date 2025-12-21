-- Enable RLS on patients table (if not already enabled)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON patients;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON "public"."patients"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON "public"."patients"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON "public"."patients"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON "public"."patients"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);
