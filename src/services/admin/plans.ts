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
    },

    async getSubscriberCount(planId: string): Promise<number> {
        const { count, error } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', planId)
            .in('status', ['active', 'trialing', 'past_due']);

        if (error) throw error;
        return count || 0;
    },

    async migrateSubscribers(fromPlanId: string, toPlanId: string): Promise<number> {
        const { data, error } = await supabase
            .from('subscriptions')
            .update({ plan_id: toPlanId })
            .eq('plan_id', fromPlanId)
            .in('status', ['active', 'trialing', 'past_due'])
            .select();

        if (error) throw error;
        return data?.length || 0;
    }
};
