import { supabase } from '@/lib/supabase';
import type { Anamnese, AnamneseInsert, AnamneseUpdate } from '@/types/database';

export const anamnesesService = {
  async getByPatient(patientId: string): Promise<Anamnese[]> {
    const { data, error } = await supabase
      .from('anamneses')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Anamnese[];
  },

  async create(anamnese: AnamneseInsert): Promise<Anamnese> {
    const { data, error } = await supabase
      .from('anamneses')
      // @ts-ignore - Supabase type generation issue with anamneses table
      .insert(anamnese)
      .select()
      .single();
    
    if (error) throw error;
    return data as Anamnese;
  },

  async update(id: string, anamnese: AnamneseUpdate): Promise<Anamnese> {
    const { data, error } = await supabase
      .from('anamneses')
      // @ts-ignore - Supabase type generation issue with anamneses table
      .update(anamnese)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Anamnese;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('anamneses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

