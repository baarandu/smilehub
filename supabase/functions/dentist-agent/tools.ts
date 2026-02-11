export const TOOLS = [
  {
    name: "get_patient_profile",
    description:
      "Retorna dados demográficos do paciente: nome, idade (calculada), sexo, telefone, email, convênio, alergias e medicações em uso. NÃO inclui CPF/RG (LGPD). Use para contextualizar o caso clínico.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_patient_anamnesis",
    description:
      "Retorna a anamnese mais recente do paciente. Inclui apenas campos marcados como 'true' com seus detalhes para economia de tokens. Campos: diabetes, hipertensão, cardiopatia, alergias, medicações, gestante, tabagismo, problemas renais, hepatite, HIV, marcapasso, prótese articular, sangramento excessivo, cirurgias anteriores, etc. SEMPRE consulte antes de sugerir tratamento.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_patient_procedures",
    description:
      "Retorna histórico de procedimentos odontológicos do paciente com dente, procedimento, status e datas. Use para entender tratamentos em andamento e histórico.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_patient_exams",
    description:
      "Retorna lista de exames do paciente (radiografias, tomografias, fotos) com tipo, dente/região, data e URLs dos arquivos. Use para localizar exames antes de análise de imagem.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_patient_consultations",
    description:
      "Retorna notas de consulta do paciente (evoluções clínicas) com data, descrição, dentes tratados e data de retorno. Use para entender o histórico clínico recente.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "get_patient_appointments",
    description:
      "Retorna histórico de agendamentos do paciente com data, horário, status e procedimento planejado. Use para verificar frequência de comparecimento e próximos retornos.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
  {
    name: "search_patients",
    description:
      "Busca pacientes por nome. Retorna nome, idade e ID (sem CPF/RG por LGPD). Limitado a 10 resultados. Use quando o dentista quer consultar sobre um paciente sem ter selecionado previamente.",
    parameters: {
      type: "object",
      properties: {
        search_term: {
          type: "string",
          description:
            "Termo de busca (nome ou parte do nome do paciente).",
        },
      },
      required: ["search_term"],
    },
  },
  {
    name: "analyze_exam_image",
    description:
      "Busca dados de um exame específico para análise de imagem (radiografia, tomografia, foto). Retorna URL da imagem, tipo de exame, dente/região e data. O sistema usará GPT-4o Vision para analisar a imagem automaticamente.",
    parameters: {
      type: "object",
      properties: {
        exam_id: {
          type: "string",
          description: "ID do exame (UUID).",
        },
      },
      required: ["exam_id"],
    },
  },
  {
    name: "get_patient_budgets",
    description:
      "Retorna orçamentos do paciente com itens de tratamento, valores, status de aprovação e forma de pagamento. Use para entender o planejamento financeiro do tratamento.",
    parameters: {
      type: "object",
      properties: {
        patient_id: {
          type: "string",
          description: "ID do paciente (UUID).",
        },
      },
      required: ["patient_id"],
    },
  },
];
