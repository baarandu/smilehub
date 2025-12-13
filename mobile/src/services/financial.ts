import { supabase } from '../lib/supabase';
import type { FinancialTransaction, FinancialTransactionInsert } from '../types/database';

export const financialService = {
    async getTransactions(start: Date, end: Date): Promise<FinancialTransaction[]> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .select('*')
            .gte('date', start.toISOString())
            .lte('date', end.toISOString())
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async create(transaction: FinancialTransactionInsert): Promise<FinancialTransaction> {
        const { data, error } = await supabase
            .from('financial_transactions')
            .insert(transaction)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
