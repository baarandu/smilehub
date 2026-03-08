import { supabase } from '../lib/supabase';
import type { AppointmentWithPatient, Appointment, AppointmentInsert } from '../types/database';

export const appointmentsService = {
  async getByDate(date: string, clinicId?: string): Promise<AppointmentWithPatient[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone, patient_type, mother_name, father_name, legal_guardian)
      `)
      .eq('date', date)
      .order('time');

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as unknown as AppointmentWithPatient[]) || [];
  },

  async getToday(clinicId?: string): Promise<AppointmentWithPatient[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today, clinicId);
  },

  async getTomorrow(clinicId?: string): Promise<AppointmentWithPatient[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return this.getByDate(tomorrowStr, clinicId);
  },

  async countToday(clinicId?: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  },

  async getDatesWithAppointments(startDate: string, endDate: string, clinicId?: string): Promise<string[]> {
    let query = supabase
      .from('appointments')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    const uniqueDates = [...new Set((data as any[])?.map(a => a.date) || [])];
    return uniqueDates;
  },

  async create(appointment: AppointmentInsert): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
    return data as Appointment;
  },

  async getByPatient(patientId: string): Promise<AppointmentWithPatient[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone, patient_type, mother_name, father_name, legal_guardian)
      `)
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) throw error;
    return (data as unknown as AppointmentWithPatient[]) || [];
  },

  async update(id: string, updates: Partial<AppointmentInsert>): Promise<Appointment> {
    const { data, error } = await (supabase
      .from('appointments') as any)
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
