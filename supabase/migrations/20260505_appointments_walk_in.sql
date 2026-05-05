-- Adiciona suporte a "encaixe" (urgência fora do horário regular do dentista)
-- na tabela appointments. is_walk_in fica no nível da consulta — não altera
-- schedule_settings, então outros dias mantêm o expediente normal.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS is_walk_in boolean NOT NULL DEFAULT false;
