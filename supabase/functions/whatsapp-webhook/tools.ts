/**
 * WhatsApp Webhook - OpenAI Function Calling Tool Definitions
 * Each tool maps directly to an existing Supabase RPC.
 */

export const TOOLS = [
  {
    name: "buscar_paciente",
    description:
      "Busca um paciente pelo número de telefone. Retorna dados do paciente se encontrado. Use SEMPRE no início da conversa para identificar o paciente.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "cadastrar_paciente",
    description:
      "Cadastra um novo paciente na clínica. Use quando o paciente não for encontrado pela busca por telefone e fornecer nome e data de nascimento.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nome completo do paciente.",
        },
        birth_date: {
          type: "string",
          description: "Data de nascimento no formato YYYY-MM-DD.",
        },
        email: {
          type: "string",
          description: "E-mail do paciente (opcional).",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "listar_profissionais",
    description:
      "Lista todos os profissionais disponíveis para agendamento na clínica, com nome, especialidade e ID.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "buscar_horarios",
    description:
      "Busca horários disponíveis de um profissional em uma data específica. Retorna lista de horários livres.",
    parameters: {
      type: "object",
      properties: {
        professional_id: {
          type: "string",
          description: "ID do profissional (UUID da tabela clinic_professionals).",
        },
        date: {
          type: "string",
          description: "Data desejada no formato YYYY-MM-DD.",
        },
        duration_minutes: {
          type: "integer",
          description: "Duração da consulta em minutos (padrão: 30).",
        },
      },
      required: ["professional_id", "date"],
    },
  },
  {
    name: "criar_agendamento",
    description:
      "Cria um novo agendamento/consulta. Só use após confirmar todos os dados com o paciente: profissional, data e horário.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
        professional_id: {
          type: "string",
          description: "ID do profissional (UUID da tabela clinic_professionals).",
        },
        date: {
          type: "string",
          description: "Data do agendamento no formato YYYY-MM-DD.",
        },
        time: {
          type: "string",
          description: "Horário do agendamento no formato HH:MM.",
        },
        procedure_name: {
          type: "string",
          description: "Nome do procedimento (ex: Consulta, Limpeza, Avaliação).",
        },
        notes: {
          type: "string",
          description: "Observações adicionais.",
        },
      },
      required: ["patient_id", "professional_id", "date", "time"],
    },
  },
  {
    name: "minhas_consultas",
    description:
      "Lista os agendamentos futuros do paciente. Use quando o paciente perguntar sobre suas consultas marcadas.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
        include_past: {
          type: "boolean",
          description: "Se true, inclui consultas passadas. Padrão: false.",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "proximo_agendamento",
    description:
      "Busca o próximo agendamento do paciente pelo telefone. Útil para remarcar, cancelar ou confirmar.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "remarcar_agendamento",
    description:
      "Remarca um agendamento existente para nova data/horário. Verifique disponibilidade antes com buscar_horarios.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: {
          type: "string",
          description: "ID do agendamento a remarcar (UUID).",
        },
        new_date: {
          type: "string",
          description: "Nova data no formato YYYY-MM-DD.",
        },
        new_time: {
          type: "string",
          description: "Novo horário no formato HH:MM.",
        },
        notes: {
          type: "string",
          description: "Motivo da remarcação.",
        },
      },
      required: ["appointment_id", "new_date", "new_time"],
    },
  },
  {
    name: "cancelar_agendamento",
    description:
      "Cancela um agendamento existente. Sempre confirme com o paciente antes de cancelar e pergunte o motivo.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: {
          type: "string",
          description: "ID do agendamento a cancelar (UUID).",
        },
        reason: {
          type: "string",
          description: "Motivo do cancelamento.",
        },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "confirmar_agendamento",
    description:
      "Confirma presença do paciente em um agendamento. Use quando paciente disser que vai comparecer.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: {
          type: "string",
          description: "ID do agendamento a confirmar (UUID).",
        },
      },
      required: ["appointment_id"],
    },
  },
  {
    name: "transferir_para_humano",
    description:
      "Transfere a conversa para atendimento humano. Use quando: paciente insatisfeito, urgência médica, assunto fora do escopo, ou pedido explícito de falar com humano.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Motivo da transferência.",
        },
      },
      required: ["reason"],
    },
  },
];

// Convert tools to OpenAI function calling format
export function getOpenAITools() {
  return TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
