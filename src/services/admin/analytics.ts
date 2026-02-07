import { supabase } from '@/lib/supabase';

export type PeriodView = 'monthly' | 'yearly';

export interface PeriodValue {
    view: PeriodView;
    month: number; // 0-11
    year: number;
}

export interface OverviewMetrics {
    totalClinics: number;
    totalUsers: number;
    newUsersInPeriod: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    conversionRate: number;
    churnRate: number;
}

export interface UserGrowthData {
    date: string;
    users: number;
    cumulative: number;
}

export interface SubscriptionStats {
    byStatus: { status: string; count: number }[];
    byPlan: { planName: string; count: number }[];
}

export interface ClinicInfo {
    id: string;
    name: string;
    planName: string | null;
    subscriptionStatus: string | null;
    usersCount: number;
    createdAt: string;
}

export interface StripeMetrics {
    mrr: number;
    activeSubscriptionsCount: number;
    trialingCount: number;
    recentRevenue: number;
    revenueByPlan: { planName: string; amount: number; count: number }[];
    monthlyRevenue: { month: string; revenue: number }[];
    canceledLast30Days: number;
    totalCustomers: number;
}

function getPeriodRange(period: PeriodValue): { startDate: Date; endDate: Date } {
    if (period.view === 'monthly') {
        const startDate = new Date(period.year, period.month, 1);
        const endDate = new Date(period.year, period.month + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate };
    } else {
        const startDate = new Date(period.year, 0, 1);
        const endDate = new Date(period.year, 11, 31, 23, 59, 59, 999);
        return { startDate, endDate };
    }
}

export const analyticsService = {
    /**
     * Get overview metrics (totals) - uses RPC to bypass RLS
     */
    async getOverviewMetrics(period: PeriodValue): Promise<OverviewMetrics> {
        const { startDate, endDate } = getPeriodRange(period);

        const { data, error } = await supabase.rpc('admin_get_overview_metrics', {
            p_start_date: startDate.toISOString(),
            p_end_date: endDate.toISOString(),
        });

        if (error) {
            console.error('Error fetching overview metrics:', error);
            return {
                totalClinics: 0,
                totalUsers: 0,
                newUsersInPeriod: 0,
                activeSubscriptions: 0,
                trialingSubscriptions: 0,
                conversionRate: 0,
                churnRate: 0,
            };
        }

        return {
            totalClinics: data?.totalClinics || 0,
            totalUsers: data?.totalUsers || 0,
            newUsersInPeriod: data?.newUsersInPeriod || 0,
            activeSubscriptions: data?.activeSubscriptions || 0,
            trialingSubscriptions: data?.trialingSubscriptions || 0,
            conversionRate: data?.conversionRate || 0,
            churnRate: data?.churnRate || 0,
        };
    },

    /**
     * Get user growth over time
     */
    async getUserGrowth(period: PeriodValue): Promise<UserGrowthData[]> {
        const { startDate, endDate } = getPeriodRange(period);

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        if (error || !profiles) return [];

        // Get total users before the period for cumulative count
        const { count: usersBeforePeriod } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', startDate.toISOString());

        let cumulative = usersBeforePeriod || 0;

        if (period.view === 'monthly') {
            // Group by day
            const groupedByDay: Record<string, number> = {};
            profiles.forEach(profile => {
                const date = profile.created_at.split('T')[0];
                groupedByDay[date] = (groupedByDay[date] || 0) + 1;
            });

            // Fill in all days of the month
            const result: UserGrowthData[] = [];
            const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(period.year, period.month, day);
                const dateStr = date.toISOString().split('T')[0];
                const usersOnDay = groupedByDay[dateStr] || 0;
                cumulative += usersOnDay;

                result.push({
                    date: `${day}`,
                    users: usersOnDay,
                    cumulative
                });
            }

            return result;
        } else {
            // Group by month
            const groupedByMonth: Record<number, number> = {};
            profiles.forEach(profile => {
                const month = new Date(profile.created_at).getMonth();
                groupedByMonth[month] = (groupedByMonth[month] || 0) + 1;
            });

            const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const result: UserGrowthData[] = [];

            for (let month = 0; month < 12; month++) {
                const usersInMonth = groupedByMonth[month] || 0;
                cumulative += usersInMonth;

                result.push({
                    date: MONTHS_SHORT[month],
                    users: usersInMonth,
                    cumulative
                });
            }

            return result;
        }
    },

    /**
     * Get subscription statistics
     */
    async getSubscriptionStats(): Promise<SubscriptionStats> {
        // By status
        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('status, plan_id');

        if (subError || !subscriptions) {
            return { byStatus: [], byPlan: [] };
        }

        // Count by status
        const statusCounts: Record<string, number> = {};
        const planCounts: Record<string, number> = {};

        subscriptions.forEach(sub => {
            statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
            if (sub.plan_id) {
                planCounts[sub.plan_id] = (planCounts[sub.plan_id] || 0) + 1;
            }
        });

        // Get plan names
        const { data: plans } = await supabase
            .from('subscription_plans')
            .select('id, name');

        const planNameMap: Record<string, string> = {};
        plans?.forEach(plan => {
            planNameMap[plan.id] = plan.name;
        });

        const statusLabels: Record<string, string> = {
            active: 'Ativas',
            trialing: 'Em Trial',
            canceled: 'Canceladas',
            past_due: 'Vencidas',
            incomplete: 'Incompletas'
        };

        return {
            byStatus: Object.entries(statusCounts).map(([status, count]) => ({
                status: statusLabels[status] || status,
                count
            })),
            byPlan: Object.entries(planCounts).map(([planId, count]) => ({
                planName: planNameMap[planId] || 'Plano Desconhecido',
                count
            }))
        };
    },

    /**
     * Get recent clinics with details - uses RPC to bypass RLS
     */
    async getRecentClinics(limit: number = 10): Promise<ClinicInfo[]> {
        const { data, error } = await supabase.rpc('admin_get_recent_clinics', {
            p_limit: limit,
        });

        if (error) {
            console.error('Error fetching recent clinics:', error);
            return [];
        }

        return (data || []).map((clinic: any) => ({
            id: clinic.id,
            name: clinic.name,
            planName: clinic.planName,
            subscriptionStatus: clinic.subscriptionStatus,
            usersCount: clinic.usersCount || 0,
            createdAt: clinic.createdAt,
        }));
    },

    /**
     * Get Stripe metrics from Edge Function
     */
    async getStripeMetrics(): Promise<StripeMetrics | null> {
        try {
            const { data, error } = await supabase.functions.invoke('get-stripe-metrics');

            if (error) {
                console.error('Error fetching Stripe metrics:', error);
                return null;
            }

            return data as StripeMetrics;
        } catch (err) {
            console.error('Error invoking Stripe metrics function:', err);
            return null;
        }
    }
};
