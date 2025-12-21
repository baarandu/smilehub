-- FIX LOCATIONS RLS
-- The locations table is currently missing user_id and RLS policies.

-- 1. Add user_id column
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Claim existing orphan locations (optional, for safety)
UPDATE locations 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- 3. Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy
DROP POLICY IF EXISTS "User access" ON locations;
CREATE POLICY "User access" ON locations FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
