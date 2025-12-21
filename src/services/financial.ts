import { supabase } from '@/lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert } from '@/types/database';

export const financialService = {
    async getTransactions(start: Date, end: Date): Promise<any[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*, patients(name)')
            .gte('date', start.toISOString())
            .lte('date', end.toISOString())
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createTransaction(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .insert(transaction as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createExpense(expense: {
        amount: number;
        description: string;
        category: string;
        date: string;
        location?: string | null;
        related_entity_id?: string | null;
    }): Promise<FinancialTransaction> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .insert({
                type: 'expense',
                amount: expense.amount,
                description: expense.description,
                category: expense.category,
                date: expense.date,
                location: expense.location || null,
                related_entity_id: expense.related_entity_id || null,
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTransaction(id: string, updates: Partial<FinancialTransactionInsert>): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async getByRecurrenceId(recurrenceId: string): Promise<FinancialTransaction[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('recurrence_id', recurrenceId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async updateRecurrence(recurrenceId: string, updates: any): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    async deleteTransaction(id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async deleteRecurrence(recurrenceId: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    // Delete income and revert linked budget teeth to pending status
    async deleteIncomeAndRevertBudget(transactionId: string): Promise<void> {
        // 1. Get the transaction to find the linked budget
        const { data: transaction, error: fetchError } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!transaction) throw new Error('Transaction not found');

        const txn = transaction as any;

        // 2. If there's a linked budget (related_entity_id), revert the teeth status
        if (txn.related_entity_id) {
            const budgetId = txn.related_entity_id;

            // Get the budget
            const { data: budget, error: budgetError } = await supabase
                .from('budgets')
                .select('notes, status')
                .eq('id', budgetId)
                .single();

            const budgetData = budget as any;

            if (!budgetError && budgetData && budgetData.notes) {
                try {
                    const parsed = JSON.parse(budgetData.notes);
                    if (parsed.teeth && Array.isArray(parsed.teeth)) {
                        // Find teeth that were marked as paid with this transaction
                        // Revert them to pending
                        let changed = false;
                        parsed.teeth = parsed.teeth.map((tooth: any) => {
                            // If the tooth is paid and matches the transaction amount or description
                            // Or if it has a reference to this transaction
                            if (tooth.status === 'paid' || tooth.status === 'completed') {
                                changed = true;
                                return { ...tooth, status: 'pending' };
                            }
                            return tooth;
                        });

                        if (changed) {
                            // Update budget notes and status
                            const hasPending = parsed.teeth.some((t: any) => t.status === 'pending');
                            const allPaid = parsed.teeth.every((t: any) => t.status === 'paid' || t.status === 'completed');
                            const newStatus = allPaid ? 'completed' : (hasPending ? 'pending' : 'approved');

                            await (supabase
                                .from('budgets') as any)
                                .update({
                                    notes: JSON.stringify(parsed),
                                    status: newStatus
                                })
                                .eq('id', budgetId);
                        }
                    }
                } catch (e) {
                    console.error('Error parsing budget notes:', e);
                }
            }
        }

        // 3. Delete the transaction
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    },

    /**
     * Delete an expense and revert the linked shopping order to pending status if it's a materials expense
     */
    async deleteExpenseAndRevertMaterials(transactionId: string): Promise<void> {
        // 1. Get the expense to find related_entity_id
        const { data: transaction, error: fetchError } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (!transaction) throw new Error('Transaction not found');

        // 2. If it's a materials expense with a linked shopping order, revert it
        if ((transaction as any).category === 'Materiais' && (transaction as any).related_entity_id) {
            const shoppingOrderId = (transaction as any).related_entity_id;

            // Revert shopping order to pending status
            const { error: revertError } = await (supabase
                .from('shopping_orders') as any)
                .update({
                    status: 'pending',
                    completed_at: null
                })
                .eq('id', shoppingOrderId);

            if (revertError) {
                console.error('Error reverting shopping order:', revertError);
                // Don't throw, continue with deletion
            }
        }

        // 3. Delete the expense transaction
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;
    }
};
