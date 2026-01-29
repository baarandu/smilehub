import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

export type Reminder = {
    id: string;
    title: string;
    description?: string;
    is_active: boolean;
    due_date?: string;
    scheduled_date?: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
};

export type ReminderInsert = Omit<Reminder, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type ReminderUpdate = Partial<ReminderInsert>;

export const remindersService = {
    async getAll(): Promise<Reminder[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as Reminder[];
    },

    async getActiveCount(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count, error } = await supabase
            .from('reminders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true);

        if (error) throw error;
        return count || 0;
    },

    async getActive(): Promise<Reminder[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as Reminder[];
    },

    async create(reminder: ReminderInsert): Promise<Reminder> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('reminders')
            .insert({ ...reminder, user_id: user.id } as any)
            .select()
            .single();

        if (error) throw error;
        return data as Reminder;
    },

    async update(id: string, update: ReminderUpdate): Promise<Reminder> {
        const { data, error } = await supabase
            .from('reminders')
            .update(update as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Reminder;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
