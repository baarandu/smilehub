import { useState, useMemo } from "react";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSecurityMetrics } from "@/hooks/useSecurityDashboard";
import { SecurityStatsCards } from "@/components/admin/security/SecurityStatsCards";
import { SecurityEventsChart } from "@/components/admin/security/SecurityEventsChart";
import { EventsByActionChart } from "@/components/admin/security/EventsByActionChart";
import { EventsByFunctionChart } from "@/components/admin/security/EventsByFunctionChart";
import { AuditLogTable } from "@/components/admin/security/AuditLogTable";

export default function SecurityDashboard() {
  const [period] = useState(30);

  // Memoize dates so the query key stays stable across renders
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - period);
    start.setHours(0, 0, 0, 0);
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [period]);

  const { data: metrics, isLoading, error } = useSecurityMetrics(startDate, endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-50">
          <ShieldAlert className="h-6 w-6 text-[#a03f3d]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Segurança</h1>
          <p className="text-sm text-muted-foreground">
            Auditoria e monitoramento dos últimos {period} dias
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs">Logs de Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-[350px] w-full rounded-xl" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar métricas</AlertTitle>
              <AlertDescription>
                {(error as any)?.message?.includes("function") || (error as any)?.code === "42883"
                  ? "A migration de auditoria ainda não foi executada. Rode o arquivo supabase/migrations/20260213_audit_logging_phase4.sql no SQL Editor do Supabase."
                  : `Erro: ${(error as Error).message}`}
              </AlertDescription>
            </Alert>
          ) : metrics ? (
            <>
              <SecurityStatsCards metrics={metrics} />
              <SecurityEventsChart data={metrics.daily_events} />
              <div className="grid gap-6 lg:grid-cols-2">
                <EventsByActionChart data={metrics.events_by_action} />
                <EventsByFunctionChart data={metrics.events_by_function} />
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <AuditLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
