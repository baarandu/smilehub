-- Adicionar colunas de alergia na tabela de anamneses
ALTER TABLE public.anamneses
ADD COLUMN IF NOT EXISTS allergy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allergy_details TEXT;
