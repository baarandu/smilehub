import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import type {
  OrthodonticEvolution,
  OrthodonticEvolutionInsert,
  OrthodonticEvolutionUpdate,
  OrthodonticEvolutionWithCreator,
} from '@/types/orthodonticEvolution';

export const orthodonticEvolutionService = {
  async getByPatient(patientId: string): Promise<OrthodonticEvolutionWithCreator[]> {
    const { data, error } = await supabase
      .from('orthodontic_evolution')
      .select('*')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const entries = (data || []) as OrthodonticEvolution[];
    const creatorIds = [...new Set(entries.map(e => e.created_by).filter(Boolean))];

    let creatorNames: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: creatorIds });
      if (profiles) {
        creatorNames = profiles.reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || p.email;
          return acc;
        }, {});
      }
    }

    return entries.map(e => ({
      ...e,
      created_by_name: e.created_by ? creatorNames[e.created_by] || null : null,
    }));
  },

  async create(entry: OrthodonticEvolutionInsert): Promise<OrthodonticEvolution> {
    const { userId, clinicId } = await getClinicContext();

    const { data, error } = await supabase
      .from('orthodontic_evolution')
      .insert({ ...entry, created_by: userId, clinic_id: clinicId })
      .select()
      .single();

    if (error) throw error;
    return data as OrthodonticEvolution;
  },

  async update(id: string, entry: OrthodonticEvolutionUpdate): Promise<OrthodonticEvolution> {
    const { data, error } = await supabase
      .from('orthodontic_evolution')
      .update(entry)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as OrthodonticEvolution;
  },

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('orthodontic_evolution')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', id);

    if (error) throw error;
  },
};
