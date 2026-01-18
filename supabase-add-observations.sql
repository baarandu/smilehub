-- Add observations column to anamneses table
ALTER TABLE public.anamneses 
ADD COLUMN observations text;
