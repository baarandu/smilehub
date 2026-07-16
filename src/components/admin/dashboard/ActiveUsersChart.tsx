import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import type { ActiveUsersData } from '@/services/admin/analytics';

interface ActiveUsersChartProps {
    data: ActiveUsersData[] | undefined;
    isLoading: boolean;
}

const chartConfig = {
    mau: {
        label: 'Ativos no mes (MAU)',
        color: 'hsl(var(--primary))',
    },
    wau: {
        label: 'Ativos na semana (WAU)',
        color: 'hsl(var(--success))',
    },
    dau: {
        label: 'Ativos no dia (DAU)',
        color: 'hsl(var(--warning))',
    },
};

export function ActiveUsersChart({ data, isLoading }: ActiveUsersChartProps) {
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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Usuarios Ativos (ultimos 90 dias)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                width={40}
                                allowDecimals={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="mau"
                                stroke="var(--color-mau)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="wau"
                                stroke="var(--color-wau)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="dau"
                                stroke="var(--color-dau)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <p className="mt-2 text-xs text-muted-foreground">
                    Baseado em acoes registradas no sistema e em sessoes ativas (heartbeat a cada 5 min).
                </p>
            </CardContent>
        </Card>
    );
}
