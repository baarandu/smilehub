-- Migration: Add gestational age (weeks) and current measurements to child_anamneses
-- Date: 2026-06-12

ALTER TABLE child_anamneses
  ADD COLUMN IF NOT EXISTS gestational_age_weeks text, -- semanas de gestação ao nascer
  ADD COLUMN IF NOT EXISTS current_weight text,        -- peso atual da criança
  ADD COLUMN IF NOT EXISTS current_height text;        -- altura atual da criança
