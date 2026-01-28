-- Add bruxism/DTM/orofacial pain fields to anamneses table
ALTER TABLE anamneses
ADD COLUMN IF NOT EXISTS bruxism_dtm_orofacial_pain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bruxism_dtm_orofacial_pain_details TEXT;
