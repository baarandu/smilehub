import { supabase } from '@/lib/supabase';
import { toLocalDateString } from '@/utils/formatters';
import type { 
  Consultation, 
  ConsultationInsert, 
  ConsultationUpdate,
  ConsultationWithPatient,
  ReturnAlert 
} from '@/types/database';

export const consultationsService = {
  async getAll(clinicId?: string): Promise<ConsultationWithPatient[]> {
    let query = supabase
      .from('consultations')
      .select(`
        *,
        patients!inner (name, clinic_id)
      `)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (clinicId) {
      query = query.eq('patients.clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getByPatient(patientId: string): Promise<Consultation[]> {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
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
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('consultations')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id } as any)
      .eq('id', id);

    if (error) throw error;
  },

  async getReturnAlerts(clinicId?: string): Promise<ReturnAlert[]> {
    const today = toLocalDateString(new Date());

    let query = supabase
      .from('consultations')
      .select(`
        patient_id,
        suggested_return_date,
        patients:patients_secure!consultations_patient_id_fkey!inner (name, phone, clinic_id, patient_type, mother_name, father_name, legal_guardian)
      `)
      .is('deleted_at', null)
      .not('suggested_return_date', 'is', null)
      .gte('suggested_return_date', today)
      .order('suggested_return_date');

    if (clinicId) {
      query = query.eq('patients.clinic_id', clinicId);
    }

    const { data, error } = await query;

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
        days_until_return: diffDays,
        patient_type: item.patients.patient_type,
        mother_name: item.patients.mother_name,
        father_name: item.patients.father_name,
        legal_guardian: item.patients.legal_guardian,
      };
    });
    
    return alerts;
  },

  async countPendingReturns(clinicId?: string): Promise<number> {
    const today = toLocalDateString(new Date());

    let query = supabase
      .from('consultations')
      .select('*, patients!inner(clinic_id)', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('patients.deleted_at' as any, null)
      .not('suggested_return_date', 'is', null)
      .gte('suggested_return_date', today);

    if (clinicId) {
      query = query.eq('patients.clinic_id', clinicId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }
};






