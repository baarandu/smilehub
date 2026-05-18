import { supabase } from '../lib/supabase';
import { resolveActiveClinicId } from '../lib/selectedClinic';
import type {
  CardMachine,
  CardMachineInsert,
  CardMachineUpdate,
  CardMachineWithDentist,
} from '../types/cardMachine';

export const cardMachinesService = {
  async list(includeInactive = false): Promise<CardMachineWithDentist[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const clinicId = await resolveActiveClinicId(user.id);
    if (!clinicId) return [];

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

    const machines = (data || []) as unknown as CardMachine[];
    const dentistIds = [...new Set(machines.map(m => m.dentist_id).filter(Boolean))] as string[];

    let nameMap: Record<string, string> = {};
    if (dentistIds.length > 0) {
      const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: dentistIds } as any);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const clinicId = await resolveActiveClinicId(user.id);
    if (!clinicId) throw new Error('Clínica não encontrada');

    const { data, error } = await (supabase
      .from('card_machines') as any)
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
    const { error } = await (supabase
      .from('card_machines') as any)
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
