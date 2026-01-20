import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type Plan = Database['public']['Tables']['subscription_plans']['Row'];

export interface SubscriptionStatus {
    subscription: Subscription | null;
    plan: Plan | null;
    isActive: boolean;
    isTrialing: boolean;
}

export const subscriptionService = {
    /**
     * Get the current subscription for a clinic
     */
    async getCurrentSubscription(clinicId: string): Promise<SubscriptionStatus> {
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('clinic_id', clinicId)
            .in('status', ['active', 'trialing'])
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching subscription:', error);
            return { subscription: null, plan: null, isActive: false, isTrialing: false };
        }

        if (!subscription) {
            return { subscription: null, plan: null, isActive: false, isTrialing: false };
        }

        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', subscription.plan_id)
            .single();

        return {
            subscription,
            plan,
            isActive: subscription.status === 'active',
            isTrialing: subscription.status === 'trialing'
        };
    },

    /**
     * Check if a specific limit has been reached
     */
    async checkLimit(
        clinicId: string,
        limitField: keyof Plan,
        currentUsage: number
    ): Promise<{ allowed: boolean; limit: number; planName: string }> {
        const { plan } = await this.getCurrentSubscription(clinicId);

        if (!plan) {
            return { allowed: false, limit: 0, planName: 'None' };
        }

        const limit = plan[limitField];

        if (limit === null) {
            return { allowed: true, limit: Infinity, planName: plan.name };
        }

        const numericLimit = Number(limit);

        return {
            allowed: currentUsage < numericLimit,
            limit: numericLimit,
            planName: plan.name
        };
    },

    async canAddUser(clinicId: string): Promise<boolean> {
        const { count } = await supabase
            .from('clinic_users')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId);

        const result = await this.checkLimit(clinicId, 'max_users', count || 0);
        return result.allowed;
    }
};
