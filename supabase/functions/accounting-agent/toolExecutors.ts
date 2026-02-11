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

    // IR Tools (13-18)
    case "get_fiscal_profile":
      return await executeGetFiscalProfile(args, clinicId, supabase);

    case "get_ir_annual_summary":
      return await executeGetIRAnnualSummary(args, clinicId, supabase);

    case "validate_ir_data":
      return await executeValidateIRData(args, clinicId, supabase);

    case "get_pj_sources":
      return await executeGetPJSources(args, clinicId, supabase);

    case "check_missing_documents":
      return await executeCheckMissingDocuments(args, clinicId, supabase);

    case "get_ir_transactions":
      return await executeGetIRTransactions(args, clinicId, supabase);

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

// ═══════════════════════════════════════════
// IMPOSTO DE RENDA (IR) — Tools 13-18
// ═══════════════════════════════════════════

// Tool 13: Get Fiscal Profile
async function executeGetFiscalProfile(
  _args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { data, error } = await supabase
    .from("fiscal_profiles")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error in get_fiscal_profile:", error);
    throw new Error(`Erro ao buscar perfil fiscal: ${error.message}`);
  }

  if (!data) {
    return {
      configured: false,
      message: "Perfil fiscal não configurado. Configure em Financeiro > Imposto de Renda > Perfil Fiscal.",
    };
  }

  const regimeLabels: { [key: string]: string } = {
    simples_nacional: "Simples Nacional",
    lucro_presumido: "Lucro Presumido",
    lucro_real: "Lucro Real",
    pf: "Pessoa Física",
  };

  return {
    configured: true,
    pf: {
      active: data.pf_active || false,
      cpf: data.cpf || null,
      cro: data.cro || null,
      cro_state: data.cro_state || null,
    },
    pj: {
      active: data.pj_active !== false,
      cnpj: data.cnpj || null,
      razao_social: data.razao_social || null,
      nome_fantasia: data.nome_fantasia || null,
    },
    tax_regime: data.tax_regime || null,
    tax_regime_label: regimeLabels[data.tax_regime] || null,
    simples: {
      anexo: data.simples_anexo || null,
      fator_r_current: data.fator_r_current || null,
    },
    summary: `Regime: ${regimeLabels[data.tax_regime] || "Não definido"}. PF: ${data.pf_active ? "Ativa" : "Inativa"}. PJ: ${data.pj_active !== false ? "Ativa" : "Inativa"}.`,
  };
}

// Tool 14: Get IR Annual Summary
async function executeGetIRAnnualSummary(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { year } = args;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Fetch transactions with joins
  const { data: transactions, error } = await supabase
    .from("financial_transactions")
    .select("id, date, description, amount, type, category, payer_type, payer_name, payer_cpf, payer_is_patient, pj_source_id, irrf_amount, is_deductible, supplier_name, supplier_cpf_cnpj, patients(name, cpf), pj_sources(*)")
    .eq("clinic_id", clinicId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error in get_ir_annual_summary:", error);
    throw new Error(`Erro ao buscar transações do IR: ${error.message}`);
  }

  const txs = transactions || [];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  // Build monthly summary
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    month_name: monthNames[i],
    income_pf: 0,
    income_pj: 0,
    income_total: 0,
    irrf_total: 0,
    expenses_deductible: 0,
  }));

  const payersPF: { [cpf: string]: { cpf: string; name: string; total_amount: number; transaction_count: number } } = {};
  const payersPJ: { [cnpj: string]: { cnpj: string; razao_social: string; nome_fantasia: string | null; total_amount: number; irrf_total: number; transaction_count: number } } = {};
  const expensesByCategory: { [cat: string]: { category: string; total_amount: number; transaction_count: number } } = {};

  let totalIncomePF = 0;
  let totalIncomePJ = 0;
  let totalIRRF = 0;
  let totalExpensesDeductible = 0;

  for (const t of txs) {
    const txMonth = new Date(t.date).getMonth(); // 0-based

    if (t.type === "income") {
      const isPJ = t.payer_type === "PJ" || !!t.pj_source_id;
      const isPF = !isPJ;

      if (isPF) {
        monthly[txMonth].income_pf += t.amount || 0;
        totalIncomePF += t.amount || 0;

        // Track PF payer
        const cpf = t.payer_is_patient ? t.patients?.cpf : t.payer_cpf;
        const name = t.payer_is_patient ? t.patients?.name : t.payer_name;
        const cpfKey = cpf || "sem_cpf";
        if (!payersPF[cpfKey]) {
          payersPF[cpfKey] = { cpf: cpf || "", name: name || "Não informado", total_amount: 0, transaction_count: 0 };
        }
        payersPF[cpfKey].total_amount += t.amount || 0;
        payersPF[cpfKey].transaction_count += 1;
      } else {
        monthly[txMonth].income_pj += t.amount || 0;
        totalIncomePJ += t.amount || 0;

        // Track PJ payer
        if (t.pj_sources) {
          const cnpj = t.pj_sources.cnpj || "sem_cnpj";
          if (!payersPJ[cnpj]) {
            payersPJ[cnpj] = {
              cnpj: t.pj_sources.cnpj || "",
              razao_social: t.pj_sources.razao_social || t.pj_sources.name || "Não informado",
              nome_fantasia: t.pj_sources.nome_fantasia || null,
              total_amount: 0,
              irrf_total: 0,
              transaction_count: 0,
            };
          }
          payersPJ[cnpj].total_amount += t.amount || 0;
          payersPJ[cnpj].irrf_total += t.irrf_amount || 0;
          payersPJ[cnpj].transaction_count += 1;
        }
      }

      monthly[txMonth].income_total += t.amount || 0;
      monthly[txMonth].irrf_total += t.irrf_amount || 0;
      totalIRRF += t.irrf_amount || 0;
    }

    if (t.type === "expense" && t.is_deductible) {
      monthly[txMonth].expenses_deductible += t.amount || 0;
      totalExpensesDeductible += t.amount || 0;

      const cat = t.category || "sem_categoria";
      if (!expensesByCategory[cat]) {
        expensesByCategory[cat] = { category: cat, total_amount: 0, transaction_count: 0 };
      }
      expensesByCategory[cat].total_amount += t.amount || 0;
      expensesByCategory[cat].transaction_count += 1;
    }
  }

  // Round monthly values
  for (const m of monthly) {
    m.income_pf = Math.round(m.income_pf * 100) / 100;
    m.income_pj = Math.round(m.income_pj * 100) / 100;
    m.income_total = Math.round(m.income_total * 100) / 100;
    m.irrf_total = Math.round(m.irrf_total * 100) / 100;
    m.expenses_deductible = Math.round(m.expenses_deductible * 100) / 100;
  }

  const totalIncome = totalIncomePF + totalIncomePJ;

  return {
    year,
    total_income_pf: Math.round(totalIncomePF * 100) / 100,
    total_income_pj: Math.round(totalIncomePJ * 100) / 100,
    total_income: Math.round(totalIncome * 100) / 100,
    total_irrf: Math.round(totalIRRF * 100) / 100,
    total_expenses_deductible: Math.round(totalExpensesDeductible * 100) / 100,
    net_result: Math.round((totalIncome - totalExpensesDeductible) * 100) / 100,
    monthly,
    payers_pf: Object.values(payersPF)
      .map(p => ({ ...p, total_amount: Math.round(p.total_amount * 100) / 100 }))
      .sort((a, b) => b.total_amount - a.total_amount),
    payers_pj: Object.values(payersPJ)
      .map(p => ({
        ...p,
        total_amount: Math.round(p.total_amount * 100) / 100,
        irrf_total: Math.round(p.irrf_total * 100) / 100,
      }))
      .sort((a, b) => b.total_amount - a.total_amount),
    expenses_by_category: Object.values(expensesByCategory)
      .map(e => ({ ...e, total_amount: Math.round(e.total_amount * 100) / 100 }))
      .sort((a, b) => b.total_amount - a.total_amount),
    summary: `IR ${year}: Receita total R$ ${Math.round(totalIncome * 100) / 100} (PF: R$ ${Math.round(totalIncomePF * 100) / 100}, PJ: R$ ${Math.round(totalIncomePJ * 100) / 100}). IRRF retido: R$ ${Math.round(totalIRRF * 100) / 100}. Despesas dedutíveis: R$ ${Math.round(totalExpensesDeductible * 100) / 100}.`,
  };
}

// Tool 15: Validate IR Data
async function executeValidateIRData(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { year } = args;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const issues: {
    type: string;
    severity: string;
    transaction_id: string | null;
    transaction_date: string | null;
    transaction_description: string | null;
    message: string;
  }[] = [];

  // Check fiscal profile
  const { data: profile } = await supabase
    .from("fiscal_profiles")
    .select("*")
    .eq("clinic_id", clinicId)
    .single();

  if (!profile || (!profile.pf_active && profile.pj_active === false)) {
    issues.push({
      type: "missing_fiscal_profile",
      severity: "error",
      transaction_id: null,
      transaction_date: null,
      transaction_description: null,
      message: "Perfil fiscal não configurado ou sem PF/PJ ativa. Configure em Financeiro > IR > Perfil Fiscal.",
    });
  }

  // Fetch transactions
  const { data: transactions, error } = await supabase
    .from("financial_transactions")
    .select("id, date, description, amount, type, payer_type, payer_name, payer_cpf, payer_is_patient, pj_source_id, is_deductible, supplier_name, supplier_cpf_cnpj, receipt_number, receipt_attachment_url, patients(name, cpf)")
    .eq("clinic_id", clinicId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error in validate_ir_data:", error);
    throw new Error(`Erro ao validar dados do IR: ${error.message}`);
  }

  const txs = transactions || [];

  for (const t of txs) {
    // Income validations
    if (t.type === "income") {
      const isPF = t.payer_type === "PF" || (t.payer_is_patient && !t.pj_source_id);

      if (isPF) {
        // Check missing CPF
        const cpf = t.payer_is_patient ? t.patients?.cpf : t.payer_cpf;
        if (!cpf) {
          issues.push({
            type: "missing_payer_cpf",
            severity: "warning",
            transaction_id: t.id,
            transaction_date: t.date,
            transaction_description: t.description,
            message: `Receita PF de R$ ${t.amount} sem CPF do pagador.`,
          });
        }

        // Check missing name
        const name = t.payer_is_patient ? t.patients?.name : t.payer_name;
        if (!name) {
          issues.push({
            type: "missing_payer_name",
            severity: "warning",
            transaction_id: t.id,
            transaction_date: t.date,
            transaction_description: t.description,
            message: `Receita PF de R$ ${t.amount} sem nome do pagador.`,
          });
        }
      }

      // Check PJ without source
      if (t.payer_type === "PJ" && !t.pj_source_id) {
        issues.push({
          type: "missing_pj_source",
          severity: "warning",
          transaction_id: t.id,
          transaction_date: t.date,
          transaction_description: t.description,
          message: `Receita PJ de R$ ${t.amount} sem fonte pagadora vinculada.`,
        });
      }
    }

    // Expense validations (deductible only)
    if (t.type === "expense" && t.is_deductible) {
      if (!t.supplier_name && !t.supplier_cpf_cnpj) {
        issues.push({
          type: "missing_supplier_data",
          severity: "warning",
          transaction_id: t.id,
          transaction_date: t.date,
          transaction_description: t.description,
          message: `Despesa dedutível de R$ ${t.amount} sem dados do fornecedor.`,
        });
      }

      if (!t.receipt_number && !t.receipt_attachment_url) {
        issues.push({
          type: "missing_receipt",
          severity: "warning",
          transaction_id: t.id,
          transaction_date: t.date,
          transaction_description: t.description,
          message: `Despesa dedutível de R$ ${t.amount} sem comprovante/recibo.`,
        });
      }
    }
  }

  // Limit to 50 issues to save tokens
  const limitedIssues = issues.slice(0, 50);

  // Summary by type
  const summaryByType: { [key: string]: number } = {};
  for (const issue of issues) {
    summaryByType[issue.type] = (summaryByType[issue.type] || 0) + 1;
  }

  return {
    year,
    total_transactions: txs.length,
    total_issues: issues.length,
    issues_shown: limitedIssues.length,
    issues: limitedIssues,
    summary_by_type: summaryByType,
    has_errors: issues.some(i => i.severity === "error"),
    summary: issues.length === 0
      ? `Nenhum problema encontrado nos dados do IR ${year}. Tudo OK!`
      : `Encontrados ${issues.length} problemas nos dados do IR ${year}: ${Object.entries(summaryByType).map(([k, v]) => `${v} ${k}`).join(", ")}.`,
  };
}

// Tool 16: Get PJ Sources
async function executeGetPJSources(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const activeOnly = args.active_only !== false; // default true

  let query = supabase
    .from("pj_sources")
    .select("id, name, razao_social, nome_fantasia, cnpj, is_active, created_at")
    .eq("clinic_id", clinicId)
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error in get_pj_sources:", error);
    throw new Error(`Erro ao buscar fontes PJ: ${error.message}`);
  }

  const sources = data || [];

  return {
    sources,
    summary: {
      total: sources.length,
      active: sources.filter((s: any) => s.is_active).length,
      inactive: sources.filter((s: any) => !s.is_active).length,
      with_cnpj: sources.filter((s: any) => !!s.cnpj).length,
      without_cnpj: sources.filter((s: any) => !s.cnpj).length,
    },
  };
}

// Tool 17: Check Missing Documents
async function executeCheckMissingDocuments(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { fiscal_year, category: filterCategory } = args;

  // Get fiscal profile for regime
  const { data: profile } = await supabase
    .from("fiscal_profiles")
    .select("tax_regime, pf_active, pj_active")
    .eq("clinic_id", clinicId)
    .single();

  const regime = profile?.tax_regime || "simples_nacional";

  // Hardcoded checklist (replicates FISCAL_DOCUMENTS_CHECKLIST)
  const checklist = [
    // Identificação
    { category: "identificacao", subcategory: "cpf_rg", label: "CPF e RG", required: true, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "once" },
    { category: "identificacao", subcategory: "cro", label: "CRO (registro profissional)", required: true, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "once" },
    { category: "identificacao", subcategory: "cnpj", label: "Cartão CNPJ", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "once" },
    { category: "identificacao", subcategory: "contrato_social", label: "Contrato Social / Última alteração", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "once" },
    { category: "identificacao", subcategory: "alvara", label: "Alvará de Funcionamento", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "identificacao", subcategory: "certificado_digital", label: "Certificado Digital (e-CNPJ/e-CPF)", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "identificacao", subcategory: "comprovante_endereco", label: "Comprovante de Endereço", required: true, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    // Rendimentos
    { category: "rendimentos", subcategory: "livro_caixa", label: "Livro-Caixa", required: true, regimes: ["pf"], frequency: "monthly" },
    { category: "rendimentos", subcategory: "nfse", label: "Notas Fiscais de Serviço (NFS-e)", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "rendimentos", subcategory: "informe_convenios", label: "Informes de Rendimentos (Convênios)", required: true, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "rendimentos", subcategory: "extrato_bancario", label: "Extratos Bancários", required: true, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "rendimentos", subcategory: "extrato_maquininha", label: "Extrato da Maquininha de Cartão", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "rendimentos", subcategory: "recibos_pacientes", label: "Recibos Emitidos para Pacientes", required: true, regimes: ["pf"], frequency: "monthly" },
    // Despesas
    { category: "despesas", subcategory: "aluguel", label: "Recibos/Contrato de Aluguel", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "despesas", subcategory: "contas_consumo", label: "Contas de Consumo (energia, água, internet)", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "despesas", subcategory: "material_odontologico", label: "Notas de Material Odontológico", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "despesas", subcategory: "laboratorio", label: "Notas de Laboratório (próteses)", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "despesas", subcategory: "cursos", label: "Comprovantes de Cursos/Congressos", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "despesas", subcategory: "seguros", label: "Apólices de Seguro", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    // Folha de pagamento
    { category: "folha_pagamento", subcategory: "folha", label: "Folha de Pagamento", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "folha_pagamento", subcategory: "fgts", label: "Guias de FGTS", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "folha_pagamento", subcategory: "inss_folha", label: "GPS/INSS sobre folha", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "folha_pagamento", subcategory: "pro_labore", label: "Recibos de Pró-Labore", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "folha_pagamento", subcategory: "rais", label: "RAIS", required: true, regimes: ["simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "folha_pagamento", subcategory: "dirf", label: "DIRF", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "annual" },
    // Impostos
    { category: "impostos", subcategory: "carne_leao", label: "Carnê-Leão (DARFs)", required: true, regimes: ["pf"], frequency: "monthly" },
    { category: "impostos", subcategory: "inss_autonomo", label: "INSS Autônomo (GPS)", required: true, regimes: ["pf"], frequency: "monthly" },
    { category: "impostos", subcategory: "das", label: "DAS (Simples Nacional)", required: true, regimes: ["simples"], frequency: "monthly" },
    { category: "impostos", subcategory: "darf_irpj", label: "DARF IRPJ", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "quarterly" },
    { category: "impostos", subcategory: "darf_csll", label: "DARF CSLL", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "quarterly" },
    { category: "impostos", subcategory: "pis_cofins", label: "PIS/COFINS", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "monthly" },
    { category: "impostos", subcategory: "iss", label: "ISS Municipal", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "monthly" },
    // Bens e direitos
    { category: "bens_direitos", subcategory: "imoveis", label: "Escrituras/Contratos de Imóveis", required: false, regimes: ["pf"], frequency: "once" },
    { category: "bens_direitos", subcategory: "veiculos", label: "Documentos de Veículos", required: false, regimes: ["pf"], frequency: "once" },
    { category: "bens_direitos", subcategory: "equipamentos", label: "Notas de Equipamentos (patrimônio)", required: false, regimes: ["pf", "simples", "lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "bens_direitos", subcategory: "investimentos", label: "Informes de Investimentos", required: false, regimes: ["pf"], frequency: "annual" },
    { category: "bens_direitos", subcategory: "saldos_bancarios", label: "Saldos Bancários em 31/12", required: true, regimes: ["pf"], frequency: "annual" },
    // Dívidas
    { category: "dividas", subcategory: "financiamentos", label: "Contratos de Financiamento", required: false, regimes: ["pf"], frequency: "annual" },
    // Dependentes
    { category: "dependentes", subcategory: "cpf_dependentes", label: "CPF dos Dependentes", required: false, regimes: ["pf"], frequency: "once" },
    { category: "dependentes", subcategory: "certidao_nascimento", label: "Certidões de Nascimento/Casamento", required: false, regimes: ["pf"], frequency: "once" },
    { category: "dependentes", subcategory: "despesas_medicas_dep", label: "Despesas Médicas dos Dependentes", required: false, regimes: ["pf"], frequency: "annual" },
    { category: "dependentes", subcategory: "despesas_educacao_dep", label: "Despesas com Educação dos Dependentes", required: false, regimes: ["pf"], frequency: "annual" },
    // Específicos por regime
    { category: "especificos", subcategory: "defis", label: "DEFIS (Declaração Anual do Simples)", required: true, regimes: ["simples"], frequency: "annual" },
    { category: "especificos", subcategory: "faturamento_mensal", label: "Relatório de Faturamento Mensal", required: true, regimes: ["simples"], frequency: "monthly" },
    { category: "especificos", subcategory: "balancete", label: "Balancete Mensal", required: true, regimes: ["lucro_presumido"], frequency: "monthly" },
    { category: "especificos", subcategory: "dre", label: "DRE (Demonstração do Resultado)", required: true, regimes: ["lucro_presumido"], frequency: "quarterly" },
    { category: "especificos", subcategory: "ecf", label: "ECF (Escrituração Contábil Fiscal)", required: true, regimes: ["lucro_presumido", "lucro_real"], frequency: "annual" },
    { category: "especificos", subcategory: "livro_diario", label: "Livro Diário", required: true, regimes: ["lucro_real"], frequency: "annual" },
    { category: "especificos", subcategory: "lalur", label: "LALUR / LACS", required: true, regimes: ["lucro_real"], frequency: "annual" },
  ];

  // Map regime name for filtering
  const regimeMap: { [key: string]: string } = {
    simples_nacional: "simples",
    lucro_presumido: "lucro_presumido",
    lucro_real: "lucro_real",
    pf: "pf",
  };
  const regimeKey = regimeMap[regime] || "simples";

  // Filter checklist by regime and optional category
  let filtered = checklist.filter(item => item.regimes.includes(regimeKey) || item.regimes.includes("all"));
  if (filterCategory) {
    filtered = filtered.filter(item => item.category === filterCategory);
  }

  // Get uploaded documents
  const { data: documents } = await supabase
    .from("fiscal_documents")
    .select("category, subcategory, reference_month, uploaded_at")
    .eq("clinic_id", clinicId)
    .eq("fiscal_year", fiscal_year);

  const docs = documents || [];

  // Calculate expected vs uploaded per item
  const results: { [cat: string]: { category: string; items: any[]; complete: number; missing: number; total: number } } = {};

  for (const item of filtered) {
    if (!results[item.category]) {
      results[item.category] = { category: item.category, items: [], complete: 0, missing: 0, total: 0 };
    }

    // Determine expected count based on frequency
    let expectedCount = 1;
    if (item.frequency === "monthly") expectedCount = 12;
    else if (item.frequency === "quarterly") expectedCount = 4;

    // Count matching uploaded docs
    const matchingDocs = docs.filter((d: any) =>
      d.category === item.category && d.subcategory === item.subcategory
    );

    const uploadedCount = matchingDocs.length;
    const isComplete = uploadedCount >= expectedCount;

    results[item.category].items.push({
      subcategory: item.subcategory,
      label: item.label,
      required: item.required,
      frequency: item.frequency,
      expected_count: expectedCount,
      uploaded_count: uploadedCount,
      status: isComplete ? "complete" : "missing",
      percent: expectedCount > 0 ? Math.round((uploadedCount / expectedCount) * 100) : 0,
    });

    results[item.category].total += 1;
    if (isComplete) {
      results[item.category].complete += 1;
    } else {
      results[item.category].missing += 1;
    }
  }

  const allItems = Object.values(results).flatMap(r => r.items);
  const totalComplete = allItems.filter(i => i.status === "complete").length;
  const totalMissing = allItems.filter(i => i.status === "missing").length;

  return {
    fiscal_year,
    regime,
    categories: results,
    summary: {
      total_items: allItems.length,
      complete: totalComplete,
      missing: totalMissing,
      percent_complete: allItems.length > 0 ? Math.round((totalComplete / allItems.length) * 100) : 0,
    },
  };
}

// Tool 18: Get IR Transactions
async function executeGetIRTransactions(
  args: ToolArgs,
  clinicId: string,
  supabase: any
): Promise<any> {
  const { year, type, payer_type, missing_data_only, limit: resultLimit } = args;
  const safeLimit = Math.min(resultLimit || 30, 50);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  let query = supabase
    .from("financial_transactions")
    .select("id, date, description, amount, type, category, payer_type, payer_name, payer_cpf, payer_is_patient, pj_source_id, irrf_amount, is_deductible, supplier_name, supplier_cpf_cnpj, receipt_number, receipt_attachment_url, patients(name, cpf), pj_sources(id, name, razao_social, nome_fantasia, cnpj)")
    .eq("clinic_id", clinicId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (type) query = query.eq("type", type);

  const { data, error } = await query;

  if (error) {
    console.error("Error in get_ir_transactions:", error);
    throw new Error(`Erro ao buscar transações IR: ${error.message}`);
  }

  let txs = data || [];

  // Filter by payer_type
  if (payer_type === "PF") {
    txs = txs.filter((t: any) => t.type === "income" && (t.payer_type === "PF" || (t.payer_is_patient && !t.pj_source_id)));
  } else if (payer_type === "PJ") {
    txs = txs.filter((t: any) => t.type === "income" && (t.payer_type === "PJ" || !!t.pj_source_id));
  }

  // Filter for missing data only
  if (missing_data_only) {
    txs = txs.filter((t: any) => {
      if (t.type === "income") {
        const isPF = t.payer_type === "PF" || (t.payer_is_patient && !t.pj_source_id);
        if (isPF) {
          const cpf = t.payer_is_patient ? t.patients?.cpf : t.payer_cpf;
          const name = t.payer_is_patient ? t.patients?.name : t.payer_name;
          return !cpf || !name;
        }
        if (t.payer_type === "PJ" && !t.pj_source_id) return true;
      }
      if (t.type === "expense" && t.is_deductible) {
        if (!t.supplier_name && !t.supplier_cpf_cnpj) return true;
        if (!t.receipt_number && !t.receipt_attachment_url) return true;
      }
      return false;
    });
  }

  // Apply limit
  const limited = txs.slice(0, safeLimit);

  // Format for output
  const formatted = limited.map((t: any) => {
    const isPF = t.type === "income" && (t.payer_type === "PF" || (t.payer_is_patient && !t.pj_source_id));
    const isPJ = t.type === "income" && (t.payer_type === "PJ" || !!t.pj_source_id);

    return {
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      is_deductible: t.is_deductible,
      irrf_amount: t.irrf_amount || 0,
      payer: isPF ? {
        type: "PF",
        name: t.payer_is_patient ? t.patients?.name : t.payer_name,
        cpf: t.payer_is_patient ? t.patients?.cpf : t.payer_cpf,
      } : isPJ ? {
        type: "PJ",
        name: t.pj_sources?.razao_social || t.pj_sources?.name || t.payer_name,
        cnpj: t.pj_sources?.cnpj || null,
        pj_source_id: t.pj_source_id,
      } : null,
      supplier: t.type === "expense" ? {
        name: t.supplier_name,
        cpf_cnpj: t.supplier_cpf_cnpj,
      } : null,
      has_receipt: !!(t.receipt_number || t.receipt_attachment_url),
    };
  });

  const totalAmount = formatted.reduce((s: number, t: any) => s + (t.amount || 0), 0);

  return {
    year,
    transactions: formatted,
    summary: {
      total_found: txs.length,
      shown: formatted.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      filters: {
        ...(type && { type }),
        ...(payer_type && { payer_type }),
        ...(missing_data_only && { missing_data_only }),
      },
    },
  };
}
