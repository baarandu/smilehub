import { supabase } from '@/lib/supabase';

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

async function getClinicId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();

  if (!clinicUser?.clinic_id) throw new Error('Clinic not found');
  return clinicUser.clinic_id;
}

export const locationsService = {
  async getAll(): Promise<Location[]> {
    const clinicId = await getClinicId();
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async create(location: LocationInsert): Promise<Location> {
    const clinicId = await getClinicId();
    const { data, error } = await supabase
      .from('locations')
      .insert({ ...location, clinic_id: clinicId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, location: LocationUpdate): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .update(location)
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






