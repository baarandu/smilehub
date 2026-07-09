import { supabase } from '@/lib/supabase';
import type { Budget, BudgetInsert, BudgetUpdate, BudgetItem, BudgetItemInsert, BudgetWithItems } from '@/types/database';
import { calculateBudgetStatus } from '@/utils/budgetUtils';
import { getClinicContext } from './clinicContext';
import { logger } from '@/utils/logger';

const MAX_ITEM_VALUE_CENTS = 10_000_000; // R$ 100.000,00

function validateBudgetItems(items: Omit<BudgetItemInsert, 'budget_id'>[]) {
    for (const item of items) {
        const val = (item as any).value;
        if (val !== undefined && val !== null) {
            const num = typeof val === 'string' ? Number(val) : val;
            if (!Number.isFinite(num) || num < 0 || num > MAX_ITEM_VALUE_CENTS) {
                throw new Error('Valor do item inválido. Deve ser entre R$ 0,00 e R$ 100.000,00.');
            }
        }
    }
}

export const budgetsService = {
    async getByPatient(patientId: string): Promise<BudgetWithItems[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('patient_id', patientId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch creator names for budgets with created_by
        const budgets = data || [];
        const responsibleIds = budgets.map((b: any) => {
            try {
                return JSON.parse(b.notes || '{}')?.responsibleDentistId || null;
            } catch {
                return null;
            }
        });
        const creatorIds = [...new Set([...budgets.map(b => b.created_by), ...responsibleIds].filter(Boolean))];

        let creatorNames: Record<string, string> = {};
        if (creatorIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_profiles_for_users', { user_ids: creatorIds });
            if (profiles) {
                creatorNames = profiles.reduce((acc: Record<string, string>, p: any) => {
                    acc[p.id] = p.full_name || p.email;
                    return acc;
                }, {});
            }
        }

        return budgets.map(b => ({
            ...b,
            created_by_name: b.created_by ? creatorNames[b.created_by] || null : null,
            responsible_dentist_name: (() => {
                try {
                    const parsed = JSON.parse((b as any).notes || '{}');
                    return parsed.responsibleDentistName || (parsed.responsibleDentistId ? creatorNames[parsed.responsibleDentistId] : null);
                } catch {
                    return null;
                }
            })(),
        })) as BudgetWithItems[];
    },

    async create(budget: BudgetInsert, items: Omit<BudgetItemInsert, 'budget_id'>[]): Promise<BudgetWithItems> {
        validateBudgetItems(items);

        const { userId, clinicId } = await getClinicContext();

        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .insert({ ...budget, clinic_id: clinicId, created_by: userId })
            .select()
            .single();

        if (budgetError) throw budgetError;
        if (!budgetData) throw new Error('Failed to create budget');

        // Create budget items
        if (items.length > 0) {
            const itemsWithBudgetId = items.map(item => ({
                ...item,
                budget_id: budgetData.id,
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(itemsWithBudgetId);

            if (itemsError) throw itemsError;
        }

        // Return full budget with items
        return this.getById(budgetData.id);
    },

    async getById(id: string): Promise<BudgetWithItems> {
        const { clinicId } = await getClinicContext();
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Budget not found');
        return data as unknown as BudgetWithItems;
    },

    async update(id: string, budget: BudgetUpdate): Promise<Budget> {
        const { clinicId } = await getClinicContext();
        const { data, error } = await supabase
            .from('budgets')
            .update(budget)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to update budget');
        return data as Budget;
    },

    // Soft-delete: marca deleted_at em vez de apagar. Não dispara o CASCADE de
    // payment_receivables, então parcelas e recebimentos são preservados e o
    // orçamento pode ser restaurado. Ver migração 20260626_budgets_soft_delete.
    async delete(id: string): Promise<void> {
        const { clinicId } = await getClinicContext();

        const { data: deleted, error } = await supabase
            .from('budgets')
            .update({ deleted_at: new Date().toISOString() } as any)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .select('id');

        if (error) throw error;
        if (!deleted || deleted.length === 0) {
            throw new Error('Não foi possível excluir o orçamento. Verifique se você tem permissão.');
        }
    },

    // Restaura um orçamento da lixeira.
    async restore(id: string): Promise<void> {
        const { clinicId } = await getClinicContext();
        const { error } = await supabase
            .from('budgets')
            .update({ deleted_at: null } as any)
            .eq('id', id)
            .eq('clinic_id', clinicId);
        if (error) throw error;
    },

    // O que a exclusão definitiva vai levar junto — usado no diálogo de
    // confirmação da lixeira para o usuário saber o impacto antes de apagar.
    async getHardDeleteImpact(id: string): Promise<{ txCount: number; txTotal: number; nfseCount: number }> {
        const { clinicId } = await getClinicContext();
        const [txRes, nfseRes] = await Promise.all([
            supabase
                .from('financial_transactions')
                .select('amount')
                .eq('clinic_id', clinicId)
                .eq('type', 'income')
                .eq('related_entity_id', id),
            supabase
                .from('nfse_documents')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .eq('budget_id', id)
                .eq('issued_externally', true),
        ]);
        const txs = txRes.data || [];
        return {
            txCount: txs.length,
            txTotal: txs.reduce((s, t: any) => s + Number(t.amount || 0), 0),
            nfseCount: nfseRes.count || 0,
        };
    },

    // Exclusão DEFINITIVA (apaga de vez; dispara o CASCADE das parcelas).
    // Usada apenas pelo "excluir definitivamente" dentro da lixeira.
    async hardDelete(id: string): Promise<void> {
        const { clinicId } = await getClinicContext();

        // Receitas lançadas pelos pagamentos deste orçamento: sem ele viram
        // receita órfã, presa para sempre em "pagamentos sem nota" na aba
        // Notas Fiscais. Excluir de vez = esses pagamentos não valem.
        await supabase
            .from('financial_transactions')
            .delete()
            .eq('clinic_id', clinicId)
            .eq('type', 'income')
            .eq('related_entity_id', id);

        // Marcações "nota fiscal emitida" são por item do orçamento e perdem o
        // sentido sem ele (a FK só anularia o budget_id, deixando a marcação
        // órfã). Notas reais anexadas (com XML/PDF) são preservadas.
        await supabase
            .from('nfse_documents')
            .delete()
            .eq('clinic_id', clinicId)
            .eq('budget_id', id)
            .eq('issued_externally', true);

        await supabase
            .from('budget_items')
            .delete()
            .eq('budget_id', id);

        const { data: deleted, error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select('id');

        if (error) throw error;
        if (!deleted || deleted.length === 0) {
            throw new Error('Não foi possível excluir o orçamento. Verifique se você tem permissão.');
        }
    },

    // Orçamentos na lixeira de um paciente (para restaurar / excluir de vez).
    async listDeletedByPatient(patientId: string): Promise<BudgetWithItems[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('patient_id', patientId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (error) throw error;
        return (data || []) as unknown as BudgetWithItems[];
    },

    async updateStatus(id: string, status: Budget['status']): Promise<Budget> {
        return this.update(id, { status });
    },

    async getAllPending(clinicId?: string): Promise<{ budgetId: string; patientId: string; patientName: string; date: string; tooth: any; totalBudgetValue: number }[]> {
        const resolvedClinicId = clinicId || (await getClinicContext()).clinicId;

        const { data, error } = await supabase.rpc('get_pending_budget_items', {
            p_clinic_id: resolvedClinicId,
        });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            budgetId: row.budget_id,
            patientId: row.patient_id,
            patientName: row.patient_name || 'Paciente',
            date: row.budget_date,
            tooth: row.tooth,
            totalBudgetValue: row.total_budget_value,
        }));
    },

    async getPendingCount(clinicId?: string): Promise<number> {
        const resolvedClinicId = clinicId || (await getClinicContext()).clinicId;

        const { data, error } = await supabase.rpc('get_pending_budget_count', {
            p_clinic_id: resolvedClinicId,
        });

        if (error) throw error;
        return data ?? 0;
    },

    async getPendingPatientsCount(clinicId?: string): Promise<number> {
        const resolvedClinicId = clinicId || (await getClinicContext()).clinicId;

        const { data, error } = await supabase.rpc('get_pending_patients_count', {
            p_clinic_id: resolvedClinicId,
        });

        if (error) throw error;
        return data ?? 0;
    },

    async updateToothStatus(budgetId: string, toothIndex: number, newStatus: 'paid' | 'completed'): Promise<void> {
        const budget = await this.getById(budgetId);
        const parsed = JSON.parse(budget.notes || '{}');
        const teeth = parsed.teeth as any[];
        if (!teeth || !teeth[toothIndex]) throw new Error('Tooth not found');

        teeth[toothIndex] = { ...teeth[toothIndex], status: newStatus };

        const newBudgetStatus = calculateBudgetStatus(teeth);
        const updatedNotes = JSON.stringify({ ...parsed, teeth });

        await this.update(budgetId, {
            notes: updatedNotes,
            status: newBudgetStatus,
        });
    },

    async reconcileAllStatuses(): Promise<void> {
        const { clinicId } = await getClinicContext();
        const { data, error } = await supabase
            .from('budgets')
            .select('id, notes, status')
            .eq('clinic_id', clinicId);

        if (error) throw error;
        const budgets = data || [];

        // Group budgets by their calculated status to do batch updates
        const statusGroups: Record<string, string[]> = {};

        for (const budget of budgets) {
            if (!budget.notes) continue;
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                    const calculatedStatus = calculateBudgetStatus(parsed.teeth);
                    if (calculatedStatus !== budget.status) {
                        if (!statusGroups[calculatedStatus]) statusGroups[calculatedStatus] = [];
                        statusGroups[calculatedStatus].push(budget.id);
                    }
                }
            } catch (e) {
                logger.error(`Error parsing budget ${budget.id}`, e);
            }
        }

        // Batch update by status
        await Promise.all(
            Object.entries(statusGroups).map(([status, ids]) =>
                supabase
                    .from('budgets')
                    .update({ status })
                    .in('id', ids)
            )
        );
    }
};
