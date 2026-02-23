import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useAuditLogs } from "@/hooks/useSecurityDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogEntry } from "@/services/admin/security";

const ACTIONS = [
  "INSERT", "UPDATE", "DELETE",
  "CREATE", "READ", "EXPORT",
  "AUTH_FAILURE", "AI_REQUEST", "CONSENT_DENIED",
  "RATE_LIMIT_EXCEEDED", "SUBSCRIPTION_CREATE", "SUBSCRIPTION_UPDATE",
  "SUBSCRIPTION_CANCEL", "INVITE_SENT",
];

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Criação (trigger)",
  CREATE: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
  READ: "Leitura",
  EXPORT: "Exportação",
  AUTH_FAILURE: "Falha de auth",
  AI_REQUEST: "Requisição IA",
  CONSENT_DENIED: "Consentimento negado",
  RATE_LIMIT_EXCEEDED: "Rate limit",
  SUBSCRIPTION_CREATE: "Assinatura criada",
  SUBSCRIPTION_UPDATE: "Assinatura atualizada",
  SUBSCRIPTION_CANCEL: "Assinatura cancelada",
  INVITE_SENT: "Convite enviado",
};

const SOURCES = ["frontend", "edge_function", "database_trigger"];

const SOURCE_LABELS: Record<string, string> = {
  frontend: "Frontend",
  edge_function: "Edge Function",
  database_trigger: "Trigger de banco",
};

const TABLE_LABELS: Record<string, string> = {
  patients: "Pacientes",
  appointments: "Agendamentos",
  anamneses: "Anamneses",
  child_anamneses: "Anamneses infantis",
  consultations: "Consultas",
  procedures: "Procedimentos",
  budgets: "Orçamentos",
  budget_items: "Itens de orçamento",
  financial_transactions: "Financeiro",
  prosthesis_orders: "Próteses",
  exams: "Exames",
  patient_consents: "Consentimentos",
  patient_documents: "Documentos",
};

const TABLES = Object.keys(TABLE_LABELS);

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
  const [tableName, setTableName] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, isLoading } = useAuditLogs({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    action: action || undefined,
    source: source || undefined,
    function_name: functionName || undefined,
    table_name: tableName || undefined,
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
                <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tableName} onValueChange={(v) => { setTableName(v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {TABLES.map((t) => (
                <SelectItem key={t} value={t}>{TABLE_LABELS[t]}</SelectItem>
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
                <SelectItem key={s} value={s}>{SOURCE_LABELS[s] || s}</SelectItem>
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
                  <th className="p-2 w-8"></th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Ação</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2">Entidade</th>
                  <th className="p-2">Origem</th>
                  <th className="p-2">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <td className="p-2 text-muted-foreground">
                        {expandedRow === log.id
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </td>
                      <td className="p-2 whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="p-2 text-xs max-w-[300px] truncate" title={log.description || ""}>
                        {log.description || summarizeDetails(log.new_data)}
                      </td>
                      <td className="p-2 text-xs">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </td>
                      <td className="p-2 text-xs">
                        {SOURCE_LABELS[log.source] || log.source}
                      </td>
                      <td className="p-2 text-xs truncate max-w-[150px]" title={log.user_email || ""}>
                        {log.user_name || log.user_email || log.user_id?.slice(0, 8) || "-"}
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr key={`${log.id}-detail`} className="border-b bg-muted/30">
                        <td colSpan={7}>
                          <ExpandedRow log={log} />
                        </td>
                      </tr>
                    )}
                  </>
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

function ExpandedRow({ log }: { log: AuditLogEntry }) {
  const oldData = log.old_data;
  const newData = log.new_data;

  if ((!oldData || Object.keys(oldData).length === 0) && (!newData || Object.keys(newData).length === 0)) {
    return <div className="p-3 text-sm text-muted-foreground">Sem dados detalhados.</div>;
  }

  // For INSERT or DELETE (no diff), show the snapshot
  if (!oldData || Object.keys(oldData).length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Dados do registro:</p>
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
          {JSON.stringify(newData, null, 2)}
        </pre>
      </div>
    );
  }

  if (!newData || Object.keys(newData).length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Dados antes da exclusão:</p>
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
          {JSON.stringify(oldData, null, 2)}
        </pre>
      </div>
    );
  }

  // For UPDATE, show diff: new_data contains only changed fields, old_data has original values
  const changedKeys = Object.keys(newData).filter(
    k => !["id", "created_at", "updated_at", "clinic_id", "user_id"].includes(k)
  );

  if (changedKeys.length === 0) {
    return <div className="p-3 text-sm text-muted-foreground">Nenhuma alteração detectada.</div>;
  }

  return (
    <div className="p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Campos alterados:</p>
      <div className="space-y-1">
        {changedKeys.map((key) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="font-medium min-w-[140px] text-muted-foreground">{key}:</span>
            <span className="text-red-600 line-through">{formatValue(oldData[key])}</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-green-600">{formatValue(newData[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getActionColor(action: string): string {
  switch (action) {
    case "INSERT":
    case "CREATE": return "bg-green-100 text-green-700";
    case "UPDATE": return "bg-blue-100 text-blue-700";
    case "DELETE": return "bg-red-100 text-red-700";
    case "AUTH_FAILURE": return "bg-red-100 text-red-700";
    case "RATE_LIMIT_EXCEEDED": return "bg-orange-100 text-orange-700";
    case "CONSENT_DENIED": return "bg-yellow-100 text-yellow-700";
    case "AI_REQUEST": return "bg-purple-100 text-purple-700";
    case "READ": return "bg-sky-100 text-sky-700";
    case "EXPORT": return "bg-emerald-100 text-emerald-700";
    case "SUBSCRIPTION_CREATE":
    case "SUBSCRIPTION_UPDATE":
    case "SUBSCRIPTION_CANCEL": return "bg-indigo-100 text-indigo-700";
    case "INVITE_SENT": return "bg-teal-100 text-teal-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "vazio";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function summarizeDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "-";
  const entries = Object.entries(details).slice(0, 3);
  return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ");
}
