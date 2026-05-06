import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';

export interface ClinicCustomTreatment {
  id: string;
  clinic_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const clinicCustomTreatmentsService = {
  async list(): Promise<ClinicCustomTreatment[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('clinic_custom_treatments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });
    if (error) throw error;
    return ((data as unknown) as ClinicCustomTreatment[]) || [];
  },

  async create(name: string): Promise<ClinicCustomTreatment> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome é obrigatório');
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('clinic_custom_treatments')
      .insert({ clinic_id: clinicId, name: trimmed })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('Já existe um tratamento com esse nome');
      throw error;
    }
    return (data as unknown) as ClinicCustomTreatment;
  },

  async update(id: string, name: string): Promise<ClinicCustomTreatment> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome é obrigatório');
    const { data, error } = await supabase
      .from('clinic_custom_treatments')
      .update({ name: trimmed })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('Já existe um tratamento com esse nome');
      throw error;
    }
    return (data as unknown) as ClinicCustomTreatment;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('clinic_custom_treatments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
