// Blocked Numbers CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { BlockedNumber } from './types';

export async function getBlockedNumbers(clinicId: string): Promise<BlockedNumber[]> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_blocked_numbers')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('blocked_at', { ascending: false });

        if (error) throw error;
        return (data || []) as BlockedNumber[];
    } catch (error) {
        console.error('Error fetching blocked numbers:', error);
        return [];
    }
}

export async function addBlockedNumber(
    clinicId: string,
    phoneNumber: string,
    reason?: string
): Promise<BlockedNumber | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await (supabase
            .from('ai_secretary_blocked_numbers') as any)
            .insert({
                clinic_id: clinicId,
                phone_number: phoneNumber,
                reason,
                blocked_by: user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data as BlockedNumber;
    } catch (error) {
        console.error('Error adding blocked number:', error);
        return null;
    }
}

export async function removeBlockedNumber(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_secretary_blocked_numbers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error removing blocked number:', error);
        return false;
    }
}
