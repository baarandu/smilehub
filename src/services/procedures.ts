import { supabase } from '@/lib/supabase';
import type { Procedure, ProcedureInsert } from '@/types/database';

export const proceduresService = {
  async getByPatient(patientId: string): Promise<Procedure[]> {
    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(procedure: ProcedureInsert): Promise<Procedure> {
    const { data, error } = await supabase
      .from('procedures')
      .insert(procedure)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, procedure: Partial<ProcedureInsert>): Promise<Procedure> {
    const { data, error } = await supabase
      .from('procedures')
      .update(procedure)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('procedures')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};


