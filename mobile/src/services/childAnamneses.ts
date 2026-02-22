import { supabase } from '../lib/supabase';
import type { ChildAnamnesis, ChildAnamnesisInsert } from '../types/childAnamnesis';

export const childAnamnesesService = {
    async getByPatient(patientId: string): Promise<ChildAnamnesis[]> {
        const { data, error } = await supabase
            .from('child_anamneses')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as unknown as ChildAnamnesis[];
    },

    async create(anamnesis: ChildAnamnesisInsert): Promise<ChildAnamnesis> {
        const { data, error } = await (supabase
            .from('child_anamneses') as any)
            .insert(anamnesis)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, anamnesis: Partial<ChildAnamnesisInsert>): Promise<ChildAnamnesis> {
        const { data, error } = await (supabase
            .from('child_anamneses') as any)
            .update(anamnesis)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('child_anamneses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
