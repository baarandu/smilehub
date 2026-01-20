import { supabase } from "@/lib/supabase";
import { SubscriptionPlan, SubscriptionPlanInsert, SubscriptionPlanUpdate } from "@/types/database";

export const plansService = {
    async getAll() {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data as SubscriptionPlan[];
    },

    async getActive() {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data as SubscriptionPlan[];
    },

    async create(plan: SubscriptionPlanInsert) {
        const { data, error } = await supabase
            .from('subscription_plans')
            .insert(plan)
            .select()
            .single();

        if (error) throw error;
        return data as SubscriptionPlan;
    },

    async update(id: string, plan: SubscriptionPlanUpdate) {
        const { data, error } = await supabase
            .from('subscription_plans')
            .update(plan)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as SubscriptionPlan;
    },

    async toggleActive(id: string, isActive: boolean) {
        return this.update(id, { is_active: isActive });
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
