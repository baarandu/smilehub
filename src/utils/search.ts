/**
 * Busca textual tolerante: ignora acentos e maiúsculas, e casa palavras em
 * qualquer ordem. Mesma regra da RPC `search_patient_ids` no banco — manter
 * as duas em sincronia.
 */

/** Remove acentos, baixa caixa e colapsa espaços. */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quebra a busca em palavras normalizadas (sem vazias). */
export function searchTokens(query: string | null | undefined): string[] {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(' ') : [];
}

/**
 * true se TODAS as palavras da busca aparecem em algum dos campos, em qualquer
 * ordem (ex.: "silva maria" casa "Maria da Silva"; "joao" casa "João").
 * Busca vazia casa tudo.
 */
export function matchesSearch(
  query: string | null | undefined,
  fields: Array<string | null | undefined>,
): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '));
  return tokens.every((token) => haystack.includes(token));
}
