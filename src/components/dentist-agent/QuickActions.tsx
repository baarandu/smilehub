import {
  Search,
  ShieldAlert,
  ClipboardList,
  AlertCircle,
  Pill,
  ImageIcon,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DentistQuickAction } from "@/types/dentistAgent";

const QUICK_ACTIONS: DentistQuickAction[] = [
  {
    icon: Search,
    label: "Diagnóstico diferencial",
    description: "Ajuda com hipóteses diagnósticas e raciocínio clínico",
    prompt:
      "Preciso de ajuda com diagnóstico diferencial. Vou descrever os sinais e sintomas.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
  },
  {
    icon: ShieldAlert,
    label: "Revisar anamnese",
    description: "Red flags, contraindicações e alertas clínicos",
    prompt:
      "Revise a anamnese deste paciente. Identifique red flags, contraindicações e alertas importantes para o planejamento do tratamento.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
    requiresPatient: true,
  },
  {
    icon: ClipboardList,
    label: "Plano de tratamento",
    description: "Opções A/B/C com sequência e sessões estimadas",
    prompt:
      "Elabore um plano de tratamento com opções A/B/C (conservador, intermediário, definitivo), sequência lógica, prioridades e sessões estimadas.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
    requiresPatient: true,
  },
  {
    icon: AlertCircle,
    label: "Conduta de urgência",
    description: "Orientação imediata para dor aguda ou emergência",
    prompt:
      "Paciente com dor aguda. Vou descrever o caso para orientação de conduta imediata.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
  },
  {
    icon: Pill,
    label: "Interações medicamentosas",
    description: "Análise de medicações vs anestésicos e anti-inflamatórios",
    prompt:
      "Verifique as medicações em uso deste paciente e analise possíveis interações com anestésicos locais, anti-inflamatórios e antibióticos comuns em odontologia.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
    requiresPatient: true,
  },
  {
    icon: ImageIcon,
    label: "Analisar imagem",
    description: "Análise assistiva de radiografia ou foto clínica",
    prompt:
      "Vou enviar uma imagem clínica/radiográfica para análise. Descreva os achados objetivamente e liste hipóteses diagnósticas.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
  },
  {
    icon: FileText,
    label: "Gerar texto SOAP",
    description: "Documentação clínica para o prontuário",
    prompt:
      "Gere documentação SOAP (Subjetivo, Objetivo, Avaliação, Plano) deste atendimento para o prontuário eletrônico.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
    requiresPatient: true,
  },
  {
    icon: MessageCircle,
    label: "Explicar ao paciente",
    description: "Linguagem simples e acessível para o paciente",
    prompt:
      "Preciso explicar um procedimento/diagnóstico ao paciente em linguagem simples, acessível e sem termos técnicos.",
    color: "text-[#8b3634] bg-[#fef2f2] hover:bg-red-100 border-red-200",
  },
];

interface QuickActionsProps {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
  hasPatient?: boolean;
}

export function QuickActions({
  onSelectAction,
  disabled,
  hasPatient,
}: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        const isDisabled =
          disabled || (action.requiresPatient && !hasPatient);

        return (
          <Card
            key={action.label}
            className={cn(
              "p-4 border-2 cursor-pointer transition-all hover:shadow-md",
              action.color,
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !isDisabled && onSelectAction(action.prompt)}
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
                {action.requiresPatient && !hasPatient && (
                  <p className="text-xs text-[#a03f3d] mt-1">
                    Requer paciente selecionado
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
