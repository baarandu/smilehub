import { supabase } from '@/lib/supabase';
import type { ChildAnamnesis, ChildAnamnesisInsert, ChildAnamnesisUpdate } from '@/types/childAnamnesis';

export const childAnamnesesService = {
  async getByPatient(patientId: string): Promise<ChildAnamnesis[]> {
    const { data, error } = await supabase
      .from('child_anamneses' as any)
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ChildAnamnesis[];
  },

  async create(anamnesis: ChildAnamnesisInsert): Promise<ChildAnamnesis> {
    const { data, error } = await supabase
      .from('child_anamneses' as any)
      .insert(anamnesis as any)
      .select()
      .single();

    if (error) throw error;
    return data as ChildAnamnesis;
  },

  async update(id: string, anamnesis: ChildAnamnesisUpdate): Promise<ChildAnamnesis> {
    const { data, error } = await supabase
      .from('child_anamneses' as any)
      .update(anamnesis as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ChildAnamnesis;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('child_anamneses' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
