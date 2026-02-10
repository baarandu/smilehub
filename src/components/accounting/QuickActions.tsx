import { Tag, AlertCircle, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { QuickAction, ConversationMode } from "@/types/accountingAgent";

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Tag,
    label: "Classificar Transações",
    description: "Sugerir categorias para lançamentos",
    prompt:
      "Vamos classificar as transações sem categoria do mês atual. Comece listando quantas são.",
    color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200",
    mode: "classify",
  },
  {
    icon: AlertCircle,
    label: "Auditar Mês",
    description: "Verificar problemas nos lançamentos",
    prompt:
      "Faça uma auditoria completa do mês atual. Liste duplicidades, lançamentos sem documento e sem categoria.",
    color: "text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200",
    mode: "audit",
  },
  {
    icon: Calendar,
    label: "Fechar Mês",
    description: "Resumo financeiro + DAS",
    prompt:
      "Feche o mês anterior. Quero ver a DRE, impostos calculados e alertas importantes.",
    color: "text-green-600 bg-green-50 hover:bg-green-100 border-green-200",
    mode: "close",
  },
  {
    icon: FileText,
    label: "Checklist Contador",
    description: "Documentos para enviar",
    prompt:
      "Mostre o checklist fiscal completo. Quais documentos estão pendentes para o contador?",
    color: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200",
    mode: "checklist",
  },
];

interface QuickActionsProps {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onSelectAction, disabled }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Card
            key={action.mode}
            className={`p-4 border-2 ${action.color} cursor-pointer transition-all hover:shadow-md ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => !disabled && onSelectAction(action.prompt)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${action.color.split(" ")[1]} ${action.color.split(" ")[0]}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{action.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
