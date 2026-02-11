import {
  TrendingDown,
  AlertCircle,
  Calendar,
  FileText,
  Search,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { QuickAction } from "@/types/accountingAgent";

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: TrendingDown,
    label: "Como pagar menos imposto?",
    description: "Diagnóstico tributário completo com simulações",
    prompt:
      "Faça um diagnóstico tributário completo da minha clínica. Quero saber: situação atual do Fator R, quanto estou pagando de DAS, quanto poderia pagar no melhor cenário, e um plano de ação detalhado para pagar o mínimo de imposto possível. Simule Anexo III vs Anexo V.",
    color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300",
    mode: "diagnostic",
  },
  {
    icon: Calendar,
    label: "Fechar mês",
    description: "DRE + impostos + oportunidades de economia",
    prompt:
      "Feche o mês anterior. Quero ver a DRE completa, impostos calculados, e principalmente: oportunidades para pagar menos imposto. Inclua o diagnóstico tributário.",
    color: "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-300",
    mode: "close",
  },
  {
    icon: AlertCircle,
    label: "O que falta organizar?",
    description: "Transações sem categoria, sem comprovante",
    prompt:
      "Quais transações estão pendentes de organização? Liste as sem categoria, sem comprovante e sem descrição. Quero deixar tudo em dia.",
    color: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300",
    mode: "audit",
  },
  {
    icon: Search,
    label: "Onde estou gastando mais?",
    description: "Ranking de despesas por categoria e fornecedor",
    prompt:
      "Analise minhas despesas dos últimos 3 meses. Quero ver o ranking por categoria e por fornecedor. Onde posso reduzir custos?",
    color: "text-red-700 bg-red-50 hover:bg-red-100 border-red-300",
    mode: "expenses",
  },
  {
    icon: Clock,
    label: "Próximos prazos fiscais",
    description: "Vencimentos e documentos urgentes",
    prompt:
      "Quais são meus próximos prazos fiscais? Mostre tudo que vence nos próximos 30 dias e o checklist de documentos pendentes para o contador.",
    color: "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-300",
    mode: "deadlines",
  },
  {
    icon: FileText,
    label: "Resumo do Imposto de Renda",
    description: "Receitas, IRRF, documentos faltantes e pendências",
    prompt:
      "Faça um resumo completo do meu Imposto de Renda do ano passado. Quero ver: perfil fiscal, receita total (PF e PJ separado), IRRF retido, despesas dedutíveis, documentos faltantes e quaisquer dados incompletos que preciso corrigir para a declaração.",
    color: "text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-300",
    mode: "ir",
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
            key={action.label}
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
