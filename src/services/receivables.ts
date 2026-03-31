import { supabase } from '@/lib/supabase';
import type { PaymentReceivable, SplitPaymentPortion, OverdueSummary, ReceivableFilters } from '@/types/receivables';
import { financialService } from './financial';
import { calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import { getClinicContext } from './clinicContext';

export const receivablesService = {
  async createSplitPayment(
    budgetId: string,
    patientId: string,
    toothIndex: number,
    toothDescription: string,
    portions: SplitPaymentPortion[],
    splitGroupId: string,
    budgetLocation?: string | null,
  ): Promise<PaymentReceivable[]> {
    const { clinicId } = await getClinicContext();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const created: PaymentReceivable[] = [];

    for (let i = 0; i < portions.length; i++) {
      const portion = portions[i];

      // Build the receivable row
      const receivable = {
        clinic_id: clinicId,
        patient_id: patientId,
        budget_id: budgetId,
        split_group_id: splitGroupId,
        split_index: i,
        amount: portion.amount,
        payment_method: portion.method,
        installments: portion.installments,
        brand: portion.brand || null,
        due_date: portion.dueDate,
        status: portion.isImmediate ? 'confirmed' : 'pending',
        confirmed_at: portion.isImmediate ? new Date().toISOString() : null,
        confirmed_by: portion.isImmediate ? user.id : null,
        tooth_index: toothIndex,
        tooth_description: toothDescription,
        tax_rate: portion.breakdown.taxRate,
        tax_amount: portion.breakdown.taxAmount,
        card_fee_rate: portion.breakdown.cardFeeRate,
        card_fee_amount: portion.breakdown.cardFeeAmount,
        anticipation_rate: portion.breakdown.anticipationRate,
        anticipation_amount: portion.breakdown.anticipationAmount,
        location_rate: portion.breakdown.locationRate,
        location_amount: portion.breakdown.locationAmount,
        net_amount: portion.breakdown.netAmount,
        payer_is_patient: portion.payerData?.payer_is_patient ?? true,
        payer_type: portion.payerData?.payer_type || 'PF',
        payer_name: portion.payerData?.payer_name || null,
        payer_cpf: portion.payerData?.payer_cpf || null,
        pj_source_id: portion.payerData?.pj_source_id || null,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('payment_receivables')
        .insert(receivable)
        .select()
        .single();

      if (error) throw error;

      const row = data as PaymentReceivable;

      // If immediate, also create financial_transaction
      if (portion.isImmediate) {
        const methodLabels: Record<string, string> = {
          credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
        };
        const methodLabel = methodLabels[portion.method] || portion.method;
        const isCard = portion.method === 'credit' || portion.method === 'debit';
        const displayBrand = isCard && portion.brand ? portion.brand : null;
        const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

        const tx = await financialService.createTransaction({
          type: 'income',
          amount: portion.amount,
          description: `${toothDescription} ${paymentTag} [Split ${i + 1}/${portions.length}]`,
          category: 'Tratamento',
          date: portion.dueDate,
          patient_id: patientId,
          related_entity_id: budgetId,
          location: budgetLocation || null,
          payment_method: portion.method,
          net_amount: portion.breakdown.netAmount,
          tax_rate: portion.breakdown.taxRate,
          tax_amount: portion.breakdown.taxAmount,
          card_fee_rate: portion.breakdown.cardFeeRate,
          card_fee_amount: portion.breakdown.cardFeeAmount,
          anticipation_rate: portion.breakdown.anticipationRate,
          anticipation_amount: portion.breakdown.anticipationAmount,
          location_rate: portion.breakdown.locationRate,
          location_amount: portion.breakdown.locationAmount,
          payer_is_patient: portion.payerData?.payer_is_patient ?? true,
          payer_type: portion.payerData?.payer_type || 'PF',
          payer_name: portion.payerData?.payer_name || null,
          payer_cpf: portion.payerData?.payer_cpf || null,
          pj_source_id: portion.payerData?.pj_source_id || null,
        } as any);

        // Update receivable with the transaction ID
        await supabase
          .from('payment_receivables')
          .update({ financial_transaction_id: tx.id })
          .eq('id', row.id);

        row.financial_transaction_id = tx.id;
      }

      created.push(row);
    }

    return created;
  },

  async confirmReceivable(
    receivableId: string,
    confirmationDate?: string,
    budgetLocation?: string | null,
  ): Promise<PaymentReceivable> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Fetch the receivable
    const { data: receivable, error: fetchError } = await supabase
      .from('payment_receivables')
      .select('*')
      .eq('id', receivableId)
      .single();

    if (fetchError || !receivable) throw new Error('Parcela não encontrada');

    const r = receivable as PaymentReceivable;
    if (r.status === 'confirmed') throw new Error('Parcela já confirmada');
    if (r.status === 'cancelled') throw new Error('Parcela cancelada');

    const date = confirmationDate || new Date().toISOString().split('T')[0];

    // Create financial transaction
    const methodLabels: Record<string, string> = {
      credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
    };
    const methodLabel = methodLabels[r.payment_method] || r.payment_method;
    const isCard = r.payment_method === 'credit' || r.payment_method === 'debit';
    const displayBrand = isCard && r.brand ? r.brand : null;
    const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

    const tx = await financialService.createTransaction({
      type: 'income',
      amount: r.amount,
      description: `${r.tooth_description} ${paymentTag} [Parcela confirmada]`,
      category: 'Tratamento',
      date,
      patient_id: r.patient_id,
      related_entity_id: r.budget_id,
      location: budgetLocation || null,
      payment_method: r.payment_method,
      net_amount: r.net_amount,
      tax_rate: r.tax_rate,
      tax_amount: r.tax_amount,
      card_fee_rate: r.card_fee_rate,
      card_fee_amount: r.card_fee_amount,
      anticipation_rate: r.anticipation_rate,
      anticipation_amount: r.anticipation_amount,
      location_rate: r.location_rate,
      location_amount: r.location_amount,
      payer_is_patient: r.payer_is_patient,
      payer_type: r.payer_type,
      payer_name: r.payer_name,
      payer_cpf: r.payer_cpf,
      pj_source_id: r.pj_source_id,
    } as any);

    // Update receivable status
    const { data: updated, error: updateError } = await supabase
      .from('payment_receivables')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
        financial_transaction_id: tx.id,
      })
      .eq('id', receivableId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Sync budget tooth JSON with updated receivable statuses
    await receivablesService._syncBudgetToothStatus(r.split_group_id, r.budget_id, r.tooth_index);

    return updated as PaymentReceivable;
  },

  async cancelReceivable(receivableId: string): Promise<void> {
    // Fetch before cancelling to get group info
    const { data: receivable } = await supabase
      .from('payment_receivables')
      .select('split_group_id, budget_id, tooth_index')
      .eq('id', receivableId)
      .single();

    const { error } = await supabase
      .from('payment_receivables')
      .update({ status: 'cancelled' })
      .eq('id', receivableId);

    if (error) throw error;

    // Sync budget tooth
    if (receivable) {
      await receivablesService._syncBudgetToothStatus(
        (receivable as any).split_group_id,
        (receivable as any).budget_id,
        (receivable as any).tooth_index,
      );
    }
  },

  async getPatientReceivables(patientId: string): Promise<PaymentReceivable[]> {
    const { data, error } = await supabase
      .rpc('get_patient_receivables', { p_patient_id: patientId });

    if (error) throw error;
    return (data || []) as PaymentReceivable[];
  },

  async getClinicReceivables(filters?: ReceivableFilters, page?: number, pageSize = 500): Promise<PaymentReceivable[]> {
    const { clinicId } = await getClinicContext();

    let query = supabase
      .from('payment_receivables')
      .select('*, patients(name, phone)')
      .eq('clinic_id', clinicId)
      .order('due_date', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      // By default, show active ones
      query = query.in('status', ['pending', 'overdue', 'confirmed']);
    }

    if (filters?.startDate) {
      query = query.gte('due_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('due_date', filters.endDate);
    }
    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (page !== undefined) {
      const from = page * pageSize;
      query = query.range(from, from + pageSize - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PaymentReceivable[];
  },

  async getOverdueSummary(): Promise<OverdueSummary> {
    const { clinicId } = await getClinicContext();

    const { data, error } = await supabase
      .rpc('get_overdue_summary', { p_clinic_id: clinicId });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return {
      total_count: row?.total_count || 0,
      total_amount: row?.total_amount || 0,
      patients_count: row?.patients_count || 0,
    };
  },

  async getReceivablesDueToday(): Promise<PaymentReceivable[]> {
    const { clinicId } = await getClinicContext();

    const { data, error } = await supabase
      .rpc('get_receivables_due_today', { p_clinic_id: clinicId });

    if (error) throw error;
    return (data || []) as PaymentReceivable[];
  },

  /**
   * Get receivables linked to specific financial transaction IDs.
   * Used to determine origin month of each income transaction.
   */
  async getReceivablesByTransactionIds(transactionIds: string[]): Promise<PaymentReceivable[]> {
    if (transactionIds.length === 0) return [];

    const { data, error } = await supabase
      .from('payment_receivables')
      .select('id, financial_transaction_id, created_at, split_group_id, split_index, amount, status')
      .in('financial_transaction_id', transactionIds);

    if (error) throw error;
    return (data || []) as PaymentReceivable[];
  },

  /**
   * Get all receivables created in a date range (for "faturamento gerado" calculation).
   * Returns all receivables regardless of status.
   */
  async getReceivablesCreatedInPeriod(startDate: string, endDate: string): Promise<PaymentReceivable[]> {
    const { clinicId } = await getClinicContext();

    const { data, error } = await supabase
      .from('payment_receivables')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as PaymentReceivable[];
  },

  async getReceivablesByGroup(splitGroupId: string): Promise<PaymentReceivable[]> {
    const { data, error } = await supabase
      .from('payment_receivables')
      .select('*')
      .eq('split_group_id', splitGroupId)
      .order('split_index', { ascending: true });

    if (error) throw error;
    return (data || []) as PaymentReceivable[];
  },

  /**
   * Sync the budget tooth JSON after a receivable status change.
   * Updates splitPayments statuses in the tooth and promotes
   * tooth to 'paid' when all active receivables are confirmed.
   */
  async _syncBudgetToothStatus(
    splitGroupId: string,
    budgetId: string,
    toothIndex: number,
  ): Promise<void> {
    // 1. Get all receivables in the group (direct query, not via this)
    const { data: groupData, error: groupError } = await supabase
      .from('payment_receivables')
      .select('*')
      .eq('split_group_id', splitGroupId)
      .order('split_index', { ascending: true });

    if (groupError) {
      console.error('Error fetching receivables group:', groupError);
      return;
    }

    const groupReceivables = (groupData || []) as PaymentReceivable[];
    // 2. Fetch current budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('id, notes, status')
      .eq('id', budgetId)
      .single();

    if (budgetError || !budget) {
      console.error('Error fetching budget for sync:', budgetError);
      return;
    }

    const parsed = JSON.parse(budget.notes || '{}');
    const teeth = parsed.teeth as ToothEntry[];
    if (!teeth || !teeth[toothIndex]) {
      console.error('Tooth not found at index', toothIndex, 'in budget', budgetId);
      return;
    }

    // 3. Update splitPayments array on the tooth
    teeth[toothIndex].splitPayments = groupReceivables.map(r => ({
      receivableId: r.id,
      amount: r.amount,
      method: r.payment_method,
      dueDate: r.due_date,
      status: r.status,
    }));

    // 4. Determine new tooth status
    const activeReceivables = groupReceivables.filter(r => r.status !== 'cancelled');
    const allConfirmed = activeReceivables.length > 0 && activeReceivables.every(r => r.status === 'confirmed');
    const anyPending = activeReceivables.some(r => r.status === 'pending' || r.status === 'overdue');

    const prevStatus = teeth[toothIndex].status;

    if (allConfirmed) {
      teeth[toothIndex].status = 'paid';
      teeth[toothIndex].paymentDate = new Date().toISOString().split('T')[0];
    } else if (anyPending) {
      teeth[toothIndex].status = 'partially_paid';
    }

    // 5. Recalculate budget status and save
    const newBudgetStatus = calculateBudgetStatus(teeth);
    const updatedNotes = JSON.stringify({ ...parsed, teeth });

    const { error: saveError } = await supabase
      .from('budgets')
      .update({ notes: updatedNotes, status: newBudgetStatus })
      .eq('id', budgetId);

    if (saveError) {
      console.error('Error saving budget after sync:', saveError);
    } else {
    }
  },
};
