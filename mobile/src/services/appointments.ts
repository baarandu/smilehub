import { supabase } from '../lib/supabase';
import type { AppointmentWithPatient, Appointment } from '../types/database';

interface AppointmentInsert {
  patient_id: string;
  date: string;
  time: string;
  status: string;
  location?: string | null;
  notes?: string | null;
}

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
  },

  async getDatesWithAppointments(startDate: string, endDate: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) throw error;
    const uniqueDates = [...new Set(data?.map(a => a.date) || [])];
    return uniqueDates;
  },

  async create(appointment: AppointmentInsert): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByPatient(patientId: string): Promise<AppointmentWithPatient[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone)
      `)
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

