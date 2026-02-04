// Behavior CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { AISecretaryBehavior } from './types';
import { DEFAULT_BEHAVIOR_SETTINGS } from './constants';

// Behavior Settings CRUD - returns null if table doesn't exist
export async function getBehaviorSettings(clinicId: string): Promise<AISecretaryBehavior | null> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_behavior')
            .select('*')
            .eq('clinic_id', clinicId)
            .single();

        if (error) {
            // PGRST116 = no rows, 42P01 = table doesn't exist
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                return null;
            }
            console.warn('Error fetching behavior settings:', error);
            return null;
        }

        return data as AISecretaryBehavior;
    } catch (error) {
        console.warn('Error in getBehaviorSettings:', error);
        return null;
    }
}

export async function saveBehaviorSettings(
    clinicId: string,
    settings: Partial<AISecretaryBehavior>
): Promise<AISecretaryBehavior | null> {
    try {
        const existing = await getBehaviorSettings(clinicId);

        if (existing) {
            const { data, error } = await (supabase
                .from('ai_secretary_behavior') as any)
                .update(settings)
                .eq('clinic_id', clinicId)
                .select()
                .single();

            if (error) throw error;
            return data as AISecretaryBehavior;
        } else {
            const { data, error } = await (supabase
                .from('ai_secretary_behavior') as any)
                .insert({
                    clinic_id: clinicId,
                    ...DEFAULT_BEHAVIOR_SETTINGS,
                    ...settings,
                })
                .select()
                .single();

            if (error) throw error;
            return data as AISecretaryBehavior;
        }
    } catch (error) {
        console.error('Error saving behavior settings:', error);
        return null;
    }
}

export async function updateBehaviorSetting(
    clinicId: string,
    field: keyof AISecretaryBehavior,
    value: any
): Promise<boolean> {
    try {
        const existing = await getBehaviorSettings(clinicId);

        if (!existing) {
            await saveBehaviorSettings(clinicId, { [field]: value } as Partial<AISecretaryBehavior>);
            return true;
        }

        const { error } = await (supabase
            .from('ai_secretary_behavior') as any)
            .update({ [field]: value })
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error(`Error updating behavior ${field}:`, error);
        return false;
    }
}

export async function updateBehaviorSettings(
    clinicId: string,
    updates: Partial<AISecretaryBehavior>
): Promise<boolean> {
    try {
        const existing = await getBehaviorSettings(clinicId);

        if (!existing) {
            await saveBehaviorSettings(clinicId, updates);
            return true;
        }

        const { error } = await (supabase
            .from('ai_secretary_behavior') as any)
            .update(updates)
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating behavior settings:', error);
        return false;
    }
}
