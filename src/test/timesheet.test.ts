import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  summarizeWeek,
  formatMinutes,
  hasOverlap,
  type TimeEntry,
} from '@/utils/timesheet';

let seq = 0;
function entry(clockIn: Date, clockOut: Date | null): TimeEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    clinic_id: 'c1',
    user_id: 'u1',
    clock_in: clockIn.toISOString(),
    clock_out: clockOut ? clockOut.toISOString() : null,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: clockIn.toISOString(),
    updated_at: clockIn.toISOString(),
  };
}
// month index 7 = agosto; 10/ago/2026 é segunda
const d = (day: number, h = 0, m = 0) => new Date(2026, 7, day, h, m);

describe('getWeekStart', () => {
  it('quarta → segunda 00:00', () => expect(getWeekStart(d(12, 15))).toEqual(d(10)));
  it('domingo → segunda anterior', () => expect(getWeekStart(d(16, 10))).toEqual(d(10)));
  it('segunda → ela mesma 00:00', () => expect(getWeekStart(d(10, 9))).toEqual(d(10)));
});

describe('summarizeWeek', () => {
  const ws = d(10);
  const NOW = d(20);

  it('soma pares do mesmo dia (almoço)', () => {
    const s = summarizeWeek([entry(d(10, 8), d(10, 12)), entry(d(10, 13), d(10, 18))], ws, 44, NOW);
    expect(s.days[0].minutes).toBe(540);
    expect(s.days[0].entries).toHaveLength(2);
    expect(s.totalMinutes).toBe(540);
  });

  it('7 dias sempre, seg→dom', () => {
    const s = summarizeWeek([], ws, 44, NOW);
    expect(s.days).toHaveLength(7);
    expect(s.days[0].date).toEqual(d(10));
    expect(s.days[6].date).toEqual(d(16));
  });

  it('ignora registros de outra semana', () => {
    const s = summarizeWeek([entry(d(17, 8), d(17, 12)), entry(d(9, 8), d(9, 12))], ws, 44, NOW);
    expect(s.totalMinutes).toBe(0);
  });

  it('excedente acima do limite', () => {
    // seg–sex 9h + sáb 1h30 = 46h30
    const es = [10, 11, 12, 13, 14].map(day => entry(d(day, 8), d(day, 17)));
    es.push(entry(d(15, 8), d(15, 9, 30)));
    const s = summarizeWeek(es, ws, 44, NOW);
    expect(s.totalMinutes).toBe(2790);
    expect(s.overtimeMinutes).toBe(150);
  });

  it('excedente zero abaixo do limite', () => {
    const es = [10, 11, 12, 13, 14].map(day => entry(d(day, 8), d(day, 16)));
    const s = summarizeWeek(es, ws, 44, NOW);
    expect(s.totalMinutes).toBe(2400);
    expect(s.overtimeMinutes).toBe(0);
  });

  it('limite decimal', () => {
    const es = [10, 11, 12, 13, 14].map(day => entry(d(day, 8), d(day, 17)));
    es.push(entry(d(15, 8), d(15, 9, 30)));
    const s = summarizeWeek(es, ws, 42.5, NOW);
    expect(s.overtimeMinutes).toBe(240);
  });

  it('ponto aberto hoje conta até now', () => {
    const s = summarizeWeek([entry(d(10, 8), null)], ws, 44, d(10, 11, 30));
    expect(s.days[0].minutes).toBe(210);
    expect(s.totalMinutes).toBe(210);
    expect(s.openStaleEntries).toHaveLength(0);
  });

  it('ignora ponto aberto de dia anterior', () => {
    const s = summarizeWeek([entry(d(10, 8), null)], ws, 44, d(11, 9));
    expect(s.totalMinutes).toBe(0);
    expect(s.openStaleEntries).toHaveLength(1);
    expect(s.days[0].entries).toHaveLength(1);
  });

  it('cruza meia-noite: conta no dia do início', () => {
    const s = summarizeWeek([entry(d(10, 22), d(11, 2))], ws, 44, NOW);
    expect(s.days[0].minutes).toBe(240);
    expect(s.days[1].minutes).toBe(0);
  });

  it('cruza dom→seg: fica na semana do início', () => {
    const s = summarizeWeek([entry(d(16, 22), d(17, 1))], ws, 44, NOW);
    expect(s.days[6].minutes).toBe(180);
    expect(s.totalMinutes).toBe(180);
  });
});

describe('formatMinutes', () => {
  it('2790 → 46h30', () => expect(formatMinutes(2790)).toBe('46h30'));
  it('5 → 0h05', () => expect(formatMinutes(5)).toBe('0h05'));
  it('0 → 0h00', () => expect(formatMinutes(0)).toBe('0h00'));
});

describe('hasOverlap', () => {
  const existing = [entry(d(10, 8), d(10, 12))];

  it('detecta sobreposição', () => {
    expect(hasOverlap(existing, { clock_in: d(10, 11), clock_out: d(10, 13) })).toBe(true);
  });
  it('encostado (fim = início) não sobrepõe', () => {
    expect(hasOverlap(existing, { clock_in: d(10, 12), clock_out: d(10, 13) })).toBe(false);
  });
  it('ignora o próprio registro em edição (mesmo id)', () => {
    expect(hasOverlap(existing, { id: existing[0].id, clock_in: d(10, 9), clock_out: d(10, 13) })).toBe(false);
  });
  it('ponto aberto existente conta como aberto até +∞', () => {
    const open = [entry(d(10, 8), null)];
    expect(hasOverlap(open, { clock_in: d(12, 8), clock_out: d(12, 9) })).toBe(true);
  });
  it('candidato aberto (sem saída) sobrepõe tudo depois da entrada', () => {
    expect(hasOverlap(existing, { clock_in: d(10, 7), clock_out: null })).toBe(true);
  });
});
