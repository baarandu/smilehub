import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, KeyRound, Bot, Download, Timer, ShieldOff } from "lucide-react";
import type { SecurityMetrics } from "@/services/admin/security";

interface Props {
  metrics: SecurityMetrics;
}

export function SecurityStatsCards({ metrics }: Props) {
  const cards = [
    {
      title: "Total de Eventos",
      value: metrics.total,
      icon: ShieldAlert,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Falhas de Auth",
      value: metrics.auth_failures,
      icon: KeyRound,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Requisições IA",
      value: metrics.ai_requests,
      icon: Bot,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Exportações",
      value: metrics.exports,
      icon: Download,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Rate Limits",
      value: metrics.rate_limits,
      icon: Timer,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Consent Negados",
      value: metrics.consent_denials,
      icon: ShieldOff,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
