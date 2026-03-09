import { supabase } from '@/lib/supabase';
import { toLocalDateString } from '@/utils/formatters';
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
  AppointmentWithPatient
} from '@/types/database';

export const appointmentsService = {
  async getAll(clinicId?: string): Promise<AppointmentWithPatient[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone, patient_type, mother_name, father_name, legal_guardian)
      `)
      .order('date')
      .order('time');

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query as { data: AppointmentWithPatient[] | null; error: any };

    if (error) throw error;
    return data || [];
  },

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

    const { data, error } = await query as { data: AppointmentWithPatient[] | null; error: any };

    if (error) throw error;
    return data || [];
  },

  async getToday(clinicId?: string): Promise<AppointmentWithPatient[]> {
    const today = toLocalDateString(new Date());
    return this.getByDate(today, clinicId);
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

  async countToday(clinicId?: string): Promise<number> {
    const today = toLocalDateString(new Date());
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

  async getByDateRange(startDate: string, endDate: string, clinicId?: string): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getDatesWithAppointments(startDate: string, endDate: string, clinicId?: string): Promise<string[]> {
    let query = supabase
      .from('appointments')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelled');

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    const uniqueDates = [...new Set(data?.map(a => a.date) || [])];
    return uniqueDates;
  },

  async search(query: string, clinicId?: string): Promise<AppointmentWithPatient[]> {
    // Search by patient name using inner join filter
    let q1 = supabase
      .from('appointments')
      .select(`
        *,
        patients!inner (name, phone, patient_type, mother_name, father_name, legal_guardian)
      `)
      .ilike('patients.name', `%${query.replace(/[%_\\]/g, '\\$&')}%`)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(15);

    if (clinicId) {
      q1 = q1.eq('clinic_id', clinicId);
    }

    const { data: byPatient, error: error1 } = await q1 as { data: AppointmentWithPatient[] | null; error: any };

    if (error1) throw error1;

    // Search by procedure name
    let q2 = supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone, patient_type, mother_name, father_name, legal_guardian)
      `)
      .ilike('procedure_name', `%${query.replace(/[%_\\]/g, '\\$&')}%`)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(10);

    if (clinicId) {
      q2 = q2.eq('clinic_id', clinicId);
    }

    const { data: byProcedure, error: error2 } = await q2 as { data: AppointmentWithPatient[] | null; error: any };

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
