import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRevenueExpensesChart, type PeriodMode } from "@/hooks/useRevenueExpensesChart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RevenueExpensesChart() {
  const { mode, changeMode, periodLabel, goBack, goForward, chartData, isLoading } =
    useRevenueExpensesChart();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Receita vs Despesas</CardTitle>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {(["monthly", "yearly"] as PeriodMode[]).map((m) => (
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
                {m === "monthly" ? "Mensal" : "Anual"}
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
              <AreaChart data={chartData}>
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
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
