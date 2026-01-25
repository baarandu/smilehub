import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import type { StripeMetrics } from '@/services/admin/analytics';

interface RevenueChartProps {
    data: StripeMetrics | null | undefined;
    isLoading: boolean;
}

const chartConfig = {
    revenue: {
        label: "Receita",
        color: "hsl(var(--primary))",
    },
};

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
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

    const chartData = data?.monthlyRevenue || [];

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Receita Mensal
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
                    <DollarSign className="h-5 w-5 text-primary" />
                    Receita Mensal
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => formatCurrency(value)}
                                width={70}
                            />
                            <ChartTooltip
                                content={<ChartTooltipContent />}
                                formatter={(value) => formatCurrency(value as number)}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="var(--color-revenue)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
