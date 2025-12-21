import { supabase } from '../lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert, FinancialTransactionUpdate, FinancialTransactionWithPatient } from '../types/database';

export const financialService = {
    async getTransactions(start: Date, end: Date): Promise<FinancialTransactionWithPatient[]> {
        // Robust way to get YYYY-MM-DD from the local date object passed
        const startDate = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
        const endDate = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');



        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*, patients(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) {
            console.error('[FinancialService] Error fetching:', error);
            throw error;
        }

        return (data || []) as unknown as FinancialTransactionWithPatient[];
    },

    async getByRecurrenceId(recurrenceId: string): Promise<FinancialTransaction[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .eq('recurrence_id', recurrenceId)
            .order('date', { ascending: true }); // Important order

        if (error) throw error;
        return data || [];
    },

    async create(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('[FinancialService] User is null! Authentication missing.');
            throw new Error('Usuário não autenticado');
        }

        // Ensure payload matches the Insert type
        const payload: FinancialTransactionInsert = {
            ...transaction,
            user_id: user.id
        };

        // Casting to any to avoid "Argument of type ... is not assignable to never"
        // This usually happens if table types are not fully inferred by Supabase client
        const { data, error } = await (supabase
            .from('financial_transactions') as any)
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[FinancialService] DB Insert Error:', error);
            throw error;
        }

        return data as FinancialTransaction;
    },

    async update(id: string, updates: FinancialTransactionUpdate): Promise<FinancialTransaction> {
        const { data, error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as FinancialTransaction;
    },

    async updateRecurrence(recurrenceId: string, updates: FinancialTransactionUpdate): Promise<void> {
        const { error } = await (supabase
            .from('financial_transactions') as any)
            .update(updates)
            .eq('recurrence_id', recurrenceId);

        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
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
    }
};
