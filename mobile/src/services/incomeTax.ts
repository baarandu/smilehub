import { supabase } from '../lib/supabase';
import type {
  FiscalProfile,
  PJSource,
  IRSummary,
  IRValidationIssue,
  TransactionWithIR,
  FiscalProfileFormData,
  PJSourceFormData,
  PayerFormData,
  SupplierFormData,
} from '../types/incomeTax';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const incomeTaxService = {
  /**
   * Get the user's clinic ID
   */
  async getClinicId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: clinicUser } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .single();

    return (clinicUser as any)?.clinic_id || null;
  },

  // ============ FISCAL PROFILE ============

  async getFiscalProfile(): Promise<FiscalProfile | null> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return null;

    const { data, error } = await supabase
      .from('fiscal_profiles')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle();

    if (error) throw error;
    return data as FiscalProfile | null;
  },

  async saveFiscalProfile(formData: FiscalProfileFormData): Promise<FiscalProfile> {
    const clinicId = await this.getClinicId();
    if (!clinicId) throw new Error('Clinica nao encontrada');

    const profileData = {
      clinic_id: clinicId,
      pf_enabled: formData.pf_enabled,
      pf_cpf: formData.pf_cpf || null,
      pf_cro: formData.pf_cro || null,
      pf_address: formData.pf_address || null,
      pf_city: formData.pf_city || null,
      pf_state: formData.pf_state || null,
      pf_zip_code: formData.pf_zip_code || null,
      pf_uses_carne_leao: formData.pf_uses_carne_leao,
      pj_enabled: formData.pj_enabled,
      pj_cnpj: formData.pj_cnpj || null,
      pj_razao_social: formData.pj_razao_social || null,
      pj_nome_fantasia: formData.pj_nome_fantasia || null,
      pj_regime_tributario: formData.pj_regime_tributario || null,
      pj_cnae: formData.pj_cnae || null,
      simples_fator_r_mode: formData.simples_fator_r_mode || 'manual',
      simples_monthly_payroll: formData.simples_monthly_payroll ? parseFloat(formData.simples_monthly_payroll) : 0,
      simples_anexo: formData.simples_anexo || 'anexo_iii',
      updated_at: new Date().toISOString(),
    };

    const existing = await this.getFiscalProfile();

    if (existing) {
      const { data, error } = await supabase
        .from('fiscal_profiles')
        .update(profileData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as FiscalProfile;
    } else {
      const { data, error } = await supabase
        .from('fiscal_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      return data as FiscalProfile;
    }
  },

  // ============ PJ SOURCES ============

  async getPJSources(): Promise<PJSource[]> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return [];

    const { data, error } = await supabase
      .from('pj_sources')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('razao_social', { ascending: true });

    if (error) throw error;
    return (data as PJSource[]) || [];
  },

  async createPJSource(formData: PJSourceFormData): Promise<PJSource> {
    const clinicId = await this.getClinicId();
    if (!clinicId) throw new Error('Clinica nao encontrada');

    const { data, error } = await supabase
      .from('pj_sources')
      .insert({
        clinic_id: clinicId,
        cnpj: formData.cnpj,
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia || null,
        is_active: formData.is_active,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PJSource;
  },

  async updatePJSource(id: string, formData: Partial<PJSourceFormData>): Promise<PJSource> {
    const { data, error } = await supabase
      .from('pj_sources')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PJSource;
  },

  async deletePJSource(id: string): Promise<void> {
    const { error } = await supabase
      .from('pj_sources')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ============ TRANSACTIONS ============

  async getIncomeTransactionsForYear(year: number): Promise<TransactionWithIR[]> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return [];

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        patient:patients(name, cpf),
        pj_source:pj_sources(*)
      `)
      .eq('clinic_id', clinicId)
      .eq('type', 'income')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data as unknown as TransactionWithIR[]) || [];
  },

  async getExpenseTransactionsForYear(year: number): Promise<TransactionWithIR[]> {
    const clinicId = await this.getClinicId();
    if (!clinicId) return [];

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data as unknown as TransactionWithIR[]) || [];
  },

  async updateTransactionPayerFields(id: string, formData: PayerFormData): Promise<void> {
    const irrfValue = formData.irrf_amount
      ? parseFloat(formData.irrf_amount.replace(/\./g, '').replace(',', '.'))
      : 0;

    const { error } = await supabase
      .from('financial_transactions')
      .update({
        payer_is_patient: formData.payer_is_patient,
        payer_name: formData.payer_name || null,
        payer_cpf: formData.payer_cpf || null,
        payer_type: formData.payer_type,
        pj_source_id: formData.pj_source_id || null,
        irrf_amount: irrfValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  async updatePatientCPF(patientId: string, cpf: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .update({
        cpf: cpf || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId);

    if (error) throw error;
  },

  async updateTransactionSupplierFields(id: string, formData: SupplierFormData): Promise<void> {
    const { error } = await supabase
      .from('financial_transactions')
      .update({
        supplier_name: formData.supplier_name || null,
        supplier_cpf_cnpj: formData.supplier_cpf_cnpj || null,
        receipt_number: formData.receipt_number || null,
        is_deductible: formData.is_deductible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  // ============ REPORTS ============

  async generateIRSummary(year: number): Promise<IRSummary> {
    const [incomeTransactions, expenseTransactions, fiscalProfile] = await Promise.all([
      this.getIncomeTransactionsForYear(year),
      this.getExpenseTransactionsForYear(year),
      this.getFiscalProfile(),
    ]);

    // Monthly breakdown
    const monthly = [];
    for (let month = 1; month <= 12; month++) {
      const monthIncomes = incomeTransactions.filter(t => {
        const txMonth = new Date(t.date).getMonth() + 1;
        return txMonth === month;
      });

      const monthExpenses = expenseTransactions.filter(t => {
        const txMonth = new Date(t.date).getMonth() + 1;
        return txMonth === month && t.is_deductible;
      });

      const income_pf = monthIncomes
        .filter(t => t.payer_type === 'PF' || (t.payer_is_patient && !t.pj_source_id))
        .reduce((sum, t) => sum + t.amount, 0);

      const income_pj = monthIncomes
        .filter(t => t.payer_type === 'PJ' || t.pj_source_id)
        .reduce((sum, t) => sum + t.amount, 0);

      const irrf_total = monthIncomes.reduce((sum, t) => sum + (t.irrf_amount || 0), 0);
      const expenses_deductible = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

      monthly.push({
        month,
        month_name: MONTH_NAMES[month - 1],
        income_pf,
        income_pj,
        income_total: income_pf + income_pj,
        irrf_total,
        expenses_deductible,
      });
    }

    // PF Payers
    const payersPFMap = new Map();
    for (const t of incomeTransactions) {
      if (t.payer_type === 'PJ' || t.pj_source_id) continue;

      const cpf = t.payer_is_patient ? t.patient?.cpf : t.payer_cpf;
      const name = t.payer_is_patient ? t.patient?.name : t.payer_name;

      if (!cpf || !name) continue;

      const existing = payersPFMap.get(cpf);
      if (existing) {
        existing.total_amount += t.amount;
        existing.transaction_count += 1;
      } else {
        payersPFMap.set(cpf, { cpf, name, total_amount: t.amount, transaction_count: 1 });
      }
    }
    const payers_pf = Array.from(payersPFMap.values()).sort((a, b) => b.total_amount - a.total_amount);

    // PJ Sources
    const payersPJMap = new Map();
    for (const t of incomeTransactions) {
      if (!t.pj_source_id && t.payer_type !== 'PJ') continue;

      const source = t.pj_source;
      if (source) {
        const existing = payersPJMap.get(source.cnpj);
        if (existing) {
          existing.total_amount += t.amount;
          existing.irrf_total += t.irrf_amount || 0;
          existing.transaction_count += 1;
        } else {
          payersPJMap.set(source.cnpj, {
            cnpj: source.cnpj,
            razao_social: source.razao_social,
            nome_fantasia: source.nome_fantasia,
            total_amount: t.amount,
            irrf_total: t.irrf_amount || 0,
            transaction_count: 1,
          });
        }
      }
    }
    const payers_pj = Array.from(payersPJMap.values()).sort((a, b) => b.total_amount - a.total_amount);

    // Expenses by category
    const expensesCategoryMap = new Map();
    for (const t of expenseTransactions) {
      if (!t.is_deductible) continue;

      const category = t.category || 'Outros';
      const existing = expensesCategoryMap.get(category);
      if (existing) {
        existing.total_amount += t.amount;
        existing.transaction_count += 1;
      } else {
        expensesCategoryMap.set(category, { category, total_amount: t.amount, transaction_count: 1 });
      }
    }
    const expenses_by_category = Array.from(expensesCategoryMap.values()).sort((a, b) => b.total_amount - a.total_amount);

    // Totals
    const total_income_pf = monthly.reduce((sum, m) => sum + m.income_pf, 0);
    const total_income_pj = monthly.reduce((sum, m) => sum + m.income_pj, 0);
    const total_income = total_income_pf + total_income_pj;
    const total_irrf = monthly.reduce((sum, m) => sum + m.irrf_total, 0);
    const total_expenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const total_expenses_deductible = monthly.reduce((sum, m) => sum + m.expenses_deductible, 0);
    const net_result = total_income - total_expenses_deductible;

    return {
      year,
      fiscal_profile: fiscalProfile,
      total_income_pf,
      total_income_pj,
      total_income,
      total_irrf,
      total_expenses,
      total_expenses_deductible,
      net_result,
      monthly,
      payers_pf,
      payers_pj,
      expenses_by_category,
    };
  },

  async validateTransactionsForYear(year: number): Promise<IRValidationIssue[]> {
    const [incomeTransactions, expenseTransactions, fiscalProfile] = await Promise.all([
      this.getIncomeTransactionsForYear(year),
      this.getExpenseTransactionsForYear(year),
      this.getFiscalProfile(),
    ]);

    const issues: IRValidationIssue[] = [];

    if (!fiscalProfile || (!fiscalProfile.pf_enabled && !fiscalProfile.pj_enabled)) {
      issues.push({
        severity: 'error',
        message: 'Perfil fiscal nao configurado. Configure os dados PF ou PJ.',
        field: 'fiscal_profile',
      });
    }

    for (const t of incomeTransactions) {
      if (t.payer_type === 'PF' || (t.payer_is_patient && !t.pj_source_id)) {
        const cpf = t.payer_is_patient ? t.patient?.cpf : t.payer_cpf;
        if (!cpf) {
          issues.push({
            severity: 'warning',
            message: `Receita sem CPF do pagador: ${t.description}`,
            transaction_id: t.id,
            transaction_date: t.date,
          });
        }
      }

      if (t.payer_type === 'PJ' && !t.pj_source_id) {
        issues.push({
          severity: 'warning',
          message: `Receita PJ sem fonte pagadora: ${t.description}`,
          transaction_id: t.id,
          transaction_date: t.date,
        });
      }
    }

    for (const t of expenseTransactions) {
      if (!t.is_deductible) continue;

      if (!t.supplier_name) {
        issues.push({
          severity: 'warning',
          message: `Despesa dedutivel sem fornecedor: ${t.description}`,
          transaction_id: t.id,
          transaction_date: t.date,
        });
      }
    }

    return issues;
  },
};
