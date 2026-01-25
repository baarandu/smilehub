import { useQuery } from '@tanstack/react-query';
import { analyticsService, PeriodValue } from '@/services/admin/analytics';

export function useOverviewMetrics(period: PeriodValue) {
    return useQuery({
        queryKey: ['admin', 'overview-metrics', period.view, period.month, period.year],
        queryFn: () => analyticsService.getOverviewMetrics(period),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useUserGrowth(period: PeriodValue) {
    return useQuery({
        queryKey: ['admin', 'user-growth', period.view, period.month, period.year],
        queryFn: () => analyticsService.getUserGrowth(period),
        staleTime: 5 * 60 * 1000,
    });
}

export function useSubscriptionStats() {
    return useQuery({
        queryKey: ['admin', 'subscription-stats'],
        queryFn: () => analyticsService.getSubscriptionStats(),
        staleTime: 5 * 60 * 1000,
    });
}

export function useRecentClinics(limit: number = 10) {
    return useQuery({
        queryKey: ['admin', 'recent-clinics', limit],
        queryFn: () => analyticsService.getRecentClinics(limit),
        staleTime: 5 * 60 * 1000,
    });
}

export function useStripeMetrics() {
    return useQuery({
        queryKey: ['admin', 'stripe-metrics'],
        queryFn: () => analyticsService.getStripeMetrics(),
        staleTime: 10 * 60 * 1000, // 10 minutes (Stripe calls can be expensive)
        retry: 1,
    });
}
