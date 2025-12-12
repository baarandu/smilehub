import { supabase } from '@/lib/supabase';
import type { Budget, BudgetInsert, BudgetUpdate, BudgetItem, BudgetItemInsert, BudgetWithItems } from '@/types/database';

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
            .insert(budget)
            .select()
            .single();

        if (budgetError) throw budgetError;
        if (!budgetData) throw new Error('Failed to create budget');

        // Create budget items
        if (items.length > 0) {
            const itemsWithBudgetId: BudgetItemInsert[] = items.map(item => ({
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
            .update(budget)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to update budget');
        return data as Budget;
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
};
