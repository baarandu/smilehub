import { supabase } from '@/lib/supabase';
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
  AppointmentWithPatient
} from '@/types/database';

export const appointmentsService = {
  async getAll(): Promise<AppointmentWithPatient[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone)
      `)
      .order('date')
      .order('time');

    if (error) throw error;
    return data || [];
  },

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

  async getByPatient(patientId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(appointment: AppointmentInsert): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create appointment');
    return data;
  },

  async update(id: string, appointment: AppointmentUpdate): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update(appointment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update appointment');
    return data;
  },

  async updateStatus(id: string, status: Appointment['status']): Promise<Appointment> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
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

  async getByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    return data || [];
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

  async search(query: string): Promise<AppointmentWithPatient[]> {
    // Search by patient name using inner join filter
    const { data: byPatient, error: error1 } = await supabase
      .from('appointments')
      .select(`
        *,
        patients!inner (name, phone)
      `)
      .ilike('patients.name', `%${query}%`)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(15);

    if (error1) throw error1;

    // Search by procedure name
    const { data: byProcedure, error: error2 } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone)
      `)
      .ilike('procedure_name', `%${query}%`)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(10);

    if (error2) throw error2;

    // Merge and deduplicate results
    const merged = [...(byPatient || []), ...(byProcedure || [])];
    const uniqueIds = new Set<string>();
    const unique = merged.filter(item => {
      if (uniqueIds.has(item.id)) return false;
      uniqueIds.add(item.id);
      return true;
    });

    // Sort by date descending and limit to 20
    return unique
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.time || '').localeCompare(a.time || '');
      })
      .slice(0, 20);
  }
};

