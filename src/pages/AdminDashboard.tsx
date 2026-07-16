import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    PeriodFilter,
    AdminStatsCards,
    UserGrowthChart,
    SubscriptionDistributionChart,
    RevenueChart,
    ClinicsList,
    UsersTable,
    UserActivityTable,
    ActiveUsersChart,
} from '@/components/admin/dashboard';
import {
    useOverviewMetrics,
    useUserGrowth,
    useSubscriptionStats,
    useRecentClinics,
    useStripeMetrics,
    useActiveUsersSeries,
} from '@/hooks/useAdminAnalytics';
import type { PeriodValue } from '@/services/admin/analytics';

export default function AdminDashboard() {
    const now = new Date();
    const [period, setPeriod] = useState<PeriodValue>({
        view: 'monthly',
        month: now.getMonth(),
        year: now.getFullYear(),
    });

    const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics(period);
    const { data: userGrowth, isLoading: growthLoading } = useUserGrowth(period);
    const { data: subscriptionStats, isLoading: statsLoading } = useSubscriptionStats();
    const { data: clinics, isLoading: clinicsLoading } = useRecentClinics(10);
    const { data: stripeMetrics, isLoading: stripeLoading } = useStripeMetrics();
    const { data: activeUsers, isLoading: activeUsersLoading } = useActiveUsersSeries(90);

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
                        <p className="text-sm text-muted-foreground">
                            Visao geral do SaaS
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Visao Geral</TabsTrigger>
                    <TabsTrigger value="users">Usuarios & Assinaturas</TabsTrigger>
                    <TabsTrigger value="activity">Atividade & Uso</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Period Filter */}
                    <div className="flex justify-center sm:justify-end">
                        <PeriodFilter value={period} onChange={setPeriod} />
                    </div>

                    {/* Stats Cards */}
                    <AdminStatsCards
                        metrics={metrics}
                        stripeMetrics={stripeMetrics}
                        isLoading={metricsLoading || stripeLoading}
                    />

                    {/* Active Users (DAU/WAU/MAU) */}
                    <ActiveUsersChart
                        data={activeUsers}
                        isLoading={activeUsersLoading}
                    />

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <UserGrowthChart
                            data={userGrowth}
                            isLoading={growthLoading}
                        />
                        <SubscriptionDistributionChart
                            data={subscriptionStats}
                            isLoading={statsLoading}
                            type="plan"
                        />
                        <RevenueChart
                            data={stripeMetrics}
                            isLoading={stripeLoading}
                        />
                        <SubscriptionDistributionChart
                            data={subscriptionStats}
                            isLoading={statsLoading}
                            type="status"
                        />
                    </div>

                    {/* Clinics List */}
                    <ClinicsList
                        clinics={clinics}
                        isLoading={clinicsLoading}
                    />
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <UsersTable />
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                    <UserActivityTable />
                </TabsContent>
            </Tabs>
        </div>
    );
}
