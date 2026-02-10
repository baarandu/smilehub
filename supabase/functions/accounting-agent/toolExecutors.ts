interface ToolArgs {
  [key: string]: any;
}

export async function executeToolCall(
  toolName: string,
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case "get_monthly_summary":
      return await executeGetMonthlySummary(args, clinicId, supabase);

    case "validate_bookkeeping":
      return await executeValidateBookkeeping(args, clinicId, supabase);

    case "classify_transaction":
      return await executeClassifyTransaction(args, clinicId, supabase);

    case "calculate_factor_r":
      return await executeCalculateFactorR(args, clinicId, supabase);

    case "calculate_simples_tax":
      return await executeCalculateSimplesTax(args, clinicId, supabase);

    case "get_fiscal_checklist":
      return await executeGetFiscalChecklist(args, clinicId, supabase);

    case "search_transactions":
      return await executeSearchTransactions(args, clinicId, supabase);

    case "compare_months":
      return await executeCompareMonths(args, clinicId, supabase);

    case "get_pending_transactions":
      return await executeGetPendingTransactions(args, clinicId, supabase);

    case "get_top_expenses":
      return await executeGetTopExpenses(args, clinicId, supabase);

    case "get_revenue_by_payment_method":
      return await executeGetRevenueByPaymentMethod(args, clinicId, supabase);

    case "get_fiscal_deadlines":
      return await executeGetFiscalDeadlines(args, clinicId, supabase);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool 1: Get Monthly Summary
async function executeGetMonthlySummary(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { month } = args;

  const { data, error } = await supabase.rpc("get_monthly_summary", {
    p_clinic_id: clinicId,
    p_month: month,
  });

  if (error) {
    console.error("Error in get_monthly_summary:", error);
    throw new Error(`Erro ao buscar resumo mensal: ${error.message}`);
  }

  return data;
}

// Tool 2: Validate Bookkeeping
async function executeValidateBookkeeping(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { month } = args;

  const { data, error } = await supabase.rpc("validate_bookkeeping", {
    p_clinic_id: clinicId,
    p_month: month,
  });

  if (error) {
    console.error("Error in validate_bookkeeping:", error);
    throw new Error(`Erro ao validar lançamentos: ${error.message}`);
  }

  return data;
}

// Tool 3: Classify Transaction
async function executeClassifyTransaction(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { transaction_id, description, amount, supplier_name } = args;

  // Build a simple classification based on keywords
  // This is a basic implementation - can be enhanced with ML later
  const categories = [
    {
      name: "material_odontologico",
      label: "Material Odontológico",
      keywords: [
        "dental", "odonto", "resina", "luva", "mascara", "material",
        "brocas", "anestesico", "algodao", "gaze", "equipamento"
      ],
      is_deductible: true,
    },
    {
      name: "pro_labore",
      label: "Pró-Labore",
      keywords: ["pro labore", "pro-labore", "prolabore", "retirada"],
      is_deductible: true,
    },
    {
      name: "salarios",
      label: "Salários",
      keywords: ["salario", "salário", "folha", "holerite", "funcionario", "funcionário"],
      is_deductible: true,
    },
    {
      name: "aluguel",
      label: "Aluguel",
      keywords: ["aluguel", "aluguer", "locacao", "locação", "imovel"],
      is_deductible: true,
    },
    {
      name: "energia",
      label: "Energia Elétrica",
      keywords: ["energia", "eletrica", "elétrica", "luz", "cpfl", "enel"],
      is_deductible: true,
    },
    {
      name: "agua",
      label: "Água",
      keywords: ["agua", "água", "saneamento", "sabesp"],
      is_deductible: true,
    },
    {
      name: "internet",
      label: "Internet/Telefone",
      keywords: ["internet", "telefone", "telecom", "vivo", "claro", "tim"],
      is_deductible: true,
    },
    {
      name: "marketing",
      label: "Marketing",
      keywords: [
        "marketing", "publicidade", "anuncio", "anúncio", "google ads",
        "facebook ads", "instagram", "social media"
      ],
      is_deductible: true,
    },
    {
      name: "software",
      label: "Software/Sistemas",
      keywords: ["software", "sistema", "licenca", "licença", "saas", "assinatura"],
      is_deductible: true,
    },
    {
      name: "contador",
      label: "Serviços Contábeis",
      keywords: ["contador", "contabil", "contábil", "contabilidade"],
      is_deductible: true,
    },
    {
      name: "manutencao",
      label: "Manutenção",
      keywords: ["manutencao", "manutenção", "reparo", "conserto"],
      is_deductible: true,
    },
    {
      name: "impostos",
      label: "Impostos e Taxas",
      keywords: ["imposto", "taxa", "das", "darf", "gps", "fgts", "inss"],
      is_deductible: false,
    },
  ];

  const descLower = description.toLowerCase();
  const supplierLower = supplier_name?.toLowerCase() || "";

  let bestMatch = null;
  let maxScore = 0;

  for (const category of categories) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (descLower.includes(keyword)) {
        score += 2; // Description match weights more
      }
      if (supplierLower.includes(keyword)) {
        score += 1;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }

  // Calculate confidence
  let confidence = 0;
  let reasoning = "";

  if (maxScore === 0) {
    // No match found
    bestMatch = {
      name: "outros",
      label: "Outros",
      is_deductible: false,
    };
    confidence = 0.3;
    reasoning = "Não encontrei palavras-chave conhecidas. Recomendo revisar manualmente.";
  } else if (maxScore >= 3) {
    confidence = 0.9;
    reasoning = `Alta correspondência com palavras-chave de "${bestMatch.label}".`;
  } else if (maxScore === 2) {
    confidence = 0.7;
    reasoning = `Correspondência moderada com palavras-chave de "${bestMatch.label}".`;
  } else {
    confidence = 0.5;
    reasoning = `Correspondência fraca com palavras-chave de "${bestMatch.label}". Recomendo revisar.`;
  }

  // Check historical patterns (if transaction_id provided)
  if (transaction_id) {
    const { data: similar } = await supabase
      .from("financial_transactions")
      .select("category")
      .eq("clinic_id", clinicId)
      .or(`description.ilike.%${description.split(" ")[0]}%,supplier_name.ilike.%${supplier_name || ""}%`)
      .not("category", "is", null)
      .limit(5);

    if (similar && similar.length > 0) {
      const categoryCounts: { [key: string]: number } = {};
      similar.forEach((t: any) => {
        categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
      });

      const mostCommon = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      if (mostCommon && mostCommon[1] >= 2) {
        // Found historical pattern
        const historicalCategory = categories.find(c => c.name === mostCommon[0]);
        if (historicalCategory) {
          bestMatch = historicalCategory;
          confidence = Math.min(0.95, confidence + 0.15);
          reasoning += ` Padrão histórico: ${mostCommon[1]} transações similares classificadas como "${historicalCategory.label}".`;
        }
      }
    }
  }

  return {
    suggested_category: bestMatch.name,
    category_label: bestMatch.label,
    confidence: Math.round(confidence * 100) / 100,
    is_deductible: bestMatch.is_deductible,
    reasoning: reasoning,
    transaction_details: {
      description,
      amount,
      supplier_name: supplier_name || null,
    },
  };
}

// Tool 4: Calculate Factor R
async function executeCalculateFactorR(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { start_date, end_date } = args;

  const { data, error } = await supabase.rpc("calculate_factor_r", {
    p_clinic_id: clinicId,
    p_start_date: start_date,
    p_end_date: end_date,
  });

  if (error) {
    console.error("Error in calculate_factor_r:", error);
    throw new Error(`Erro ao calcular Fator R: ${error.message}`);
  }

  return data;
}

// Tool 5: Calculate Simples Tax
async function executeCalculateSimplesTax(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { month, anexo } = args;

  const { data, error } = await supabase.rpc("calculate_simples_tax", {
    p_clinic_id: clinicId,
    p_month: month,
    p_anexo: anexo || null,
  });

  if (error) {
    console.error("Error in calculate_simples_tax:", error);
    throw new Error(`Erro ao calcular DAS: ${error.message}`);
  }

  return data;
}

// Tool 6: Get Fiscal Checklist
async function executeGetFiscalChecklist(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { fiscal_year, regime } = args;

  // Get fiscal profile if regime not specified
  let taxRegime = regime;
  if (!taxRegime) {
    const { data: profile } = await supabase
      .from("fiscal_profiles")
      .select("tax_regime")
      .eq("clinic_id", clinicId)
      .single();

    taxRegime = profile?.tax_regime || "simples_nacional";
  }

  // Build checklist based on regime
  const checklists: { [key: string]: any } = {
    simples_nacional: {
      identificacao: [
        { name: "CNPJ", required: true, deadline: null },
        { name: "Certificado Digital", required: true, deadline: null },
        { name: "Comprovante de Endereço", required: true, deadline: null },
      ],
      rendimentos: [
        { name: "Notas Fiscais Emitidas (12 meses)", required: true, deadline: "Anual" },
        { name: "Recibos de Convênios", required: true, deadline: "Mensal" },
        { name: "Extrato Bancário", required: true, deadline: "Mensal" },
      ],
      folha: [
        { name: "Holerites (12 meses)", required: true, deadline: "Mensal" },
        { name: "Recibos de Pró-Labore", required: true, deadline: "Mensal" },
        { name: "GPS/FGTS", required: true, deadline: "Mensal" },
        { name: "RAIS", required: true, deadline: "Março" },
      ],
      impostos: [
        { name: "DAS (12 meses)", required: true, deadline: "Mensal (dia 20)" },
        { name: "DEFIS (Declaração Anual)", required: true, deadline: "Março" },
      ],
    },
    lucro_presumido: {
      identificacao: [
        { name: "CNPJ", required: true, deadline: null },
        { name: "Certificado Digital", required: true, deadline: null },
        { name: "Comprovante de Endereço", required: true, deadline: null },
      ],
      rendimentos: [
        { name: "Notas Fiscais Emitidas", required: true, deadline: "Mensal" },
        { name: "Livro Caixa", required: true, deadline: "Mensal" },
        { name: "Extrato Bancário", required: true, deadline: "Mensal" },
      ],
      folha: [
        { name: "Holerites", required: true, deadline: "Mensal" },
        { name: "Recibos de Pró-Labore", required: true, deadline: "Mensal" },
        { name: "GPS/FGTS", required: true, deadline: "Mensal" },
        { name: "RAIS", required: true, deadline: "Março" },
        { name: "DIRF", required: true, deadline: "Fevereiro" },
      ],
      impostos: [
        { name: "IRPJ (Trimestral)", required: true, deadline: "Trimestral" },
        { name: "CSLL (Trimestral)", required: true, deadline: "Trimestral" },
        { name: "PIS/COFINS (Mensal)", required: true, deadline: "Mensal (dia 25)" },
        { name: "ISS (Mensal)", required: true, deadline: "Mensal (dia 10)" },
        { name: "ECF (Escrituração Contábil Fiscal)", required: true, deadline: "Setembro" },
      ],
    },
    pf: {
      identificacao: [
        { name: "CPF", required: true, deadline: null },
        { name: "Comprovante de Endereço", required: true, deadline: null },
      ],
      rendimentos: [
        { name: "Recibos Emitidos (RPA)", required: true, deadline: "Mensal" },
        { name: "Informes de Convênios", required: true, deadline: "Anual" },
        { name: "Extrato Bancário", required: true, deadline: "Mensal" },
      ],
      despesas: [
        { name: "Livro Caixa", required: true, deadline: "Anual" },
        { name: "Comprovantes de Despesas Dedutíveis", required: true, deadline: "Anual" },
        { name: "Aluguel (recibos/contrato)", required: false, deadline: "Anual" },
        { name: "Material Odontológico (notas)", required: false, deadline: "Anual" },
      ],
      impostos: [
        { name: "Carnê-Leão (Mensal)", required: true, deadline: "Mensal (dia 30)" },
        { name: "IRPF (Declaração Anual)", required: true, deadline: "Abril/Maio" },
        { name: "INSS Autônomo", required: true, deadline: "Mensal (dia 15)" },
      ],
    },
  };

  const checklist = checklists[taxRegime] || checklists.simples_nacional;

  // Check fiscal_documents table for uploaded documents
  const { data: documents } = await supabase
    .from("fiscal_documents")
    .select("document_type, document_name, uploaded_at")
    .eq("clinic_id", clinicId)
    .eq("fiscal_year", fiscal_year);

  // Mark documents as uploaded if found
  const result: { [key: string]: any[] } = {};

  for (const [category, items] of Object.entries(checklist)) {
    result[category] = items.map((item: any) => {
      const uploaded = documents?.find((doc: any) =>
        doc.document_name?.toLowerCase().includes(item.name.toLowerCase()) ||
        doc.document_type?.toLowerCase().includes(item.name.toLowerCase())
      );

      return {
        ...item,
        status: uploaded ? "uploaded" : "pending",
        uploaded_at: uploaded?.uploaded_at || null,
      };
    });
  }

  return {
    fiscal_year,
    regime: taxRegime,
    regime_label: {
      simples_nacional: "Simples Nacional",
      lucro_presumido: "Lucro Presumido",
      lucro_real: "Lucro Real",
      pf: "Pessoa Física",
    }[taxRegime],
    checklist: result,
    summary: {
      total_items: Object.values(result).flat().length,
      uploaded: Object.values(result).flat().filter((i: any) => i.status === "uploaded").length,
      pending: Object.values(result).flat().filter((i: any) => i.status === "pending").length,
    },
  };
}

// Tool 7: Search Transactions
async function executeSearchTransactions(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const {
    start_date, end_date, type, category, supplier_name,
    payment_method, min_amount, max_amount, search_text,
    limit: resultLimit,
  } = args;

  const safeLimit = Math.min(resultLimit || 20, 50);

  let query = supabase
    .from("financial_transactions")
    .select("id, date, description, amount, net_amount, type, category, payment_method, supplier_name, supplier_cpf_cnpj, payer_name, receipt_attachment_url, is_deductible, card_fee_amount, tax_amount")
    .eq("clinic_id", clinicId)
    .gte("date", start_date)
    .lte("date", end_date)
    .order("date", { ascending: false })
    .limit(safeLimit);

  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category", category);
  if (payment_method) query = query.eq("payment_method", payment_method);
  if (min_amount) query = query.gte("amount", min_amount);
  if (max_amount) query = query.lte("amount", max_amount);
  if (supplier_name) query = query.ilike("supplier_name", `%${supplier_name}%`);
  if (search_text) query = query.ilike("description", `%${search_text}%`);

  const { data, error } = await query;

  if (error) {
    console.error("Error in search_transactions:", error);
    throw new Error(`Erro ao buscar transações: ${error.message}`);
  }

  const transactions = data || [];
  const totalAmount = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  const totalNet = transactions.reduce((sum: number, t: any) => sum + (t.net_amount || t.amount || 0), 0);

  return {
    transactions,
    summary: {
      count: transactions.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      total_net_amount: Math.round(totalNet * 100) / 100,
      period: { start_date, end_date },
      filters_applied: {
        ...(type && { type }),
        ...(category && { category }),
        ...(supplier_name && { supplier_name }),
        ...(payment_method && { payment_method }),
        ...(min_amount && { min_amount }),
        ...(max_amount && { max_amount }),
        ...(search_text && { search_text }),
      },
    },
  };
}

// Tool 8: Compare Months
async function executeCompareMonths(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { month_a, month_b } = args;

  // Helper to get month end date
  function getMonthEnd(monthStart: string): string {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  }

  const endA = getMonthEnd(month_a);
  const endB = getMonthEnd(month_b);

  // Fetch transactions for both months in parallel
  const [resA, resB] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("amount, net_amount, type, category, payment_method")
      .eq("clinic_id", clinicId)
      .gte("date", month_a)
      .lte("date", endA),
    supabase
      .from("financial_transactions")
      .select("amount, net_amount, type, category, payment_method")
      .eq("clinic_id", clinicId)
      .gte("date", month_b)
      .lte("date", endB),
  ]);

  if (resA.error) throw new Error(`Erro mês A: ${resA.error.message}`);
  if (resB.error) throw new Error(`Erro mês B: ${resB.error.message}`);

  function summarizeMonth(transactions: any[]) {
    const income = transactions.filter((t: any) => t.type === "income");
    const expenses = transactions.filter((t: any) => t.type === "expense");

    const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const profit = totalIncome - totalExpenses;
    const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    // Group expenses by category
    const byCategory: { [key: string]: number } = {};
    expenses.forEach((t: any) => {
      const cat = t.category || "sem_categoria";
      byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
    });

    return {
      total_income: Math.round(totalIncome * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin_percent: Math.round(margin * 10) / 10,
      transaction_count: transactions.length,
      income_count: income.length,
      expense_count: expenses.length,
      expenses_by_category: byCategory,
    };
  }

  const summaryA = summarizeMonth(resA.data || []);
  const summaryB = summarizeMonth(resB.data || []);

  // Calculate variations
  function calcVariation(a: number, b: number) {
    if (a === 0) return b === 0 ? 0 : 100;
    return Math.round(((b - a) / Math.abs(a)) * 1000) / 10;
  }

  return {
    month_a: { month: month_a, ...summaryA },
    month_b: { month: month_b, ...summaryB },
    variation: {
      income_percent: calcVariation(summaryA.total_income, summaryB.total_income),
      expenses_percent: calcVariation(summaryA.total_expenses, summaryB.total_expenses),
      profit_percent: calcVariation(summaryA.profit, summaryB.profit),
      margin_change: Math.round((summaryB.margin_percent - summaryA.margin_percent) * 10) / 10,
    },
  };
}

// Tool 9: Get Pending Transactions
async function executeGetPendingTransactions(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { issue_type, start_date, end_date } = args;

  const now = new Date();
  const defaultStart = start_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = end_date || now.toISOString().split("T")[0];

  const issueTypes = issue_type === "all" || !issue_type
    ? ["no_category", "no_receipt", "no_description"]
    : [issue_type];

  const results: { [key: string]: any[] } = {};
  let totalPending = 0;

  for (const it of issueTypes) {
    let query = supabase
      .from("financial_transactions")
      .select("id, date, description, amount, type, category, supplier_name, receipt_attachment_url")
      .eq("clinic_id", clinicId)
      .gte("date", defaultStart)
      .lte("date", defaultEnd)
      .order("date", { ascending: false })
      .limit(20);

    if (it === "no_category") {
      query = query.is("category", null);
    } else if (it === "no_receipt") {
      query = query.eq("type", "expense").is("receipt_attachment_url", null);
    } else if (it === "no_description") {
      query = query.or("description.is.null,description.eq.");
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching ${it}:`, error);
      results[it] = [];
      continue;
    }

    results[it] = data || [];
    totalPending += (data || []).length;
  }

  return {
    period: { start_date: defaultStart, end_date: defaultEnd },
    issues: results,
    summary: {
      total_pending: totalPending,
      no_category: results.no_category?.length || 0,
      no_receipt: results.no_receipt?.length || 0,
      no_description: results.no_description?.length || 0,
    },
  };
}

// Tool 10: Get Top Expenses
async function executeGetTopExpenses(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { start_date, end_date, group_by, limit: resultLimit } = args;
  const safeLimit = Math.min(resultLimit || 10, 20);
  const groupField = group_by || "category";

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("amount, category, supplier_name")
    .eq("clinic_id", clinicId)
    .eq("type", "expense")
    .gte("date", start_date)
    .lte("date", end_date);

  if (error) {
    console.error("Error in get_top_expenses:", error);
    throw new Error(`Erro ao buscar despesas: ${error.message}`);
  }

  const transactions = data || [];
  const totalExpenses = transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0);

  // Group by chosen field
  const groups: { [key: string]: { total: number; count: number } } = {};
  transactions.forEach((t: any) => {
    const key = groupField === "supplier"
      ? (t.supplier_name || "Sem fornecedor")
      : (t.category || "sem_categoria");
    if (!groups[key]) groups[key] = { total: 0, count: 0 };
    groups[key].total += t.amount || 0;
    groups[key].count += 1;
  });

  // Sort and limit
  const ranking = Object.entries(groups)
    .map(([name, data]) => ({
      name,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      percent: totalExpenses > 0
        ? Math.round((data.total / totalExpenses) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, safeLimit);

  return {
    period: { start_date, end_date },
    group_by: groupField,
    total_expenses: Math.round(totalExpenses * 100) / 100,
    ranking,
  };
}

// Tool 11: Get Revenue by Payment Method
async function executeGetRevenueByPaymentMethod(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { start_date, end_date } = args;

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("amount, net_amount, payment_method, card_fee_amount, tax_amount, anticipation_amount")
    .eq("clinic_id", clinicId)
    .eq("type", "income")
    .gte("date", start_date)
    .lte("date", end_date);

  if (error) {
    console.error("Error in get_revenue_by_payment_method:", error);
    throw new Error(`Erro ao buscar receitas: ${error.message}`);
  }

  const transactions = data || [];
  const totalRevenue = transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0);

  // Group by payment method
  const methods: { [key: string]: { total: number; net: number; fees: number; taxes: number; count: number } } = {};
  transactions.forEach((t: any) => {
    const method = t.payment_method || "nao_informado";
    if (!methods[method]) methods[method] = { total: 0, net: 0, fees: 0, taxes: 0, count: 0 };
    methods[method].total += t.amount || 0;
    methods[method].net += t.net_amount || t.amount || 0;
    methods[method].fees += (t.card_fee_amount || 0) + (t.anticipation_amount || 0);
    methods[method].taxes += t.tax_amount || 0;
    methods[method].count += 1;
  });

  const methodLabels: { [key: string]: string } = {
    pix: "PIX",
    card: "Cartão",
    cash: "Dinheiro",
    transfer: "Transferência",
    boleto: "Boleto",
    nao_informado: "Não informado",
  };

  const breakdown = Object.entries(methods)
    .map(([method, data]) => ({
      method,
      label: methodLabels[method] || method,
      total: Math.round(data.total * 100) / 100,
      net: Math.round(data.net * 100) / 100,
      fees: Math.round(data.fees * 100) / 100,
      taxes: Math.round(data.taxes * 100) / 100,
      count: data.count,
      percent: totalRevenue > 0
        ? Math.round((data.total / totalRevenue) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const totalFees = breakdown.reduce((s, m) => s + m.fees, 0);
  const totalTaxes = breakdown.reduce((s, m) => s + m.taxes, 0);

  return {
    period: { start_date, end_date },
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_fees: Math.round(totalFees * 100) / 100,
    total_taxes: Math.round(totalTaxes * 100) / 100,
    net_revenue: Math.round((totalRevenue - totalFees - totalTaxes) * 100) / 100,
    breakdown,
  };
}

// Tool 12: Get Fiscal Deadlines
async function executeGetFiscalDeadlines(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { days_ahead } = args;
  const daysLimit = days_ahead || 30;

  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + daysLimit);

  const { data, error } = await supabase
    .from("fiscal_document_reminders")
    .select("id, title, description, category, subcategory, tax_regime, due_date, frequency, is_active")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .gte("due_date", now.toISOString().split("T")[0])
    .lte("due_date", futureDate.toISOString().split("T")[0])
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error in get_fiscal_deadlines:", error);
    throw new Error(`Erro ao buscar prazos: ${error.message}`);
  }

  const reminders = (data || []).map((r: any) => {
    const dueDate = new Date(r.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...r,
      days_until_due: diffDays,
      urgency: diffDays <= 3 ? "urgente" : diffDays <= 7 ? "proximo" : "normal",
    };
  });

  return {
    period: {
      from: now.toISOString().split("T")[0],
      to: futureDate.toISOString().split("T")[0],
      days_ahead: daysLimit,
    },
    reminders,
    summary: {
      total: reminders.length,
      urgent: reminders.filter((r: any) => r.urgency === "urgente").length,
      upcoming: reminders.filter((r: any) => r.urgency === "proximo").length,
    },
  };
}
