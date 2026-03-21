import { supabase } from '../lib/supabase';
import { financialService } from './financial';
import type { PaymentReceivable, OverdueSummary, ReceivableFilters } from '../types/receivables';

async function getClinicId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .single();

    if (!clinicUser?.clinic_id) throw new Error('Clínica não encontrada');
    return (clinicUser as any).clinic_id;
}

export const receivablesService = {
    async confirmReceivable(
        receivableId: string,
        confirmationDate?: string,
        budgetLocation?: string | null,
    ): Promise<PaymentReceivable> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

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

        const methodLabels: Record<string, string> = {
            credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
        };
        const methodLabel = methodLabels[r.payment_method] || r.payment_method;
        const isCard = r.payment_method === 'credit' || r.payment_method === 'debit';
        const displayBrand = isCard && r.brand ? r.brand : null;
        const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

        const tx = await financialService.create({
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

        // Sync budget tooth
        await this._syncBudgetToothStatus(r.split_group_id, r.budget_id, r.tooth_index);

        return updated as PaymentReceivable;
    },

    async cancelReceivable(receivableId: string): Promise<void> {
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

        if (receivable) {
            await this._syncBudgetToothStatus(
                (receivable as any).split_group_id,
                (receivable as any).budget_id,
                (receivable as any).tooth_index,
            );
        }
    },

    async getClinicReceivables(filters?: ReceivableFilters): Promise<PaymentReceivable[]> {
        const clinicId = await getClinicId();

        let query = supabase
            .from('payment_receivables')
            .select('*, patients(name, phone)')
            .eq('clinic_id', clinicId)
            .order('due_date', { ascending: true });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        } else {
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

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as PaymentReceivable[];
    },

    async getOverdueSummary(): Promise<OverdueSummary> {
        const clinicId = await getClinicId();

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
        const clinicId = await getClinicId();

        const { data, error } = await supabase
            .rpc('get_receivables_due_today', { p_clinic_id: clinicId });

        if (error) throw error;
        return (data || []) as PaymentReceivable[];
    },

    async _syncBudgetToothStatus(
        splitGroupId: string,
        budgetId: string,
        toothIndex: number,
    ): Promise<void> {
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

        const { data: budget, error: budgetError } = await supabase
            .from('budgets')
            .select('id, notes, status')
            .eq('id', budgetId)
            .single();

        if (budgetError || !budget) {
            console.error('Error fetching budget for sync:', budgetError);
            return;
        }

        const parsed = JSON.parse((budget as any).notes || '{}');
        const teeth = parsed.teeth as any[];
        if (!teeth || !teeth[toothIndex]) {
            console.error('Tooth not found at index', toothIndex);
            return;
        }

        teeth[toothIndex].splitPayments = groupReceivables.map(r => ({
            receivableId: r.id,
            amount: r.amount,
            method: r.payment_method,
            dueDate: r.due_date,
            status: r.status,
        }));

        const activeReceivables = groupReceivables.filter(r => r.status !== 'cancelled');
        const allConfirmed = activeReceivables.length > 0 && activeReceivables.every(r => r.status === 'confirmed');
        const anyPending = activeReceivables.some(r => r.status === 'pending' || r.status === 'overdue');

        if (allConfirmed) {
            teeth[toothIndex].status = 'paid';
            teeth[toothIndex].paymentDate = new Date().toISOString().split('T')[0];
        } else if (anyPending) {
            teeth[toothIndex].status = 'partially_paid';
        }

        // Recalculate budget status
        const statuses = teeth.map((t: any) => t.status);
        let newBudgetStatus = 'pending';
        if (statuses.every((s: string) => s === 'paid')) {
            newBudgetStatus = 'completed';
        } else if (statuses.some((s: string) => s === 'paid' || s === 'partially_paid' || s === 'in_progress')) {
            newBudgetStatus = 'in_progress';
        }

        const updatedNotes = JSON.stringify({ ...parsed, teeth });

        const { error: saveError } = await supabase
            .from('budgets')
            .update({ notes: updatedNotes, status: newBudgetStatus })
            .eq('id', budgetId);

        if (saveError) {
            console.error('Error saving budget after sync:', saveError);
        }
    },
};
