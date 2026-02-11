import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuditLogs } from "@/hooks/useSecurityDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const ACTIONS = [
  "AUTH_FAILURE", "AI_REQUEST", "READ", "EXPORT", "CONSENT_DENIED",
  "RATE_LIMIT_EXCEEDED", "SUBSCRIPTION_CREATE", "SUBSCRIPTION_UPDATE",
  "SUBSCRIPTION_CANCEL", "INVITE_SENT", "CREATE", "UPDATE", "DELETE",
];

const SOURCES = ["frontend", "edge_function"];

const FUNCTIONS = [
  "dentist-agent", "accounting-agent", "voice-consultation-transcribe",
  "voice-consultation-extract", "patient-data-export", "ai-secretary",
  "create-subscription", "update-subscription", "cancel-subscription",
  "get-stripe-metrics", "send-invite",
];

const PAGE_SIZE = 20;

export function AuditLogTable() {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [functionName, setFunctionName] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useAuditLogs({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    action: action || undefined,
    source: source || undefined,
    function_name: functionName || undefined,
    start_date: startDate ? new Date(startDate).toISOString() : undefined,
    end_date: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logs de Auditoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={action} onValueChange={(v) => { setAction(v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={source} onValueChange={(v) => { setSource(v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={functionName} onValueChange={(v) => { setFunctionName(v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Edge Function" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {FUNCTIONS.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            className="w-[150px]"
            placeholder="Data início"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            className="w-[150px]"
            placeholder="Data fim"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Data</th>
                  <th className="p-2">Ação</th>
                  <th className="p-2">Entidade</th>
                  <th className="p-2">Origem</th>
                  <th className="p-2">Função</th>
                  <th className="p-2">Usuário</th>
                  <th className="p-2">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{log.table_name}</td>
                    <td className="p-2 text-xs">{log.source}</td>
                    <td className="p-2 text-xs">{log.function_name || "-"}</td>
                    <td className="p-2 text-xs truncate max-w-[150px]" title={log.user_email || ""}>
                      {log.user_name || log.user_email || log.user_id?.slice(0, 8) || "-"}
                    </td>
                    <td className="p-2 text-xs truncate max-w-[200px]" title={JSON.stringify(log.new_data)}>
                      {summarizeDetails(log.new_data)}
                    </td>
                  </tr>
                ))}
                {data?.logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Nenhum log encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString("pt-BR")} registros` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {totalPages > 0 ? `${page + 1} / ${totalPages}` : "0 / 0"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getActionColor(action: string): string {
  switch (action) {
    case "AUTH_FAILURE": return "bg-red-100 text-red-700";
    case "RATE_LIMIT_EXCEEDED": return "bg-orange-100 text-orange-700";
    case "CONSENT_DENIED": return "bg-yellow-100 text-yellow-700";
    case "AI_REQUEST": return "bg-purple-100 text-purple-700";
    case "READ": return "bg-blue-100 text-blue-700";
    case "EXPORT": return "bg-green-100 text-green-700";
    case "SUBSCRIPTION_CREATE":
    case "SUBSCRIPTION_UPDATE":
    case "SUBSCRIPTION_CANCEL": return "bg-indigo-100 text-indigo-700";
    case "INVITE_SENT": return "bg-teal-100 text-teal-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function summarizeDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "-";
  const entries = Object.entries(details).slice(0, 3);
  return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ");
}
