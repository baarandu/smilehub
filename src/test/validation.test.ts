import { describe, it, expect } from 'vitest';
import { validatePixKey, getPasswordStrength } from '@/lib/validation';

describe('validatePixKey - CPF', () => {
  it('aceita CPF formatado', () => {
    expect(validatePixKey('123.456.789-09', 'cpf').valid).toBe(true);
  });
  it('aceita CPF sem formatação (11 dígitos)', () => {
    expect(validatePixKey('12345678909', 'cpf').valid).toBe(true);
  });
  it('rejeita CPF inválido', () => {
    const result = validatePixKey('123.456', 'cpf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('CPF');
  });
});

describe('validatePixKey - CNPJ', () => {
  it('aceita CNPJ formatado', () => {
    expect(validatePixKey('11.222.333/0001-81', 'cnpj').valid).toBe(true);
  });
  it('aceita CNPJ sem formatação (14 dígitos)', () => {
    expect(validatePixKey('11222333000181', 'cnpj').valid).toBe(true);
  });
  it('rejeita CNPJ incompleto', () => {
    const result = validatePixKey('11.222', 'cnpj');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('CNPJ');
  });
});

describe('validatePixKey - email', () => {
  it('aceita email válido', () => {
    expect(validatePixKey('teste@exemplo.com', 'email').valid).toBe(true);
  });
  it('rejeita email inválido', () => {
    const result = validatePixKey('nao-é-email', 'email');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('E-mail');
  });
});

describe('validatePixKey - chave vazia', () => {
  it('rejeita chave vazia', () => {
    const result = validatePixKey('', 'cpf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('obrigatória');
  });
});

describe('getPasswordStrength', () => {
  it('classifica senha fraca corretamente', () => {
    const result = getPasswordStrength('abc');
    expect(result.strength).toBe('weak');
    expect(result.score).toBeLessThanOrEqual(2);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('classifica senha forte corretamente', () => {
    const result = getPasswordStrength('Senha@Forte123!');
    expect(result.strength).toBe('strong');
    expect(result.score).toBe(5);
    expect(result.feedback).toHaveLength(0);
  });

  it('exige mínimo de 12 caracteres', () => {
    const result = getPasswordStrength('Ab1!');
    expect(result.feedback).toContain('Mínimo 12 caracteres');
  });

  it('exige letra maiúscula', () => {
    const result = getPasswordStrength('senha@forte123');
    expect(result.feedback).toContain('Letra maiúscula');
  });

  it('exige número', () => {
    const result = getPasswordStrength('Senha@Forte!!');
    expect(result.feedback).toContain('Número');
  });

  it('exige caractere especial', () => {
    const result = getPasswordStrength('SenhaForte1234');
    expect(result.feedback).toContain('Caractere especial (!@#$...)');
  });
});
