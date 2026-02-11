export const TOOLS = [
  {
    name: "get_monthly_summary",
    description: "Retorna resumo financeiro do mês (DRE simplificada): receita bruta, despesas totais, lucro líquido, margem líquida, despesas por categoria, receita por fonte. Use para fechamento de mês ou visão geral financeira.",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Mês no formato YYYY-MM-DD (ex: 2024-01-01 para janeiro de 2024). Use o primeiro dia do mês.",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "validate_bookkeeping",
    description: "Audita lançamentos do mês e detecta problemas: transações sem categoria, despesas sem comprovante, possíveis duplicatas, valores inválidos (zero/negativo), transações sem descrição. Retorna lista de issues por severidade. Use para auditoria mensal.",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Mês no formato YYYY-MM-DD (ex: 2024-01-01 para janeiro de 2024). Use o primeiro dia do mês.",
        },
      },
      required: ["month"],
    },
  },
  {
    name: "classify_transaction",
    description: "Sugere categoria para uma transação baseado em descrição, valor e fornecedor. Retorna categoria sugerida, nível de confiança (0-1), se é dedutível, e justificativa. Use quando usuário pedir para classificar lançamento.",
    parameters: {
      type: "object",
      properties: {
        transaction_id: {
          type: "string",
          description: "ID da transação (UUID). Opcional se você só quer sugestão sem salvar.",
        },
        description: {
          type: "string",
          description: "Descrição da transação (ex: 'Mercado Livre - Material odontológico')",
        },
        amount: {
          type: "number",
          description: "Valor da transação em reais (ex: 450.00)",
        },
        supplier_name: {
          type: "string",
          description: "Nome do fornecedor (ex: 'Dental Store LTDA'). Opcional mas ajuda na classificação.",
        },
      },
      required: ["description", "amount"],
    },
  },
  {
    name: "calculate_factor_r",
    description: "Calcula Fator R para Simples Nacional (relação folha de pagamento / faturamento). Retorna faturamento 12 meses, folha 12 meses, fator R (decimal e %), anexo recomendado (III ou V), status (bom/atenção/crítico). SEMPRE use esta função para calcular Fator R, NUNCA calcule no texto.",
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Data inicial do período (formato YYYY-MM-DD). Geralmente 12 meses atrás.",
        },
        end_date: {
          type: "string",
          description: "Data final do período (formato YYYY-MM-DD). Geralmente último dia do mês anterior.",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "calculate_simples_tax",
    description: "Calcula DAS (imposto mensal do Simples Nacional) baseado na receita do mês e receita acumulada 12 meses. Retorna DAS calculado, alíquota nominal, alíquota efetiva, faixa, dedução mensal, data de vencimento. SEMPRE use esta função para calcular DAS, NUNCA calcule no texto.",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Mês para calcular DAS no formato YYYY-MM-DD (ex: 2024-01-01 para janeiro de 2024).",
        },
        anexo: {
          type: "number",
          description: "Anexo do Simples Nacional: 3 (Fator R ≥ 28%) ou 5 (Fator R < 28%). Opcional - será calculado automaticamente se não informado.",
          enum: [3, 5],
        },
      },
      required: ["month"],
    },
  },
  {
    name: "get_fiscal_checklist",
    description: "Retorna checklist de documentos obrigatórios para enviar ao contador, baseado no regime tributário e ano fiscal. Mostra documentos por categoria (identificação, rendimentos, folha, impostos) com status (enviado/pendente) e prazos. Use quando usuário perguntar 'o que enviar pro contador' ou 'documentos fiscais'.",
    parameters: {
      type: "object",
      properties: {
        fiscal_year: {
          type: "number",
          description: "Ano fiscal (ex: 2024). Padrão é ano atual.",
        },
        regime: {
          type: "string",
          description: "Regime tributário: 'simples_nacional', 'lucro_presumido', 'lucro_real', 'pf'. Padrão é regime da clínica.",
          enum: ["simples_nacional", "lucro_presumido", "lucro_real", "pf"],
        },
      },
      required: ["fiscal_year"],
    },
  },
  {
    name: "search_transactions",
    description: "Busca e filtra transações financeiras da clínica. Use para responder perguntas como 'quanto gastei com material?', 'quais receitas de janeiro?', 'transações do fornecedor X'. Retorna lista de transações com detalhes completos.",
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Data inicial do período (formato YYYY-MM-DD).",
        },
        end_date: {
          type: "string",
          description: "Data final do período (formato YYYY-MM-DD).",
        },
        type: {
          type: "string",
          description: "Tipo de transação: 'income' (receita) ou 'expense' (despesa).",
          enum: ["income", "expense"],
        },
        category: {
          type: "string",
          description: "Categoria da transação (ex: 'material_odontologico', 'salarios', 'aluguel'). Filtra por categoria exata.",
        },
        supplier_name: {
          type: "string",
          description: "Nome do fornecedor (busca parcial, case insensitive).",
        },
        payment_method: {
          type: "string",
          description: "Forma de pagamento: 'pix', 'card', 'cash', 'transfer', 'boleto'.",
        },
        min_amount: {
          type: "number",
          description: "Valor mínimo da transação.",
        },
        max_amount: {
          type: "number",
          description: "Valor máximo da transação.",
        },
        search_text: {
          type: "string",
          description: "Texto livre para buscar na descrição da transação.",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (padrão: 20, máximo: 50).",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "compare_months",
    description: "Compara dois meses lado a lado: receita, despesas, lucro, por categoria. Use quando o usuário pedir 'compare janeiro com fevereiro', 'evolução mês a mês', 'como foi comparado ao mês passado'. Mostra variação percentual.",
    parameters: {
      type: "object",
      properties: {
        month_a: {
          type: "string",
          description: "Primeiro mês para comparação (formato YYYY-MM-DD, primeiro dia do mês).",
        },
        month_b: {
          type: "string",
          description: "Segundo mês para comparação (formato YYYY-MM-DD, primeiro dia do mês).",
        },
      },
      required: ["month_a", "month_b"],
    },
  },
  {
    name: "get_pending_transactions",
    description: "Retorna transações que precisam de atenção: sem categoria, sem comprovante, sem descrição. Use no modo auditar ou quando o usuário perguntar 'o que falta organizar?', 'transações pendentes', 'o que preciso revisar'.",
    parameters: {
      type: "object",
      properties: {
        issue_type: {
          type: "string",
          description: "Tipo de pendência: 'no_category' (sem categoria), 'no_receipt' (sem comprovante), 'no_description' (sem descrição), 'all' (todos os tipos).",
          enum: ["no_category", "no_receipt", "no_description", "all"],
        },
        start_date: {
          type: "string",
          description: "Data inicial (formato YYYY-MM-DD). Padrão: primeiro dia do mês atual.",
        },
        end_date: {
          type: "string",
          description: "Data final (formato YYYY-MM-DD). Padrão: hoje.",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_top_expenses",
    description: "Retorna ranking das maiores despesas por categoria ou por fornecedor em um período. Use quando o usuário perguntar 'onde estou gastando mais?', 'maiores despesas', 'quais fornecedores mais pago'. Inclui totais e percentuais.",
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Data inicial do período (formato YYYY-MM-DD).",
        },
        end_date: {
          type: "string",
          description: "Data final do período (formato YYYY-MM-DD).",
        },
        group_by: {
          type: "string",
          description: "Agrupar por: 'category' (categoria) ou 'supplier' (fornecedor).",
          enum: ["category", "supplier"],
        },
        limit: {
          type: "number",
          description: "Quantidade de resultados (padrão: 10).",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_revenue_by_payment_method",
    description: "Retorna receitas agrupadas por forma de pagamento (PIX, cartão, dinheiro, etc) em um período. Inclui totais, percentuais e taxas de cartão quando aplicável. Use quando o usuário perguntar 'como recebo mais?', 'qual forma de pagamento mais uso?', 'quanto pago de taxa de cartão'.",
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Data inicial do período (formato YYYY-MM-DD).",
        },
        end_date: {
          type: "string",
          description: "Data final do período (formato YYYY-MM-DD).",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_fiscal_deadlines",
    description: "Retorna próximos prazos e vencimentos fiscais configurados para a clínica. Mostra lembretes ativos com data de vencimento, categoria e status. Use quando o usuário perguntar 'quais meus próximos prazos?', 'o que vence esse mês?', 'lembretes fiscais'.",
    parameters: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description: "Quantos dias à frente buscar (padrão: 30).",
        },
      },
      required: [] as string[],
    },
  },
  // ═══════════════════════════════════════
  // IMPOSTO DE RENDA (IR) — Tools 13-18
  // ═══════════════════════════════════════
  {
    name: "get_fiscal_profile",
    description: "Retorna perfil fiscal da clínica: dados PF (CPF, CRO), dados PJ (CNPJ, razão social, regime tributário), configuração do Simples Nacional. Use para entender o contexto fiscal da clínica antes de análises de IR.",
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_ir_annual_summary",
    description: "Gera resumo anual do Imposto de Renda: receita PF e PJ, IRRF retido, despesas dedutíveis, breakdown mensal e por pagador (PF por CPF, PJ por CNPJ). Use para 'resumo do IR', 'quanto recebi no ano', 'IRRF retido', 'declaração de IR'.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Ano fiscal para o resumo (ex: 2025).",
        },
      },
      required: ["year"],
    },
  },
  {
    name: "validate_ir_data",
    description: "Verifica dados incompletos para declaração de IR: perfil fiscal não configurado, receitas PF sem CPF/nome, receitas PJ sem fonte pagadora, despesas dedutíveis sem fornecedor ou comprovante. Use para 'o que falta pro IR?', 'dados incompletos', 'verificar IR'.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Ano fiscal para validar (ex: 2025).",
        },
      },
      required: ["year"],
    },
  },
  {
    name: "get_pj_sources",
    description: "Lista fontes pagadoras PJ (convênios/planos odontológicos) com CNPJ, razão social e status. Use para 'quais meus convênios?', 'fontes pagadoras', 'listar PJ'.",
    parameters: {
      type: "object",
      properties: {
        active_only: {
          type: "boolean",
          description: "Se true, retorna apenas fontes ativas. Padrão: true.",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "check_missing_documents",
    description: "Verifica documentos fiscais obrigatórios faltantes por categoria (identificação, rendimentos, despesas, folha, impostos, bens, dívidas, dependentes, específicos). Cruza com docs já enviados e calcula percentual de completude. Use para 'documentos faltando pro IR', 'o que falta enviar?', 'checklist de documentos'.",
    parameters: {
      type: "object",
      properties: {
        fiscal_year: {
          type: "number",
          description: "Ano fiscal (ex: 2025).",
        },
        category: {
          type: "string",
          description: "Filtrar por categoria específica. Opcional — sem filtro retorna todas.",
          enum: [
            "identificacao", "rendimentos", "despesas", "folha_pagamento",
            "impostos", "bens_direitos", "dividas", "dependentes", "especificos",
          ],
        },
      },
      required: ["fiscal_year"],
    },
  },
  {
    name: "get_ir_transactions",
    description: "Busca transações com campos detalhados de IR: pagador (CPF/CNPJ, nome), fonte PJ, IRRF retido, dedutibilidade. Permite filtrar por tipo (receita/despesa), tipo de pagador (PF/PJ), e dados faltantes. Use para 'receitas PJ sem fonte', 'despesas dedutíveis', 'transações do IR'.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Ano fiscal (ex: 2025).",
        },
        type: {
          type: "string",
          description: "Tipo de transação: 'income' (receita) ou 'expense' (despesa).",
          enum: ["income", "expense"],
        },
        payer_type: {
          type: "string",
          description: "Tipo de pagador: 'PF' (pessoa física) ou 'PJ' (pessoa jurídica). Apenas para receitas.",
          enum: ["PF", "PJ"],
        },
        missing_data_only: {
          type: "boolean",
          description: "Se true, retorna apenas transações com dados incompletos para IR (sem CPF, sem fonte PJ, sem comprovante). Padrão: false.",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (padrão: 30, máximo: 50).",
        },
      },
      required: ["year"],
    },
  },
];
