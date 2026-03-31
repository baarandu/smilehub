// Schedule CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { ScheduleEntry } from './types';
import { logger } from '@/utils/logger';

export async function getScheduleEntries(clinicId: string): Promise<ScheduleEntry[]> {
    try {
        // Try with location join first
        const { data, error } = await supabase
            .from('ai_secretary_schedule')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }

        return (data || []).map((entry: any) => ({
            ...entry,
            location_name: null,
        }));
    } catch (error) {
        logger.error('Error fetching schedule:', error);
        return [];
    }
}

export async function addScheduleEntry(
    clinicId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    locationId?: string | null,
    professionalIds?: string[] | null
): Promise<ScheduleEntry | null> {
    try {
        const payload: Record<string, any> = {
            clinic_id: clinicId,
            day_of_week: dayOfWeek,
            location_id: locationId || null,
            start_time: startTime,
            end_time: endTime,
            is_active: true,
        };
        if (professionalIds && professionalIds.length > 0) {
            payload.professional_ids = professionalIds;
        }

        const { data, error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as ScheduleEntry;
    } catch (error) {
        logger.error('Error adding schedule entry:', error);
        return null;
    }
}

export async function updateScheduleEntry(
    id: string,
    updates: {
        day_of_week?: number;
        start_time?: string;
        end_time?: string;
        location_id?: string | null;
        professional_ids?: string[] | null;
    }
): Promise<ScheduleEntry | null> {
    try {
        const { data, error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as ScheduleEntry;
    } catch (error) {
        logger.error('Error updating schedule entry:', error);
        return null;
    }
}

export async function deleteScheduleEntry(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ai_secretary_schedule')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        logger.error('Error deleting schedule entry:', error);
        return false;
    }
}

export async function createDefaultSchedule(clinicId: string): Promise<boolean> {
    try {
        const entries: Record<string, any>[] = [];
        for (let day = 1; day <= 5; day++) {
            entries.push({
                clinic_id: clinicId,
                day_of_week: day,
                location_id: null,
                start_time: '08:00',
                end_time: '18:00',
                is_active: true,
            });
        }

        const { error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .insert(entries);

        if (error) throw error;
        return true;
    } catch (error) {
        logger.error('Error creating default schedule:', error);
        return false;
    }
}
