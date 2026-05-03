import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import type { CardMachine, CardMachineInsert, CardMachineUpdate, CardMachineWithDentist } from '@/types/cardMachine';

export const cardMachinesService = {
  async list(includeInactive = false): Promise<CardMachineWithDentist[]> {
    const { clinicId } = await getClinicContext();

    let query = supabase
      .from('card_machines')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    const machines = (data || []) as CardMachine[];
    const dentistIds = [...new Set(machines.map(m => m.dentist_id).filter(Boolean))] as string[];

    let nameMap: Record<string, string> = {};
    if (dentistIds.length > 0) {
      const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: dentistIds });
      if (profiles) {
        nameMap = (profiles as any[]).reduce((acc, p) => {
          acc[p.id] = p.full_name || p.email;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    return machines.map(m => ({
      ...m,
      dentist_name: m.dentist_id ? (nameMap[m.dentist_id] || null) : null,
    }));
  },

  async create(input: Omit<CardMachineInsert, 'clinic_id'>): Promise<CardMachine> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase
      .from('card_machines')
      .insert({
        clinic_id: clinicId,
        name: input.name,
        dentist_id: input.dentist_id || null,
        active: input.active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CardMachine;
  },

  async update(id: string, updates: CardMachineUpdate): Promise<void> {
    const { error } = await supabase
      .from('card_machines')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('card_machines')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
