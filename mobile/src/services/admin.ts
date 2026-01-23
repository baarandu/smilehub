import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
type SubscriptionPlanInsert = Database['public']['Tables']['subscription_plans']['Insert'];
type SubscriptionPlanUpdate = Database['public']['Tables']['subscription_plans']['Update'];

export const adminService = {
    // Plans Management
    async getPlans() {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createPlan(plan: SubscriptionPlanInsert) {
        // @ts-expect-error - supabase types mismatch with manual Database definition
        const { data, error } = await supabase
            .from('subscription_plans')
            .insert(plan)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePlan(id: string, updates: SubscriptionPlanUpdate) {
        // @ts-expect-error - supabase types mismatch with manual Database definition
        const { data, error } = await supabase
            .from('subscription_plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async togglePlanActive(id: string, isActive: boolean) {
        // @ts-expect-error - supabase types mismatch with manual Database definition
        const { data, error } = await supabase
            .from('subscription_plans')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePlan(id: string) {
        // Hard delete is usually not recommended for plans with subscriptions, 
        // but for now we follow standard CRUD. RLS might block if referred.
        const { error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
