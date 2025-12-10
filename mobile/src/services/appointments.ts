import { supabase } from '../lib/supabase';
import type { AppointmentWithPatient } from '../types/database';

export const appointmentsService = {
  async getByDate(date: string): Promise<AppointmentWithPatient[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone)
      `)
      .eq('date', date)
      .order('time');
    
    if (error) throw error;
    return data || [];
  },

  async getToday(): Promise<AppointmentWithPatient[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  },

  async countToday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);
    
    if (error) throw error;
    return count || 0;
  }
};

