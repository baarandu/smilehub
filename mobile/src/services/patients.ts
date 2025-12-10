import { supabase } from '../lib/supabase';
import type { Patient, PatientInsert } from '../types/database';

export const patientsService = {
  async getAll(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(patient: PatientInsert): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  }
};

