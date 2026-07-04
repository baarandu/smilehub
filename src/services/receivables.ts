import { supabase } from '@/lib/supabase';
import type { PaymentReceivable, SplitPaymentPortion, OverdueSummary, ReceivableFilters, ConfirmPaymentOverride } from '@/types/receivables';
import { financialService } from './financial';
import { calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import { getClinicContext } from './clinicContext';
import { logger } from '@/utils/logger';
import { toLocalDateString } from '@/utils/formatters';
import { computeDeductions } from '@/utils/paymentBreakdown';

export const receivablesService = {
  async createSplitPayment(
    budgetId: string,
    patientId: string,
    toothIndex: number,
    toothDescription: string,
    portions: SplitPaymentPortion[],
    splitGroupId: string,
    budgetLocation?: string | null,
    cardMachineId?: string | null,
  ): Promise<PaymentReceivable[]> {
    const { clinicId } = await getClinicContext();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const created: PaymentReceivable[] = [];

    for (let i = 0; i < portions.length; i++) {
      const portion = portions[i];

      // Skip zero/negative portions: the payment_receivables amount > 0 check
      // constraint would reject them (can happen with rounding on tiny items).
      if (!portion.amount || portion.amount <= 0) continue;

      const isCard = portion.method === 'credit' || portion.method === 'debit';
      const machineForPortion = isCard ? (cardMachineId || null) : null;

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
        card_machine_id: machineForPortion,
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
          card_machine_id: machineForPortion,
          tooth_index: toothIndex,
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
    receivedAmount?: number,
    remainderDueDate?: string,
    paymentOverride?: ConfirmPaymentOverride,
  ): Promise<PaymentReceivable> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Fetch the receivable (scoped to clinic for defense-in-depth)
    const { clinicId } = await getClinicContext();
    const { data: receivable, error: fetchError } = await supabase
      .from('payment_receivables')
      .select('*')
      .eq('id', receivableId)
      .eq('clinic_id', clinicId)
      .single();

    if (fetchError || !receivable) throw new Error('Parcela não encontrada');

    const r = receivable as PaymentReceivable;
    if (r.status === 'confirmed') throw new Error('Parcela já confirmada');
    if (r.status === 'cancelled') throw new Error('Parcela cancelada');

    const date = confirmationDate || toLocalDateString(new Date());
    const round2 = (v: number) => Math.round(v * 100) / 100;

    // --- Partial payment + payment-method change support ---
    // A parcela can be confirmed for less than its full amount (patient owes 600
    // but pays 200) and/or with a different method than scheduled (said cash, paid
    // by card). Tax and location rates are method-independent — only the card fee
    // changes — so deductions are recomputed from rates.
    const fullAmount = Number(r.amount);
    let received = receivedAmount != null ? round2(Number(receivedAmount)) : fullAmount;
    if (!Number.isFinite(received) || received <= 0 || received >= fullAmount) {
      received = fullAmount;
    }
    const isPartial = received < fullAmount;
    const remainder = round2(fullAmount - received);

    // Effective payment details for the confirmed portion (override if provided).
    const hasOverride = !!paymentOverride;
    const effMethod = paymentOverride?.method || r.payment_method;
    const effBrand = hasOverride ? (paymentOverride!.brand || null) : (r.brand || null);
    const effInstallments = hasOverride ? paymentOverride!.installments : r.installments;
    const effMachineId = hasOverride ? (paymentOverride!.cardMachineId || null) : ((r as any).card_machine_id || null);
    const effCardFeeRate = hasOverride ? Number(paymentOverride!.cardFeeRate || 0) : Number(r.card_fee_rate || 0);
    const effAnticipationRate = hasOverride ? Number(paymentOverride!.anticipationRate || 0) : Number(r.anticipation_rate || 0);
    const taxRate = Number(r.tax_rate || 0);
    const locationRate = Number(r.location_rate || 0);

    // Deductions for the confirmed portion. When nothing changed and it's a full
    // confirmation, keep the originally stored amounts to avoid rounding drift.
    let usedTax: number, usedCardFee: number, usedLoc: number, usedNet: number;
    if (isPartial || hasOverride) {
      const d = computeDeductions({ amount: received, taxRate, cardFeeRate: effCardFeeRate, locationRate });
      usedTax = d.taxAmount; usedCardFee = d.cardFeeAmount; usedLoc = d.locationAmount; usedNet = d.netAmount;
    } else {
      usedTax = Number(r.tax_amount || 0);
      usedCardFee = Number(r.card_fee_amount || 0);
      usedLoc = Number(r.location_amount || 0);
      usedNet = Number(r.net_amount || 0);
    }

    // If partial, create the remainder parcela. It keeps the ORIGINAL scheduled
    // method/rates (it is still just a plan) and its deductions are recomputed from
    // those rates on the remaining amount.
    if (isPartial) {
      const { data: groupRows } = await supabase
        .from('payment_receivables')
        .select('split_index')
        .eq('split_group_id', r.split_group_id);
      const nextIndex = (groupRows || []).reduce(
        (max: number, g: any) => Math.max(max, Number(g.split_index)), Number(r.split_index),
      ) + 1;
      const remD = computeDeductions({
        amount: remainder,
        taxRate,
        cardFeeRate: Number(r.card_fee_rate || 0),
        locationRate,
      });

      const { error: remError } = await supabase.from('payment_receivables').insert({
        clinic_id: r.clinic_id,
        patient_id: r.patient_id,
        budget_id: r.budget_id,
        split_group_id: r.split_group_id,
        split_index: nextIndex,
        amount: remainder,
        payment_method: r.payment_method,
        installments: r.installments,
        brand: r.brand || null,
        card_machine_id: (r as any).card_machine_id || null,
        due_date: remainderDueDate || r.due_date,
        status: 'pending',
        tooth_index: r.tooth_index,
        tooth_description: r.tooth_description,
        tax_rate: r.tax_rate,
        tax_amount: remD.taxAmount,
        card_fee_rate: r.card_fee_rate,
        card_fee_amount: remD.cardFeeAmount,
        anticipation_rate: r.anticipation_rate,
        anticipation_amount: 0,
        location_rate: r.location_rate,
        location_amount: remD.locationAmount,
        net_amount: remD.netAmount,
        payer_is_patient: r.payer_is_patient,
        payer_type: r.payer_type,
        payer_name: r.payer_name,
        payer_cpf: r.payer_cpf,
        pj_source_id: r.pj_source_id,
        created_by: user.id,
      });
      if (remError) throw remError;
    }

    // Create financial transaction (for the amount received, with the effective
    // — possibly changed — payment method).
    const methodLabels: Record<string, string> = {
      credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
    };
    const methodLabel = methodLabels[effMethod] || effMethod;
    const isCard = effMethod === 'credit' || effMethod === 'debit';
    const displayBrand = isCard && effBrand ? effBrand : null;
    const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

    const tx = await financialService.createTransaction({
      type: 'income',
      amount: received,
      description: `${r.tooth_description} ${paymentTag} [Parcela confirmada]`,
      category: 'Tratamento',
      date,
      patient_id: r.patient_id,
      related_entity_id: r.budget_id,
      location: budgetLocation || null,
      payment_method: effMethod,
      net_amount: usedNet,
      tax_rate: taxRate,
      tax_amount: usedTax,
      card_fee_rate: effCardFeeRate,
      card_fee_amount: usedCardFee,
      anticipation_rate: effAnticipationRate,
      anticipation_amount: 0,
      location_rate: locationRate,
      location_amount: usedLoc,
      payer_is_patient: r.payer_is_patient,
      payer_type: r.payer_type,
      payer_name: r.payer_name,
      payer_cpf: r.payer_cpf,
      pj_source_id: r.pj_source_id,
      card_machine_id: effMachineId,
      tooth_index: r.tooth_index,
    } as any);

    // Update receivable status (shrink to received amount if partial; persist the
    // effective payment method + recomputed deductions when changed).
    const updatePayload: Record<string, unknown> = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
      financial_transaction_id: tx.id,
    };
    if (isPartial) updatePayload.amount = received;
    if (isPartial || hasOverride) {
      updatePayload.payment_method = effMethod;
      updatePayload.brand = effBrand;
      updatePayload.installments = effInstallments;
      updatePayload.card_machine_id = effMachineId;
      updatePayload.tax_rate = taxRate;
      updatePayload.tax_amount = usedTax;
      updatePayload.card_fee_rate = effCardFeeRate;
      updatePayload.card_fee_amount = usedCardFee;
      updatePayload.anticipation_rate = effAnticipationRate;
      updatePayload.anticipation_amount = 0;
      updatePayload.location_rate = locationRate;
      updatePayload.location_amount = usedLoc;
      updatePayload.net_amount = usedNet;
    }

    const { data: updated, error: updateError } = await supabase
      .from('payment_receivables')
      .update(updatePayload)
      .eq('id', receivableId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Sync budget tooth JSON with updated receivable statuses
    await receivablesService._syncBudgetToothStatus(r.split_group_id, r.budget_id, r.tooth_index);

    return updated as PaymentReceivable;
  },

  async cancelReceivable(receivableId: string): Promise<void> {
    const { clinicId } = await getClinicContext();

    // Fetch before cancelling to get group info
    const { data: receivable } = await supabase
      .from('payment_receivables')
      .select('split_group_id, budget_id, tooth_index')
      .eq('id', receivableId)
      .eq('clinic_id', clinicId)
      .single();

    const { error } = await supabase
      .from('payment_receivables')
      .update({ status: 'cancelled' })
      .eq('id', receivableId)
      .eq('clinic_id', clinicId);

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
      logger.error('Error fetching receivables group:', groupError);
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
      logger.error('Error fetching budget for sync:', budgetError);
      return;
    }

    const parsed = JSON.parse(budget.notes || '{}');
    const teeth = parsed.teeth as ToothEntry[];
    if (!teeth || !teeth[toothIndex]) {
      logger.error('Tooth not found at index', toothIndex, 'in budget', budgetId);
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
    const allActiveConfirmed = activeReceivables.length > 0 && activeReceivables.every(r => r.status === 'confirmed');
    const anyPending = activeReceivables.some(r => r.status === 'pending' || r.status === 'overdue');

    // Only promote to 'paid' when the confirmed parcels (+ any patient credit used)
    // actually cover the tooth's value. Cancelling a parcel removes it from the
    // "active" set, so "all active confirmed" alone would wrongly mark a
    // partially-received tooth as fully paid. Compare in cents to avoid FP drift.
    const confirmedAmount = groupReceivables
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const creditUsed = Number((teeth[toothIndex] as any).financialBreakdown?.creditUsed || 0);
    const toothValue = Object.values(teeth[toothIndex].values || {})
      .reduce((a: number, b) => a + (parseInt(b as string) || 0) / 100, 0);
    const fullyCovered = Math.round((confirmedAmount + creditUsed) * 100) >= Math.round(toothValue * 100);

    if (allActiveConfirmed && fullyCovered) {
      teeth[toothIndex].status = 'paid';
      teeth[toothIndex].paymentDate = toLocalDateString(new Date());
    } else if (anyPending || confirmedAmount > 0) {
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
      logger.error('Error saving budget after sync:', saveError);
    }
  },
};
