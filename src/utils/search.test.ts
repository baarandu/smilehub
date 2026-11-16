import { describe, it, expect } from 'vitest';
import { matchesSearch, normalizeSearchText, searchTokens } from './search';

describe('normalizeSearchText', () => {
  it('remove acentos, caixa e espaços extras', () => {
    expect(normalizeSearchText('  João   Conceição ')).toBe('joao conceicao');
  });
});

describe('searchTokens', () => {
  it('quebra em palavras e ignora vazio', () => {
    expect(searchTokens(' Maria  Silva ')).toEqual(['maria', 'silva']);
    expect(searchTokens('   ')).toEqual([]);
  });
});

describe('matchesSearch', () => {
  it('casa palavras fora de ordem', () => {
    expect(matchesSearch('silva maria', ['Maria da Silva'])).toBe(true);
  });

  it('casa com palavra no meio faltando', () => {
    expect(matchesSearch('maria costa', ['Maria Silva Costa'])).toBe(true);
  });

  it('ignora acentos nos dois lados', () => {
    expect(matchesSearch('joao', ['João Pedro'])).toBe(true);
    expect(matchesSearch('conceição', ['Ana Conceicao'])).toBe(true);
  });

  it('casa parte de palavra', () => {
    expect(matchesSearch('mar sil', ['Maria da Silva'])).toBe(true);
  });

  it('casa pelo responsável', () => {
    expect(matchesSearch('joana', ['Pedrinho', 'Joana Souza', null])).toBe(true);
  });

  it('exige todas as palavras', () => {
    expect(matchesSearch('maria pereira', ['Maria da Silva'])).toBe(false);
  });

  it('busca vazia casa tudo', () => {
    expect(matchesSearch('', ['x'])).toBe(true);
  });
});
