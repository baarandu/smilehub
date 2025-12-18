-- Create tax_config table for multiple configurable taxes
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tax_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    rate NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE tax_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own taxes"
ON tax_config FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own taxes"
ON tax_config FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own taxes"
ON tax_config FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own taxes"
ON tax_config FOR DELETE
USING (auth.uid() = user_id);

-- Verify the table
SELECT * FROM information_schema.tables WHERE table_name = 'tax_config';
