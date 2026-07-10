import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';

export interface Location {
  id: string;
  name: string;
  address: string | null;
  clinic_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationInsert {
  name: string;
  address?: string | null;
}

export interface LocationUpdate {
  name?: string;
  address?: string | null;
}

// Espaço no início/fim ou duplicado no nome cria "locais" visualmente iguais
// mas distintos como chave de agrupamento (ex.: dois "Clínica Essência" no
// card Receita por Local).
function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export const locationsService = {
  async getAll(): Promise<Location[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(location: LocationInsert): Promise<Location> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('locations')
      .insert({ ...location, name: normalizeName(location.name), clinic_id: clinicId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, location: LocationUpdate): Promise<Location> {
    const payload = location.name != null
      ? { ...location, name: normalizeName(location.name) }
      : location;
    const { data, error } = await supabase
      .from('locations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};






