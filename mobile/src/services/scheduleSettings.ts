import { supabase } from '../lib/supabase';

export interface ScheduleSetting {
  id?: string;
  clinic_id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  location_id?: string | null;
  location_ids?: string | null;
  is_active: boolean;
  // Cycle support — round-tripped on mobile so saves don't flatten
  // multi-week schedules configured on web.
  week_index?: number;
  cycle_length?: number;
}

export interface ProfessionalScheduleCycle {
  clinic_id: string;
  professional_id: string;
  cycle_start_date: string;
  cycle_length: number;
}

const table = () => (supabase as any).from('schedule_settings');
const cycleTable = () => (supabase as any).from('professional_schedule_cycle');

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

  async upsert(clinicId: string, professionalId: string, settings: Omit<ScheduleSetting, 'id' | 'clinic_id' | 'professional_id'>[]): Promise<void> {
    const { error: deleteError } = await table()
      .delete()
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId);

    if (deleteError) throw deleteError;

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
      const { error: insertError } = await table().insert(toInsert);
      if (insertError) throw insertError;
    }
  },

  async getCycle(clinicId: string, professionalId: string): Promise<ProfessionalScheduleCycle | null> {
    const { data, error } = await cycleTable()
      .select('clinic_id, professional_id, cycle_start_date, cycle_length')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .maybeSingle();
    if (error) throw error;
    return (data as ProfessionalScheduleCycle) || null;
  },

  async getDentists(clinicId: string): Promise<{ id: string; name: string; specialty: string }[]> {
    const { data, error } = await (supabase.from('clinic_professionals') as any)
      .select('id, name, specialty')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
