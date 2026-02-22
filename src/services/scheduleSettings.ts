import { supabase } from '@/lib/supabase';

export interface ScheduleSetting {
  id?: string;
  clinic_id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
  is_active: boolean;
}

export const scheduleSettingsService = {
  async getByClinic(clinicId: string): Promise<ScheduleSetting[]> {
    const { data, error } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('professional_id')
      .order('day_of_week');

    if (error) throw error;
    return data || [];
  },

  async getByProfessional(clinicId: string, professionalId: string): Promise<ScheduleSetting[]> {
    const { data, error } = await supabase
      .from('schedule_settings')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    return data || [];
  },

  async upsert(clinicId: string, professionalId: string, settings: Omit<ScheduleSetting, 'id' | 'clinic_id' | 'professional_id'>[]): Promise<void> {
    // Delete existing settings for this professional
    const { error: deleteError } = await supabase
      .from('schedule_settings')
      .delete()
      .eq('clinic_id', clinicId)
      .eq('professional_id', professionalId);

    if (deleteError) throw deleteError;

    // Insert new settings (only active days)
    const toInsert = settings
      .filter(s => s.is_active)
      .map(s => ({
        clinic_id: clinicId,
        professional_id: professionalId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        interval_minutes: s.interval_minutes,
        is_active: true,
      }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('schedule_settings')
        .insert(toInsert);

      if (insertError) throw insertError;
    }
  },

  async getDentists(clinicId: string): Promise<{ id: string; name: string; specialty: string }[]> {
    const { data, error } = await supabase
      .from('clinic_professionals')
      .select('id, name, specialty')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },
};
