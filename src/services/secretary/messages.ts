// Custom Messages CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { CustomMessage } from './types';
import { PREDEFINED_MESSAGE_TYPES } from './constants';

export async function getCustomMessages(clinicId: string): Promise<CustomMessage[]> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_custom_messages')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('is_predefined', { ascending: false })
            .order('title', { ascending: true });

        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return [];
            }
            console.warn('Error fetching custom messages:', error);
            return [];
        }

        return (data || []) as CustomMessage[];
    } catch (error) {
        console.warn('Error in getCustomMessages:', error);
        return [];
    }
}

export async function addCustomMessage(
    clinicId: string,
    messageKey: string,
    title: string,
    message: string,
    isPredefined: boolean = false
): Promise<CustomMessage | null> {
    try {
        const { data, error } = await (supabase
            .from('ai_secretary_custom_messages') as any)
            .insert({
                clinic_id: clinicId,
                message_key: messageKey,
                title: title,
                message: message,
                is_active: true,
                is_predefined: isPredefined,
            })
            .select()
            .single();

        if (error) throw error;
        return data as CustomMessage;
    } catch (error) {
        console.error('Error adding custom message:', error);
        return null;
    }
}

export async function updateCustomMessage(
    id: string,
    updates: Partial<Pick<CustomMessage, 'title' | 'message' | 'is_active'>>
): Promise<boolean> {
    try {
        const { error } = await (supabase
            .from('ai_secretary_custom_messages') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating custom message:', error);
        return false;
    }
}

export async function deleteCustomMessage(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_secretary_custom_messages')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting custom message:', error);
        return false;
    }
}

export async function initializePredefinedMessages(clinicId: string): Promise<boolean> {
    try {
        const existing = await getCustomMessages(clinicId);
        if (existing.length > 0) {
            return true;
        }

        const messages = PREDEFINED_MESSAGE_TYPES.map(type => ({
            clinic_id: clinicId,
            message_key: type.key,
            title: type.title,
            message: type.defaultMessage,
            is_active: false,
            is_predefined: true,
        }));

        const { error } = await (supabase
            .from('ai_secretary_custom_messages') as any)
            .insert(messages);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error initializing predefined messages:', error);
        return false;
    }
}
