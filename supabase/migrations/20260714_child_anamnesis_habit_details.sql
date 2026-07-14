-- Campos de observação para os hábitos parafuncionais da anamnese infantil
-- (range os dentes já possui teeth_grinding_details)
ALTER TABLE public.child_anamneses
  ADD COLUMN IF NOT EXISTS nail_biting_details text,
  ADD COLUMN IF NOT EXISTS object_biting_details text,
  ADD COLUMN IF NOT EXISTS thumb_sucking_details text,
  ADD COLUMN IF NOT EXISTS prolonged_pacifier_details text,
  ADD COLUMN IF NOT EXISTS mouth_breathing_details text;
