// Schedule CRUD for AI Secretary

import { supabase } from '@/lib/supabase';
import type { ScheduleEntry } from './types';

export async function getScheduleEntries(clinicId: string): Promise<ScheduleEntry[]> {
    try {
        const { data, error } = await supabase
            .from('ai_secretary_schedule')
            .select(`
                *,
                locations:location_id (name)
            `)
            .eq('clinic_id', clinicId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        return (data || []).map((entry: any) => ({
            ...entry,
            location_name: entry.locations?.name || null,
        }));
    } catch (error) {
        console.error('Error fetching schedule:', error);
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
        const { data, error } = await (supabase
            .from('ai_secretary_schedule') as any)
            .insert({
                clinic_id: clinicId,
                day_of_week: dayOfWeek,
                location_id: locationId || null,
                professional_ids: professionalIds || null,
                start_time: startTime,
                end_time: endTime,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;
        return data as ScheduleEntry;
    } catch (error) {
        console.error('Error adding schedule entry:', error);
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
        console.error('Error updating schedule entry:', error);
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
        console.error('Error deleting schedule entry:', error);
        return false;
    }
}

export async function createDefaultSchedule(clinicId: string): Promise<boolean> {
    try {
        const entries = [];
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
        console.error('Error creating default schedule:', error);
        return false;
    }
}
