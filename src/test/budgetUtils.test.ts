import { describe, it, expect } from 'vitest';
import {
  getShortToothId,
  formatCurrency,
  formatDateInput,
  parseBrazilianDate,
  calculateToothTotal,
  getToothDisplayName,
  calculateBudgetStatus,
} from '@/utils/budgetUtils';
import type { ToothEntry } from '@/utils/budgetUtils';

describe('getShortToothId', () => {
  it('retorna ARC_SUP para Arcada Superior', () => {
    expect(getShortToothId('Arcada Superior')).toBe('ARC_SUP');
  });
  it('retorna ARC_INF para Arcada Inferior', () => {
    expect(getShortToothId('Arcada Inferior')).toBe('ARC_INF');
  });
  it('retorna ARC_AMBAS para ambas as arcadas', () => {
    expect(getShortToothId('Arcada Superior + Arcada Inferior')).toBe('ARC_AMBAS');
  });
  it('retorna o próprio número para dentes normais', () => {
    expect(getShortToothId('11')).toBe('11');
    expect(getShortToothId('38')).toBe('38');
  });
});

describe('formatCurrency', () => {
  it('formata valor em centavos corretamente', () => {
    expect(formatCurrency('10000')).toBe('100,00');
  });
  it('trata string vazia como zero', () => {
    expect(formatCurrency('')).toBe('0,00');
  });
  it('ignora caracteres não numéricos', () => {
    expect(formatCurrency('R$ 5.000')).toBe('50,00');
  });
});

describe('formatDateInput', () => {
  it('formata corretamente até 2 dígitos', () => {
    expect(formatDateInput('12')).toBe('12');
  });
  it('insere barra após o dia', () => {
    expect(formatDateInput('1205')).toBe('12/05');
  });
  it('formata data completa DD/MM/YYYY', () => {
    expect(formatDateInput('12052026')).toBe('12/05/2026');
  });
  it('limita ao formato de 8 dígitos', () => {
    expect(formatDateInput('1205202699')).toBe('12/05/2026');
  });
});

describe('parseBrazilianDate', () => {
  it('converte DD/MM/YYYY para YYYY-MM-DD', () => {
    expect(parseBrazilianDate('27/02/2026')).toBe('2026-02-27');
  });
  it('retorna a string original se já estiver no formato ISO', () => {
    expect(parseBrazilianDate('2026-02-27')).toBe('2026-02-27');
  });
  it('retorna null para formato inválido', () => {
    expect(parseBrazilianDate('27/02')).toBeNull();
  });
  it('retorna null se partes tiverem tamanho errado', () => {
    expect(parseBrazilianDate('7/2/2026')).toBeNull();
  });
});

describe('calculateToothTotal', () => {
  it('soma os valores de todos os tratamentos do dente', () => {
    // valores em centavos
    const values = { Canal: '50000', Restauração: '20000' };
    expect(calculateToothTotal(values)).toBeCloseTo(700);
  });
  it('retorna 0 para valores vazios', () => {
    expect(calculateToothTotal({})).toBe(0);
  });
  it('trata valores ausentes como zero', () => {
    expect(calculateToothTotal({ Canal: '' })).toBe(0);
  });
});

describe('getToothDisplayName', () => {
  it('exibe dente permanente com prefixo', () => {
    expect(getToothDisplayName('11')).toBe('Dente 11');
  });
  it('exibe dente permanente sem prefixo', () => {
    expect(getToothDisplayName('11', false)).toBe('11');
  });
  it('identifica dente decíduo pelo quadrante 5-8', () => {
    expect(getToothDisplayName('51')).toBe('Dente 51 (decíduo)');
    expect(getToothDisplayName('85')).toBe('Dente 85 (decíduo)');
  });
  it('converte IDs curtos de volta ao nome completo', () => {
    expect(getToothDisplayName('ARC_SUP')).toBe('Arcada Superior');
    expect(getToothDisplayName('ARC_INF')).toBe('Arcada Inferior');
    expect(getToothDisplayName('ARC_AMBAS')).toBe('Arcada Superior + Arcada Inferior');
  });
});

describe('calculateBudgetStatus', () => {
  const makeEntry = (status: ToothEntry['status']): ToothEntry => ({
    tooth: '11',
    treatments: ['Canal'],
    values: {},
    status,
  });

  it('retorna pending para lista vazia', () => {
    expect(calculateBudgetStatus([])).toBe('pending');
  });
  it('retorna pending se todos os itens forem pending', () => {
    expect(calculateBudgetStatus([makeEntry('pending'), makeEntry('pending')])).toBe('pending');
  });
  it('retorna approved se houver pelo menos um aprovado', () => {
    expect(calculateBudgetStatus([makeEntry('pending'), makeEntry('approved')])).toBe('approved');
  });
  it('retorna completed se todos estiverem pagos ou concluídos', () => {
    expect(calculateBudgetStatus([makeEntry('paid'), makeEntry('completed')])).toBe('completed');
  });
  it('retorna approved se houver mistura de paid e pending', () => {
    expect(calculateBudgetStatus([makeEntry('paid'), makeEntry('pending')])).toBe('approved');
  });
});
