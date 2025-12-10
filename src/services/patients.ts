import { supabase } from '@/lib/supabase';
import type { Patient, PatientInsert, PatientUpdate } from '@/types/database';

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

  async search(query: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);
    
    if (error) throw error;
    return data || [];
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

  async update(id: string, patient: PatientUpdate): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update(patient)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  }
};

