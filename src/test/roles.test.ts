import { describe, it, expect } from 'vitest';
import {
  canSeeAllFinancials,
  isAdminRole,
  canActAsDentist,
  getRoleLabel,
  getRolesLabel,
} from '@/utils/roles';

describe('canSeeAllFinancials', () => {
  it('permite owner', () => expect(canSeeAllFinancials('owner')).toBe(true));
  it('permite admin', () => expect(canSeeAllFinancials('admin')).toBe(true));
  it('bloqueia dentist', () => expect(canSeeAllFinancials('dentist')).toBe(false));
  it('bloqueia assistant', () => expect(canSeeAllFinancials('assistant')).toBe(false));
  it('aceita array com role autorizado', () => {
    expect(canSeeAllFinancials(['dentist', 'admin'])).toBe(true);
  });
  it('bloqueia array sem role autorizado', () => {
    expect(canSeeAllFinancials(['dentist', 'viewer'])).toBe(false);
  });
});

describe('isAdminRole', () => {
  it('permite owner', () => expect(isAdminRole('owner')).toBe(true));
  it('permite admin', () => expect(isAdminRole('admin')).toBe(true));
  it('bloqueia dentist', () => expect(isAdminRole('dentist')).toBe(false));
  it('bloqueia assistant', () => expect(isAdminRole('assistant')).toBe(false));
  it('bloqueia viewer', () => expect(isAdminRole('viewer')).toBe(false));
  it('aceita array com admin', () => {
    expect(isAdminRole(['dentist', 'admin'])).toBe(true);
  });
});

describe('canActAsDentist', () => {
  it('permite dentist', () => expect(canActAsDentist('dentist')).toBe(true));
  it('permite admin', () => expect(canActAsDentist('admin')).toBe(true));
  it('permite owner', () => expect(canActAsDentist('owner')).toBe(true));
  it('bloqueia assistant', () => expect(canActAsDentist('assistant')).toBe(false));
  it('bloqueia viewer', () => expect(canActAsDentist('viewer')).toBe(false));
});

describe('getRoleLabel', () => {
  it('retorna o label correto em português', () => {
    expect(getRoleLabel('admin')).toBe('Administrador');
    expect(getRoleLabel('dentist')).toBe('Dentista');
    expect(getRoleLabel('assistant')).toBe('Secretaria');
    expect(getRoleLabel('viewer')).toBe('Visualizador');
  });
  it('retorna o próprio valor para role desconhecido', () => {
    expect(getRoleLabel('unknown_role')).toBe('unknown_role');
  });
});

describe('getRolesLabel', () => {
  it('retorna string vazia para array vazio', () => {
    expect(getRolesLabel([])).toBe('');
  });
  it('retorna label de um único role', () => {
    expect(getRolesLabel(['dentist'])).toBe('Dentista');
  });
  it('combina múltiplos roles com vírgula', () => {
    expect(getRolesLabel(['admin', 'dentist'])).toBe('Administrador, Dentista');
  });
});
