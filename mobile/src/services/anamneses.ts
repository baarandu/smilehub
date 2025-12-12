import { supabase } from '../lib/supabase';
import type { Anamnese, AnamneseInsert } from '../types/database';

export const anamnesesService = {
    async getByPatient(patientId: string): Promise<Anamnese[]> {
        const { data, error } = await supabase
            .from('anamneses')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async create(anamnese: AnamneseInsert): Promise<Anamnese> {
        const { data, error } = await supabase
            .from('anamneses')
            .insert(anamnese)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, anamnese: Partial<AnamneseInsert>): Promise<Anamnese> {
        const { data, error } = await supabase
            .from('anamneses')
            .update(anamnese)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('anamneses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
