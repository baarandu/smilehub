import {
    Building2,
    Users,
    UserPlus,
    CreditCard,
    Clock,
    TrendingUp,
    DollarSign,
    TrendingDown
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { OverviewMetrics, StripeMetrics } from '@/services/admin/analytics';

interface AdminStatsCardsProps {
    metrics: OverviewMetrics | undefined;
    stripeMetrics: StripeMetrics | null | undefined;
    isLoading: boolean;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function AdminStatsCards({ metrics, stripeMetrics, isLoading }: AdminStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
        );
    }

    const mrr = stripeMetrics?.mrr ?? 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
                title="Total de Clinicas"
                value={metrics?.totalClinics ?? 0}
                icon={<Building2 className="h-6 w-6" />}
                variant="primary"
            />
            <StatsCard
                title="Total de Usuarios"
                value={metrics?.totalUsers ?? 0}
                icon={<Users className="h-6 w-6" />}
                variant="default"
            />
            <StatsCard
                title="Novos Usuarios"
                value={metrics?.newUsersInPeriod ?? 0}
                icon={<UserPlus className="h-6 w-6" />}
                variant="success"
            />
            <StatsCard
                title="Assinaturas Ativas"
                value={metrics?.activeSubscriptions ?? 0}
                icon={<CreditCard className="h-6 w-6" />}
                variant="primary"
            />
            <StatsCard
                title="Em Trial"
                value={metrics?.trialingSubscriptions ?? 0}
                icon={<Clock className="h-6 w-6" />}
                variant="warning"
            />
            <StatsCard
                title="Taxa de Conversao"
                value={`${metrics?.conversionRate ?? 0}%`}
                icon={<TrendingUp className="h-6 w-6" />}
                variant="success"
            />
            <StatsCard
                title="Receita Recorrente Mensal"
                value={formatCurrency(mrr)}
                icon={<DollarSign className="h-6 w-6" />}
                variant="primary"
            />
            <StatsCard
                title="Taxa de Cancelamento"
                value={`${metrics?.churnRate ?? 0}%`}
                icon={<TrendingDown className="h-6 w-6" />}
                variant={metrics?.churnRate && metrics.churnRate > 5 ? 'warning' : 'default'}
            />
        </div>
    );
}
