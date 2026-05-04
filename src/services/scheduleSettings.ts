import { supabase } from '@/lib/supabase';

export interface ScheduleSetting {
  id?: string;
  clinic_id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  location_id?: string | null;
  location_ids?: string | null; // comma-separated location IDs
  is_active: boolean;
  // Cycle support: row applies on weeks where ((date - cycle_start) / 7) % cycle_length === week_index
  week_index?: number;
  cycle_length?: number;
}

export interface ProfessionalScheduleCycle {
  clinic_id: string;
  professional_id: string;
  cycle_start_date: string; // 'YYYY-MM-DD'
  cycle_length: number;
}

// Cast `supabase as any` because schedule_settings and professional_schedule_cycle
// are not in the auto-generated database.ts types (the file pre-dates these tables).
const table = () => (supabase as any).from('schedule_settings');
const cycleTable = () => (supabase as any).from('professional_schedule_cycle');

/**
 * Compute which week of the cycle a given date falls in.
 * Uses noon UTC for both dates so DST transitions never shift the day count.
 * Handles dates before cycle_start (negative diffs) safely via the
 * `((x % n) + n) % n` idiom.
 */
export function computeWeekIndex(
  target: Date | string,
  cycleStart: Date | string,
  cycleLength: number,
): number {
  if (cycleLength <= 1) return 0;

  const toUtcNoon = (d: Date | string): number => {
    const s = typeof d === 'string' ? d : d.toISOString().slice(0, 10);
    return Date.parse(`${s}T12:00:00Z`);
  };

  const targetMs = toUtcNoon(target);
  const startMs = toUtcNoon(cycleStart);
  const diffDays = Math.floor((targetMs - startMs) / 86_400_000);
  const weekDiff = Math.floor(diffDays / 7);
  return ((weekDiff % cycleLength) + cycleLength) % cycleLength;
}

export const scheduleSettingsService = {
  async getByClinic(clinicId: string): Promise<ScheduleSetting[]> {
    const { data, error } = await table()
      .select('*')
      .eq('clinic_id', clinicId)
      .order('professional_id')
      .order('day_of_week');

    if (error) throw error;
    return data || [];
  },

  async getByProfessional(clinicId: string, professionalId: string): Promise<ScheduleSetting[]> {
    const { data, error } = await table()
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    return data || [];
  },

  async upsert(
    clinicId: string,
    professionalId: string,
    settings: Omit<ScheduleSetting, 'id' | 'clinic_id' | 'professional_id'>[],
  ): Promise<void> {
    // Delete existing settings for this professional
    const { error: deleteError } = await table()
      .delete()
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId);

    if (deleteError) throw deleteError;

    // Insert new settings (only active slots)
    const toInsert = settings
      .filter(s => s.is_active)
      .map(s => ({
        clinic_id: clinicId,
        professional_id: professionalId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        interval_minutes: s.interval_minutes,
        location_id: s.location_id || null,
        location_ids: s.location_ids || null,
        is_active: true,
        week_index: s.week_index ?? 0,
        cycle_length: s.cycle_length ?? 1,
      }));

    if (toInsert.length > 0) {
      const { error: insertError } = await table()
        .insert(toInsert);

      if (insertError) throw insertError;
    }
  },

  /**
   * Read cycle metadata for a (clinic, professional). Returns null when no
   * row exists — caller should treat that as cycle_length=1 (weekly).
   */
  async getCycle(
    clinicId: string,
    professionalId: string,
  ): Promise<ProfessionalScheduleCycle | null> {
    const { data, error } = await cycleTable()
      .select('clinic_id, professional_id, cycle_start_date, cycle_length')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (error) throw error;
    return (data as ProfessionalScheduleCycle) || null;
  },

  /**
   * Upsert cycle metadata. When cycle_length === 1 the row is deleted
   * instead, keeping the table sparse.
   */
  async upsertCycle(
    clinicId: string,
    professionalId: string,
    payload: { cycle_start_date: string; cycle_length: number },
  ): Promise<void> {
    if (payload.cycle_length <= 1) {
      const { error } = await cycleTable()
        .delete()
        .eq('clinic_id', clinicId)
        .eq('professional_id', professionalId);
      if (error) throw error;
      return;
    }

    const { error } = await cycleTable().upsert({
      clinic_id: clinicId,
      professional_id: professionalId,
      cycle_start_date: payload.cycle_start_date,
      cycle_length: payload.cycle_length,
    }, { onConflict: 'clinic_id,professional_id' });
    if (error) throw error;
  },

  /**
   * Save schedule rows AND cycle metadata atomically (from the caller's
   * perspective — two sequential awaits, but both succeed or the second
   * surfaces the error to the UI).
   */
  async upsertWithCycle(
    clinicId: string,
    professionalId: string,
    settings: Omit<ScheduleSetting, 'id' | 'clinic_id' | 'professional_id'>[],
    cycle: { cycle_start_date: string; cycle_length: number },
  ): Promise<void> {
    await this.upsert(clinicId, professionalId, settings);
    await this.upsertCycle(clinicId, professionalId, cycle);
  },

  /**
   * Resolve which schedule_settings rows apply on a specific date.
   * Encapsulates the day_of_week + week_index match so consumers don't
   * re-implement the date math.
   */
  async getSettingsForDate(
    clinicId: string,
    professionalId: string,
    date: Date | string,
  ): Promise<ScheduleSetting[]> {
    const [rows, cycle] = await Promise.all([
      this.getByProfessional(clinicId, professionalId),
      this.getCycle(clinicId, professionalId),
    ]);

    const cycleLength = cycle?.cycle_length ?? 1;
    const cycleStart = cycle?.cycle_start_date ?? (typeof date === 'string' ? date : date.toISOString().slice(0, 10));
    const weekIndex = computeWeekIndex(date, cycleStart, cycleLength);

    const dayOfWeek = typeof date === 'string'
      ? new Date(`${date}T12:00:00Z`).getUTCDay()
      : date.getDay();

    return rows.filter((r: ScheduleSetting) =>
      r.day_of_week === dayOfWeek &&
      r.is_active &&
      (r.week_index ?? 0) === weekIndex,
    );
  },

  async getDentists(clinicId: string): Promise<{ id: string; name: string }[]> {
    // Fetch clinic_users with 'dentist' in roles array
    const { data: clinicUsers, error: cuError } = await supabase
      .from('clinic_users')
      .select('user_id, roles')
      .eq('clinic_id', clinicId);

    if (cuError) throw cuError;

    const dentistUserIds = (clinicUsers || [])
      .filter((cu: any) => (cu.roles || []).includes('dentist'))
      .map((cu: any) => cu.user_id);

    if (dentistUserIds.length === 0) return [];

    // Fetch profile names via RPC
    const { data: profiles, error: pError } = await supabase
      .rpc('get_profiles_for_users', { user_ids: dentistUserIds });

    if (pError) throw pError;

    return (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.full_name || p.email || 'Sem nome',
    }));
  },
};
