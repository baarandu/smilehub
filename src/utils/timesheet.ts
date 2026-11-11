import { addDays, differenceInMinutes, isSameDay, startOfDay, startOfWeek } from 'date-fns';

export interface TimeEntry {
  id: string;
  clinic_id: string;
  user_id: string;
  clock_in: string; // ISO
  clock_out: string | null; // ISO; null = ponto aberto
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DaySummary {
  date: Date;
  minutes: number;
  entries: TimeEntry[];
}

export interface WeekSummary {
  days: DaySummary[]; // sempre 7, seg→dom
  totalMinutes: number;
  overtimeMinutes: number;
  openStaleEntries: TimeEntry[]; // abertos de dia anterior a `now` — não somam
}

/** Ponto aberto iniciado em dia anterior a `now` — não soma e só o admin fecha. */
export function isStaleOpen(e: TimeEntry, now: Date): boolean {
  return !e.clock_out && !isSameDay(new Date(e.clock_in), now);
}

/** Segunda-feira 00:00 (horário local) da semana de `d`. */
export function getWeekStart(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/**
 * Agrega registros de uma semana. Cada registro conta inteiro no dia local do
 * clock_in. Ponto aberto de hoje conta até `now`; de dia anterior, não soma.
 */
export function summarizeWeek(
  entries: TimeEntry[],
  weekStart: Date,
  limitHours: number,
  now: Date,
): WeekSummary {
  const start = startOfDay(weekStart);
  const days: DaySummary[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(start, i),
    minutes: 0,
    entries: [],
  }));
  const openStaleEntries: TimeEntry[] = [];

  const sorted = [...entries].sort((a, b) => a.clock_in.localeCompare(b.clock_in));
  for (const e of sorted) {
    const inAt = new Date(e.clock_in);
    const day = days.find(d => isSameDay(d.date, inAt));
    if (!day) continue;
    day.entries.push(e);

    if (e.clock_out) {
      day.minutes += differenceInMinutes(new Date(e.clock_out), inAt);
    } else if (isStaleOpen(e, now)) {
      openStaleEntries.push(e);
    } else {
      day.minutes += Math.max(0, differenceInMinutes(now, inAt));
    }
  }

  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  const overtimeMinutes = Math.max(0, totalMinutes - Math.round(limitHours * 60));
  return { days, totalMinutes, overtimeMinutes, openStaleEntries };
}

/** 2790 → "46h30" */
export function formatMinutes(min: number): string {
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** true se o candidato se sobrepõe a algum registro (exceto ele mesmo). Aberto = até +∞. */
export function hasOverlap(
  entries: TimeEntry[],
  candidate: { id?: string; clock_in: Date; clock_out: Date | null },
): boolean {
  const cIn = candidate.clock_in.getTime();
  const cOut = candidate.clock_out ? candidate.clock_out.getTime() : Infinity;
  return entries.some(e => {
    if (candidate.id && e.id === candidate.id) return false;
    const eIn = new Date(e.clock_in).getTime();
    const eOut = e.clock_out ? new Date(e.clock_out).getTime() : Infinity;
    return cIn < eOut && eIn < cOut;
  });
}
