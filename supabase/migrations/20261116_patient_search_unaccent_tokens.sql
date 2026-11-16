-- Busca de paciente: palavras em qualquer ordem + ignora acentos.
--
-- Antes: o front fazia `name.ilike.%texto inteiro%` (e idem mãe/pai/responsável)
-- direto em patients_secure. "Silva Maria" não achava "Maria da Silva" e
-- "joao" não achava "João".
--
-- Agora: RPC `search_patient_ids` quebra a busca em palavras; cada palavra
-- precisa aparecer (sem acento, sem caixa) em nome do paciente OU nome da mãe,
-- pai ou responsável legal. Telefone (dígitos) e CPF (últimos 4) continuam.
--
-- Decisões:
-- * Retorna só ids (o front busca as linhas em patients_secure). Uma função
--   `RETURNS SETOF patients_secure` criaria dependência na view e quebraria os
--   `DROP VIEW patients_secure` das migrations futuras que a recriam.
-- * Corpo SQL "clássico" (não BEGIN ATOMIC) — não registra dependências, então
--   recriar a view não afeta a função.
-- * SECURITY INVOKER: RLS de patients continua valendo (inclusive a restrição
--   dentista-só). mother_name/father_name são criptografados; decrypt_pii é o
--   mesmo que a view já usa.
-- * Sem índice: escaneia os pacientes da clínica (mesmo custo da busca antiga,
--   que já descriptografava mother/father_name linha a linha no ilike).
-- * Regra espelhada no front em src/utils/search.ts — manter em sincronia.

SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- unaccent() é STABLE; wrapper IMMUTABLE com dicionário explícito (padrão
-- recomendado) para poder ser usado em expressões/índices no futuro.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

CREATE OR REPLACE FUNCTION public.search_patient_ids(
  p_clinic_id uuid,
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH q AS (
    SELECT
      array_remove(
        regexp_split_to_array(
          lower(public.immutable_unaccent(btrim(left(coalesce(p_query, ''), 100)))),
          '\s+'
        ),
        ''
      ) AS tokens,
      regexp_replace(coalesce(p_query, ''), '\D', '', 'g') AS digits
  )
  SELECT p.id
  FROM patients p, q
  WHERE p.clinic_id = p_clinic_id
    AND p.deleted_at IS NULL
    AND (
      -- Todas as palavras aparecem em nome/mãe/pai/responsável.
      -- position() em vez de LIKE: não precisa escapar % e _.
      (
        cardinality(q.tokens) > 0
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(q.tokens) AS tok
          WHERE position(tok IN lower(public.immutable_unaccent(concat_ws(' ',
                  p.name,
                  decrypt_pii(p.mother_name),
                  decrypt_pii(p.father_name),
                  p.legal_guardian
                )))) = 0
        )
      )
      OR (
        length(q.digits) >= 2
        AND (
          position(q.digits IN coalesce(p.phone_digits, '')) > 0
          OR position(right(q.digits, 4) IN coalesce(p.cpf_last4, '')) > 0
        )
      )
    )
  ORDER BY p.name
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.search_patient_ids(uuid, text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.search_patient_ids(uuid, text, int) TO authenticated, service_role;
