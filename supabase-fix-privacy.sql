-- 1. Add user_id column if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Claim existing patients for the current user (Migration)
-- WARNING: This will assign ALL existing patients to the user who runs this script.
UPDATE patients 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- 3. Update RLS policies to be private
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON patients;

-- Read: Users can only see their own patients
CREATE POLICY "Users can view own patients" ON patients
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insert: Users can insert independent of ID (default will handle it), 
-- but we ensure they can't spoof another user_id if they try.
CREATE POLICY "Users can create own patients" ON patients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update: Users can only update their own patients
CREATE POLICY "Users can update own patients" ON patients
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Delete: Users can only delete their own patients
CREATE POLICY "Users can delete own patients" ON patients
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
