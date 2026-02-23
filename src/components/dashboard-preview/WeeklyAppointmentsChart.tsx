import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWeeklyAppointmentsChart } from "@/hooks/useWeeklyAppointmentsChart";
import { useNavigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function WeeklyAppointmentsChart() {
  const navigate = useNavigate();
  const { chartData, isLoading, periodLabel, goBack, goForward, weekStart } =
    useWeeklyAppointmentsChart();

  const handleBarClick = (data: { activeTooltipIndex?: number }) => {
    const idx = data?.activeTooltipIndex;
    if (idx == null) return;
    const date = addDays(weekStart, idx);
    navigate('/agenda', { state: { selectedDate: format(date, 'yyyy-MM-dd') } });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Consultas da Semana
        </CardTitle>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground min-w-[110px] text-center">
            {periodLabel}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} onClick={handleBarClick} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  formatter={(value: number) => [value, "Consultas"]}
                />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
