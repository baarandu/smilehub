import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type Plan = Database['public']['Tables']['subscription_plans']['Row'];

export interface SubscriptionStatus {
    subscription: Subscription | null;
    plan: Plan | null;
    isActive: boolean;
    isTrialing: boolean;
    isTrialExpired: boolean;
    trialDaysLeft: number | null;
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
            return { subscription: null, plan: null, isActive: false, isTrialing: false, isTrialExpired: false, trialDaysLeft: null };
        }

        if (!subscription) {
            return { subscription: null, plan: null, isActive: false, isTrialing: false, isTrialExpired: false, trialDaysLeft: null };
        }

        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', (subscription as any).plan_id)
            .single();

        const status = (subscription as any).status;
        const currentPeriodEnd = (subscription as any).current_period_end;

        let isTrialExpired = false;
        let trialDaysLeft: number | null = null;

        if (status === 'trialing' && currentPeriodEnd) {
            const periodEnd = new Date(currentPeriodEnd);
            const now = new Date();
            const diffTime = periodEnd.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                isTrialExpired = true;
                trialDaysLeft = 0;
            } else {
                trialDaysLeft = diffDays;
            }
        }

        return {
            subscription,
            plan,
            isActive: status === 'active',
            isTrialing: status === 'trialing' && !isTrialExpired,
            isTrialExpired,
            trialDaysLeft
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
    },

    /**
     * Change subscription plan (upgrade or downgrade)
     * - Upgrade: Immediate with proration
     * - Downgrade: Scheduled for next billing cycle
     */
    async changePlan(clinicId: string, newPlanId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        immediate: boolean;
        isUpgrade: boolean;
        prorationAmount?: number;
        effectiveDate?: string;
        newPlan?: string;
        isTrialing?: boolean;
    }> {
        const { data, error } = await supabase.functions.invoke('update-subscription', {
            body: { clinicId, newPlanId, userId },
        });

        if (error) throw error;
        return data;
    }
};
