-- Add paper size columns to clinic_settings for letterhead
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS letterhead_width_mm numeric DEFAULT 210,
  ADD COLUMN IF NOT EXISTS letterhead_height_mm numeric DEFAULT 297;
