import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRevenueExpensesChart, type PeriodMode } from "@/hooks/useRevenueExpensesChart";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RevenueExpensesChart() {
  const navigate = useNavigate();
  const { mode, changeMode, periodLabel, goBack, goForward, chartData, isLoading, referenceDate, range } =
    useRevenueExpensesChart();

  const handleBarClick = (data: { activeTooltipIndex?: number }) => {
    const idx = data?.activeTooltipIndex;
    if (idx == null) return;

    if (mode === "weekly") {
      // Navigate to the month of the clicked day
      const clickedDate = new Date(range.start);
      clickedDate.setDate(clickedDate.getDate() + idx);
      navigate("/financeiro", { state: { month: clickedDate.getMonth(), year: clickedDate.getFullYear() } });
    } else if (mode === "monthly") {
      // Navigate to the current month
      navigate("/financeiro", { state: { month: referenceDate.getMonth(), year: referenceDate.getFullYear() } });
    } else {
      // Yearly: clicked bar is a month index
      navigate("/financeiro", { state: { month: idx, year: referenceDate.getFullYear() } });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Receita vs Despesas
          </CardTitle>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(["weekly", "monthly", "yearly"] as PeriodMode[]).map((m) => (
              <button
                key={m}
                onClick={() => changeMode(m)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "weekly" ? "Semanal" : m === "monthly" ? "Mensal" : "Anual"}
              </button>
            ))}
          </div>
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground min-w-[160px] text-center capitalize">
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
                <XAxis
                  dataKey="label"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  interval={mode === "monthly" ? 4 : 0}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  labelFormatter={(label) =>
                    mode === "monthly" ? `Dia ${label}` : String(label)
                  }
                  formatter={(value: number, name: string) => [
                    value.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }),
                    name === "receita" ? "Receita" : "Despesas",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "receita" ? "Receita" : "Despesas"
                  }
                />
                <Bar
                  dataKey="receita"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="despesas"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
