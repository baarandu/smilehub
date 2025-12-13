import { supabase } from '@/lib/supabase';
import type { 
  Consultation, 
  ConsultationInsert, 
  ConsultationUpdate,
  ConsultationWithPatient,
  ReturnAlert 
} from '@/types/database';

export const consultationsService = {
  async getAll(): Promise<ConsultationWithPatient[]> {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        patients (name)
      `)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByPatient(patientId: string): Promise<Consultation[]> {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ConsultationWithPatient | null> {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        patients (name)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(consultation: ConsultationInsert): Promise<Consultation> {
    const { data, error } = await supabase
      .from('consultations')
      .insert(consultation)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, consultation: ConsultationUpdate): Promise<Consultation> {
    const { data, error } = await supabase
      .from('consultations')
      .update(consultation)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('consultations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getReturnAlerts(): Promise<ReturnAlert[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        patient_id,
        suggested_return_date,
        patients (name, phone)
      `)
      .not('suggested_return_date', 'is', null)
      .gte('suggested_return_date', today)
      .order('suggested_return_date');
    
    if (error) throw error;
    
    // Transform and calculate days until return
    const alerts: ReturnAlert[] = (data || []).map((item: any) => {
      const returnDate = new Date(item.suggested_return_date);
      const todayDate = new Date(today);
      const diffTime = returnDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        patient_id: item.patient_id,
        patient_name: item.patients.name,
        phone: item.patients.phone,
        suggested_return_date: item.suggested_return_date,
        days_until_return: diffDays
      };
    });
    
    return alerts;
  },

  async countPendingReturns(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .not('suggested_return_date', 'is', null)
      .gte('suggested_return_date', today);
    
    if (error) throw error;
    return count || 0;
  }
};


