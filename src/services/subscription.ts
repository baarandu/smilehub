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
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('clinic_id', clinicId)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error fetching subscription:', error);
            return { subscription: null, plan: null, isActive: false, isTrialing: false };
        }

        const subscription = subscriptions?.[0] || null;

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
            // No plan = restrictive defaults (usually) or free tier logic
            // For now, assuming no plan = no access to paid features
            return { allowed: false, limit: 0, planName: 'None' };
        }

        const limit = plan[limitField];

        // If limit is null, it's unlimited
        if (limit === null) {
            return { allowed: true, limit: Infinity, planName: plan.name };
        }

        // Explicit casting because we know limitField value type from the schema context, 
        // but Typescript might see it as generic Json. 
        // In our schema, numeric limits like max_users are numbers.
        const numericLimit = Number(limit);

        return {
            allowed: currentUsage < numericLimit,
            limit: numericLimit,
            planName: plan.name
        };
    },

    /**
     * Specific check for max users
     */
    async canAddUser(clinicId: string): Promise<boolean> {
        // 1. Get current user count
        const { count } = await supabase
            .from('clinic_users')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId);

        // 2. Check limit
        const result = await this.checkLimit(clinicId, 'max_users', count || 0);
        return result.allowed;
    },

    /**
     * Call Supabase Edge Function to create a Stripe Subscription
     */
    async createSubscription(priceId: string, email: string, userId: string, planName: string, amount: number, customerId?: string) {
        const { data, error } = await supabase.functions.invoke('create-subscription', {
            body: { priceId, email, userId, planName, amount, customerId },
        });

        if (error) throw error;
        return data;
    }
};

