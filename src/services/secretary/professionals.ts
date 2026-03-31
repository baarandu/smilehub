// Professionals CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { ClinicProfessional } from './types';
import { logger } from '@/utils/logger';

export async function getClinicProfessionals(clinicId: string): Promise<ClinicProfessional[]> {
    try {
        const { data, error } = await supabase
            .from('clinic_professionals')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name', { ascending: true });

        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }
        return (data || []) as ClinicProfessional[];
    } catch (error) {
        logger.error('Error fetching professionals:', error);
        return [];
    }
}

export async function addClinicProfessional(
    clinicId: string,
    professional: Omit<ClinicProfessional, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>
): Promise<ClinicProfessional | null> {
    try {
        const { data, error } = await (supabase
            .from('clinic_professionals') as any)
            .insert({
                clinic_id: clinicId,
                ...professional,
            })
            .select()
            .single();

        if (error) throw error;
        return data as ClinicProfessional;
    } catch (error) {
        logger.error('Error adding professional:', error);
        return null;
    }
}

export async function updateClinicProfessional(
    id: string,
    updates: Partial<Omit<ClinicProfessional, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('clinic_professionals') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        logger.error('Error updating professional:', error);
        return false;
    }
}

export async function deleteClinicProfessional(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('clinic_professionals')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        logger.error('Error deleting professional:', error);
        return false;
    }
}
