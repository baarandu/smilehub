import { supabase } from '@/lib/supabase';
import type { Procedure, ProcedureInsert, ProcedureWithCreator } from '@/types/database';

export const proceduresService = {
  async getByPatient(patientId: string): Promise<ProcedureWithCreator[]> {
    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch creator names
    const procedures = (data || []) as any[];
    const creatorIds = [...new Set(procedures.map(p => p.created_by).filter(Boolean))];

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

    return procedures.map(p => ({
      ...p,
      created_by_name: p.created_by ? creatorNames[p.created_by] || null : null
    })) as ProcedureWithCreator[];
  },

  async create(procedure: ProcedureInsert): Promise<Procedure> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('procedures')
      .insert({ ...procedure, created_by: user?.id } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, procedure: Partial<ProcedureInsert>): Promise<Procedure> {
    const { data, error } = await (supabase
      .from('procedures') as any)
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






