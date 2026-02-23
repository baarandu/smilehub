import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

interface Props {
  data: { status: string; count: number }[];
}

const COLORS: Record<string, string> = {
  "Pré-lab": "#3b82f6",
  "No Lab": "#f97316",
  "Na Clínica": "#8b5cf6",
  "Concluído": "#10b981",
};

export function ProsthesisStatusChart({ data }: Props) {
  const navigate = useNavigate();
  const hasData = data.some((d) => d.count > 0);

  const handleClick = () => navigate('/protese');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Central de Prótese
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-auto">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma ordem de prótese
            </div>
          ) : (
            <div style={{ height: Math.max(300, data.length * 60) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" onClick={handleClick} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  formatter={(value: number) => [value, "Ordens"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={COLORS[entry.status] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
