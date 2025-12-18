import { supabase } from '../lib/supabase';
import type { Budget, BudgetInsert, BudgetUpdate, BudgetItem, BudgetItemInsert, BudgetWithItems } from '../types/database';
import { calculateBudgetStatus } from '../components/patients/budgetUtils';

export const budgetsService = {
    async getByPatient(patientId: string): Promise<BudgetWithItems[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as unknown as BudgetWithItems[]) || [];
    },

    async create(budget: BudgetInsert, items: Omit<BudgetItemInsert, 'budget_id'>[]): Promise<BudgetWithItems> {
        // Create budget first
        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .insert(budget as any)
            .select()
            .single();

        if (budgetError) throw budgetError;
        if (!budgetData) throw new Error('Failed to create budget');

        // Create budget items
        if (items.length > 0) {
            const itemsWithBudgetId = items.map(item => ({
                ...item,
                budget_id: (budgetData as any).id,
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(itemsWithBudgetId as any);

            if (itemsError) throw itemsError;
        }

        // Return full budget with items
        return this.getById((budgetData as any).id);
    },

    async getById(id: string): Promise<BudgetWithItems> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
        *,
        budget_items (*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Budget not found');
        return data as unknown as BudgetWithItems;
    },

    async update(id: string, budget: BudgetUpdate): Promise<Budget> {
        const { data, error } = await supabase
            .from('budgets')
            // @ts-ignore: Supabase types mismatch workaround
            .update(budget as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to update budget');
        return data as unknown as Budget;
    },

    async delete(id: string): Promise<void> {
        // Delete items first (cascade should handle this, but just in case)
        await supabase
            .from('budget_items')
            .delete()
            .eq('budget_id', id);

        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateStatus(id: string, status: Budget['status']): Promise<Budget> {
        return this.update(id, { status });
    },

    async getAllPending(): Promise<(BudgetWithItems & { patient_name: string })[]> {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                budget_items (*),
                patients (name)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((b: any) => ({
            ...b,
            patient_name: b.patients?.name || 'Paciente'
        })) as (BudgetWithItems & { patient_name: string })[];
    },

    async getPendingCount(): Promise<number> {
        const { count, error } = await supabase
            .from('budgets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) throw error;
        return count || 0;
    },

    async reconcileAllStatuses(): Promise<void> {
        const { data, error } = await supabase
            .from('budgets')
            .select('id, notes, status');

        if (error) throw error;
        const budgets = (data || []) as any[];

        for (const budget of budgets) {
            if (!budget.notes) continue;
            try {
                const parsed = JSON.parse(budget.notes);
                if (parsed.teeth && Array.isArray(parsed.teeth)) {
                    const calculatedStatus = calculateBudgetStatus(parsed.teeth);
                    if (calculatedStatus !== budget.status) {
                        await this.update(budget.id, { status: calculatedStatus });
                    }
                }
            } catch (e) {
                console.error(`Error reconciling budget ${budget.id}`, e);
            }
        }
    }
};
