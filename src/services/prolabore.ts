import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import { financialService } from './financial';
import type {
  ProlaboreWithdrawal,
  ProlaboreInput,
  ProlaboreStatus,
  FatorRStatus,
  ProlaboreMonthlySummary,
} from '@/types/prolabore';

function firstOfMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export const prolaboreService = {
  async list(filters?: { year?: number; status?: ProlaboreStatus }): Promise<ProlaboreWithdrawal[]> {
    const { clinicId } = await getClinicContext();
    let q = supabase
      .from('prolabore_withdrawals')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('reference_month', { ascending: false })
      .order('partner_name', { ascending: true });

    if (filters?.year) {
      const start = `${filters.year}-01-01`;
      const end = `${filters.year}-12-31`;
      q = q.gte('reference_month', start).lte('reference_month', end);
    }
    if (filters?.status) {
      q = q.eq('status', filters.status);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as ProlaboreWithdrawal[];
  },

  async listByMonth(year: number, month: number): Promise<ProlaboreWithdrawal[]> {
    const { clinicId } = await getClinicContext();
    const ref = `${year}-${String(month).padStart(2, '0')}-01`;
    const { data, error } = await supabase
      .from('prolabore_withdrawals')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('reference_month', ref)
      .neq('status', 'canceled')
      .order('partner_name', { ascending: true });
    if (error) throw error;
    return (data || []) as ProlaboreWithdrawal[];
  },

  async create(input: ProlaboreInput): Promise<ProlaboreWithdrawal> {
    const { clinicId, userId } = await getClinicContext();

    const refMonth = firstOfMonth(input.reference_month);

    // Cria a expense vinculada (se solicitado) e o pró-labore numa única transação lógica
    let financial_transaction_id: string | null = null;
    if (input.create_expense && input.status === 'paid') {
      const tx = await financialService.createTransaction({
        type: 'expense',
        amount: input.amount,
        description: `Pró-labore — ${input.partner_name}`,
        category: 'Pró-labore',
        date: input.payment_date || refMonth,
      } as any);
      financial_transaction_id = (tx as any)?.id || null;
    }

    const { data, error } = await supabase
      .from('prolabore_withdrawals')
      .insert({
        clinic_id: clinicId,
        partner_user_id: input.partner_user_id ?? null,
        partner_name: input.partner_name,
        partner_cpf: input.partner_cpf ?? null,
        reference_month: refMonth,
        amount: input.amount,
        inss_amount: input.inss_amount ?? 0,
        irrf_amount: input.irrf_amount ?? 0,
        payment_date: input.payment_date ?? null,
        status: input.status ?? 'planned',
        financial_transaction_id,
        notes: input.notes ?? null,
        created_by: userId,
      } as any)
      .select()
      .single();

    if (error) {
      // rollback da expense se já criou
      if (financial_transaction_id) {
        await financialService.deleteTransaction(financial_transaction_id).catch(() => {});
      }
      throw error;
    }
    return data as ProlaboreWithdrawal;
  },

  async update(id: string, patch: Partial<ProlaboreInput>): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (patch.partner_name !== undefined) payload.partner_name = patch.partner_name;
    if (patch.partner_cpf !== undefined) payload.partner_cpf = patch.partner_cpf;
    if (patch.partner_user_id !== undefined) payload.partner_user_id = patch.partner_user_id;
    if (patch.reference_month !== undefined) payload.reference_month = firstOfMonth(patch.reference_month);
    if (patch.amount !== undefined) payload.amount = patch.amount;
    if (patch.inss_amount !== undefined) payload.inss_amount = patch.inss_amount;
    if (patch.irrf_amount !== undefined) payload.irrf_amount = patch.irrf_amount;
    if (patch.payment_date !== undefined) payload.payment_date = patch.payment_date;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.notes !== undefined) payload.notes = patch.notes;

    const { error } = await supabase
      .from('prolabore_withdrawals')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  async markPaid(id: string, paymentDate: string, createExpense = true): Promise<void> {
    const { data: row, error: fetchErr } = await supabase
      .from('prolabore_withdrawals')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    let financial_transaction_id: string | null = row.financial_transaction_id;
    if (createExpense && !financial_transaction_id) {
      const tx = await financialService.createTransaction({
        type: 'expense',
        amount: row.amount,
        description: `Pró-labore — ${row.partner_name}`,
        category: 'Pró-labore',
        date: paymentDate,
      } as any);
      financial_transaction_id = (tx as any)?.id || null;
    }

    const { error } = await supabase
      .from('prolabore_withdrawals')
      .update({
        status: 'paid',
        payment_date: paymentDate,
        financial_transaction_id,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { data: row } = await supabase
      .from('prolabore_withdrawals')
      .select('financial_transaction_id')
      .eq('id', id)
      .single();

    if (row?.financial_transaction_id) {
      await financialService.deleteTransaction(row.financial_transaction_id).catch(() => {});
    }

    const { error } = await supabase.from('prolabore_withdrawals').delete().eq('id', id);
    if (error) throw error;
  },

  /** Computes Fator R over the trailing 12 months ending in (year, month). */
  async getFatorR(year: number, month: number): Promise<FatorRStatus> {
    const { clinicId } = await getClinicContext();
    const end = new Date(year, month, 0); // last day of (year, month)
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase.rpc('calculate_factor_r', {
      p_clinic_id: clinicId,
      p_start_date: fmt(start),
      p_end_date: fmt(end),
    });
    if (error) throw error;
    return data as FatorRStatus;
  },

  async getMonthlySummary(year: number): Promise<ProlaboreMonthlySummary[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await supabase.rpc('get_prolabore_summary', {
      p_clinic_id: clinicId,
      p_year: year,
    });
    if (error) throw error;
    return (data || []) as ProlaboreMonthlySummary[];
  },

  async getThreshold(): Promise<number> {
    const { clinicId } = await getClinicContext();
    const { data } = await supabase
      .from('fiscal_profiles')
      .select('fator_r_threshold_pct')
      .eq('clinic_id', clinicId)
      .maybeSingle();
    return (data as any)?.fator_r_threshold_pct ?? 28;
  },

  async setThreshold(pct: number): Promise<void> {
    const { clinicId } = await getClinicContext();
    const { error } = await supabase
      .from('fiscal_profiles')
      .update({ fator_r_threshold_pct: pct })
      .eq('clinic_id', clinicId);
    if (error) throw error;
  },
};
