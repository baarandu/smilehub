import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: { status: string; count: number; value: number }[];
}

const COLORS: Record<string, string> = {
  Pendente: "#f59e0b",
  Aprovado: "#6366f1",
  "Concluído": "#10b981",
};

export function BudgetStatusChart({ data }: Props) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orçamentos por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Nenhum orçamento encontrado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.filter((d) => d.count > 0)}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ status, count }) => `${status}: ${count}`}
                  labelLine={false}
                >
                  {data
                    .filter((d) => d.count > 0)
                    .map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={COLORS[entry.status] || "#94a3b8"}
                      />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} orçamento${value !== 1 ? "s" : ""} (${props.payload.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
                    name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
