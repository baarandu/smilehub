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
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTransaction(id: string, updates: Partial<FinancialTransactionInsert>): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .update(updates as any)
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
        const { error } = await supabase
            .from('financial_transactions')
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
    }
};
