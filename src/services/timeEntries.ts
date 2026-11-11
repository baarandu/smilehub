import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TimeEntry } from '@/utils/timesheet';

export type { TimeEntry };

// time_entries / weekly_hours_limit / RPCs de ponto ainda não estão em src/types/database.ts
// (desatualizado); mesmo padrão de services/scheduleSettings.ts.
const db = supabase as unknown as SupabaseClient;

const OPEN_ENTRY_CONFLICT = 'Já existe um ponto aberto para esta funcionária';

/** Traduz erros do Postgres para mensagens em PT. */
function toError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error(OPEN_ENTRY_CONFLICT);
  if (error.code === '23514') return new Error('Saída deve ser depois da entrada');
  return new Error(error.message);
}

export const timeEntriesService = {
  /** Registros da funcionária com clock_in em [from, to). */
  async listRange(clinicId: string, userId: string, from: Date, to: Date): Promise<TimeEntry[]> {
    const { data, error } = await db
      .from('time_entries')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('user_id', userId)
      .gte('clock_in', from.toISOString())
      .lt('clock_in', to.toISOString())
      .order('clock_in', { ascending: true });
    if (error) throw toError(error);
    return (data || []) as TimeEntry[];
  },

  async getOpen(clinicId: string, userId: string): Promise<TimeEntry | null> {
    const { data, error } = await db
      .from('time_entries')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('user_id', userId)
      .is('clock_out', null)
      .maybeSingle();
    if (error) throw toError(error);
    return (data as TimeEntry) || null;
  },

  async clockIn(clinicId: string): Promise<TimeEntry> {
    const { data, error } = await db.rpc('clock_in', { p_clinic_id: clinicId });
    if (error) throw toError(error);
    return data as TimeEntry;
  },

  async clockOut(clinicId: string): Promise<TimeEntry> {
    const { data, error } = await db.rpc('clock_out', { p_clinic_id: clinicId });
    if (error) throw toError(error);
    return data as TimeEntry;
  },

  async create(input: {
    clinic_id: string;
    user_id: string;
    clock_in: string;
    clock_out: string | null;
  }): Promise<TimeEntry> {
    // created_by/updated_by são preenchidos pelo trigger no banco
    const { data, error } = await db
      .from('time_entries')
      .insert(input)
      .select()
      .single();
    if (error) throw toError(error);
    return data as TimeEntry;
  },

  async update(id: string, patch: { clock_in: string; clock_out: string | null }): Promise<TimeEntry> {
    const { data, error } = await db
      .from('time_entries')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw toError(error);
    return data as TimeEntry;
  },

  async remove(id: string): Promise<void> {
    const { error } = await db.from('time_entries').delete().eq('id', id);
    if (error) throw toError(error);
  },

  async getWeeklyLimit(clinicId: string): Promise<number> {
    const { data, error } = await db
      .from('clinics')
      .select('weekly_hours_limit')
      .eq('id', clinicId)
      .single();
    if (error) throw toError(error);
    const value = Number((data as { weekly_hours_limit: number | string | null })?.weekly_hours_limit);
    return Number.isFinite(value) && value > 0 ? value : 44;
  },

  async setWeeklyLimit(clinicId: string, hours: number): Promise<void> {
    const { error } = await db.rpc('set_weekly_hours_limit', {
      p_clinic_id: clinicId,
      p_hours: hours,
    });
    if (error) throw toError(error);
  },
};
