import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import type { UserGrowthData } from '@/services/admin/analytics';

interface UserGrowthChartProps {
    data: UserGrowthData[] | undefined;
    isLoading: boolean;
}

const chartConfig = {
    cumulative: {
        label: "Total Usuarios",
        color: "hsl(var(--primary))",
    },
    users: {
        label: "Novos",
        color: "hsl(var(--success))",
    },
};

export function UserGrowthChart({ data, isLoading }: UserGrowthChartProps) {
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
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Crescimento de Usuarios
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
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="cumulative"
                                stroke="var(--color-cumulative)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="users"
                                stroke="var(--color-users)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
