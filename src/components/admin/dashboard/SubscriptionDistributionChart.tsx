import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChartIcon } from 'lucide-react';
import type { SubscriptionStats } from '@/services/admin/analytics';

interface SubscriptionDistributionChartProps {
    data: SubscriptionStats | undefined;
    isLoading: boolean;
    type: 'plan' | 'status';
}

const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))',
    'hsl(var(--muted-foreground))',
];

export function SubscriptionDistributionChart({ data, isLoading, type }: SubscriptionDistributionChartProps) {
    const chartData = type === 'plan'
        ? data?.byPlan.map((item, i) => ({ name: item.planName, value: item.count, fill: COLORS[i % COLORS.length] }))
        : data?.byStatus.map((item, i) => ({ name: item.status, value: item.count, fill: COLORS[i % COLORS.length] }));

    const chartConfig = (chartData || []).reduce((acc, item) => {
        acc[item.name] = { label: item.name, color: item.fill };
        return acc;
    }, {} as Record<string, { label: string; color: string }>);

    const title = type === 'plan' ? 'Distribuicao por Plano' : 'Status das Assinaturas';

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!chartData || chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-primary" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">Nenhum dado disponivel</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                innerRadius={60}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
